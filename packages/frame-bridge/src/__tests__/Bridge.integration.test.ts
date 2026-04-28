import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createBridge } from "@/bridge/Bridge";
import { Bridge } from "@/bridge/types";

// Integration tests use BroadcastChannel — available in happy-dom.
// Two bridge instances on the same channel simulate parent ↔ child communication.

const CHANNEL = "integration-test-channel";

function makeParent() {
    return createBridge<{ type: string; value?: number }>({
        channelName: CHANNEL,
        enabled: ["broadcast-channel"],
        role: "parent",
    });
}

function makeChild() {
    return createBridge<{ type: string; value?: number }>({
        channelName: CHANNEL,
        enabled: ["broadcast-channel"],
        role: "child",
    });
}

describe("Bridge integration (BroadcastChannel)", () => {
    let parent: ReturnType<typeof makeParent>;
    let child: ReturnType<typeof makeChild>;

    beforeEach(async () => {
        parent = makeParent();
        child = makeChild();
        await Promise.all([parent.open(), child.open()]);
    });

    afterEach(() => {
        parent.close();
        child.close();
    });

    it("isOpen() is false before open and true after", async () => {
        const b = makeParent();
        expect(b.isOpen()).toBe(false);
        await b.open();
        expect(b.isOpen()).toBe(true);
        b.close();
        expect(b.isOpen()).toBe(false);
    });

    it("active() reflects enabled and opened transports", async () => {
        const { enabled, opened } = parent.active();
        expect(enabled).toContain("broadcast-channel");
        expect(opened).toContain("broadcast-channel");
    });

    it("parent sends request, child responds", async () => {
        child.onMessage(async (msg) => {
            return { type: "pong", value: (msg.value ?? 0) + 1 };
        });

        const response = await parent.send({ type: "ping", value: 41 });
        expect(response).toEqual({ type: "pong", value: 42 });
    });

    it("child sends request, parent responds", async () => {
        parent.onMessage(async (msg) => {
            return { type: "ack", value: msg.value };
        });

        const response = await child.send({ type: "req", value: 7 });
        expect(response).toEqual({ type: "ack", value: 7 });
    });

    it("parent sends event, child receives it (fire-and-forget)", async () => {
        const received = vi.fn();
        child.onMessage(async (msg) => {
            received(msg);
        });

        parent.sendEvent({ type: "notify", value: 99 });

        await new Promise(r => setTimeout(r, 20));
        expect(received).toHaveBeenCalledOnce();
        expect(received.mock.calls[0][0]).toEqual({ type: "notify", value: 99 });
    });

    it("send times out when no handler is registered", async () => {
        await expect(
            parent.send({ type: "ping" }, { timeout: 100 })
        ).rejects.toThrow(/timeout/i);
    });

    it("send throws when bridge is not open", async () => {
        const b = makeParent();
        await expect(b.send({ type: "ping" })).rejects.toThrow(/not open/i);
    });

    it("onMessage unsubscribe stops receiving messages", async () => {
        const handler = vi.fn().mockResolvedValue({ type: "ok" });
        const off = child.onMessage(handler);
        off();

        // Parent send will timeout since child has no handler
        await expect(
            parent.send({ type: "ping" }, { timeout: 80 })
        ).rejects.toThrow(/timeout/i);

        expect(handler).not.toHaveBeenCalled();
    });

    it("multiple sequential requests are handled independently", async () => {
        child.onMessage(async (msg) => ({ type: "res", value: (msg.value ?? 0) * 2 }));

        const [r1, r2, r3] = await Promise.all([
            parent.send({ type: "x", value: 1 }),
            parent.send({ type: "x", value: 2 }),
            parent.send({ type: "x", value: 3 }),
        ]);

        expect(r1.value).toBe(2);
        expect(r2.value).toBe(4);
        expect(r3.value).toBe(6);
    });

    it("AbortSignal aborts pending send", async () => {
        const ac = new AbortController();
        const p = parent.send({ type: "ping" }, { signal: ac.signal, timeout: 5000 });
        ac.abort();
        await expect(p).rejects.toThrow(/abort/i);
    });

    it("waitForReady resolves once both sides answer sys ping", async () => {
        await expect(parent.waitForReady({ timeoutMs: 1000, intervalMs: 50 })).resolves.toBeUndefined();
    });

    it("waitForReady rejects when the other side is missing", async () => {
        const lonely = createBridge({
            channelName: "waitForReady-lonely-channel",
            enabled: ["broadcast-channel"],
            role: "parent",
        });
        await lonely.open();
        try {
            await expect(
                lonely.waitForReady({ timeoutMs: 250, intervalMs: 50 })
            ).rejects.toThrow(/timed out/i);
        } finally {
            lonely.close();
        }
    });

    it("waitForReady throws synchronously when bridge is closed", async () => {
        const closed = makeParent();
        await expect(closed.waitForReady({ timeoutMs: 100 })).rejects.toThrow(/closed bridge/i);
    });
});

describe("Bridge transport toggling on a live connection", () => {
    // Helper: collects the transport that carries each outbound APP message.
    // Observer fires AFTER transport.post() succeeds, so its presence proves the
    // packet actually went out — not just that the send loop picked the type.
    const captureOutboundTransports = <T>(b: Bridge<T>) => {
        const log: string[] = [];
        b.addMessageObserver((ev) => {
            if (ev.type === "message" && ev.direction === "out" && ev.message.domain === "app") {
                log.push(ev.transportType);
            }
        });
        return log;
    };

    it("enable() adds a transport at runtime that actually carries sends, and disable + re-enable swap it back into rotation", async () => {
        const b = createBridge<{ type: string }>({
            channelName: "toggle-add-and-rotate",
            enabled: ["broadcast-channel", "post-message-channel"],
            role: "parent",
            targetOrigin: "same-origin",
            // post-message transport needs a target window — point at self for an in-process test
            target: window,
        });
        // Start with only broadcast open; post-message will be enabled later
        await b.enable("broadcast-channel");
        expect(b.active().opened).toEqual(["broadcast-channel"]);

        const out = captureOutboundTransports(b);

        b.sendEvent({ type: "evt-1" });
        expect(out.at(-1)).toBe("broadcast-channel");

        // Add post-message at runtime; it must become usable immediately when broadcast steps aside
        await b.enable("post-message-channel");
        expect(b.active().opened).toContain("post-message-channel");

        b.disable("broadcast-channel");
        b.sendEvent({ type: "evt-2" });
        expect(out.at(-1)).toBe("post-message-channel");

        // Re-enable broadcast → priority restored (it's earlier in `enabled`)
        await b.enable("broadcast-channel");
        b.sendEvent({ type: "evt-3" });
        expect(out.at(-1)).toBe("broadcast-channel");

        b.close();
    });

    it("disabling the only open transport flips isOpen() to false and makes send throw", async () => {
        const b = createBridge<{ type: string }>({
            channelName: "toggle-disable-last",
            enabled: ["broadcast-channel"],
            role: "parent",
        });
        await b.open();
        expect(b.isOpen()).toBe(true);

        b.disable("broadcast-channel");

        expect(b.isOpen()).toBe(false);
        await expect(b.send({ type: "ping" })).rejects.toThrow(/not open/i);

        b.close();
    });

    it("re-enabling a transport restores end-to-end request/response across two bridges", async () => {
        const channelName = "toggle-reenable-end-to-end";
        const parent = createBridge<{ type: string; value?: number }>({
            channelName,
            enabled: ["broadcast-channel"],
            role: "parent",
        });
        const child = createBridge<{ type: string; value?: number }>({
            channelName,
            enabled: ["broadcast-channel"],
            role: "child",
        });
        await Promise.all([parent.open(), child.open()]);

        const parentOut = captureOutboundTransports(parent);
        child.onMessage(async (msg) => ({ type: "pong", value: (msg.value ?? 0) + 1 }));

        // Sanity round-trip
        await expect(parent.send({ type: "ping", value: 1 })).resolves.toEqual({ type: "pong", value: 2 });
        expect(parentOut.at(-1)).toBe("broadcast-channel");

        parent.disable("broadcast-channel");
        expect(parent.isOpen()).toBe(false);
        await expect(parent.send({ type: "ping" })).rejects.toThrow(/not open/i);

        await parent.enable("broadcast-channel");
        await expect(parent.send({ type: "ping", value: 10 })).resolves.toEqual({ type: "pong", value: 11 });
        // Confirm the recovered round-trip used the freshly re-enabled transport
        expect(parentOut.at(-1)).toBe("broadcast-channel");

        parent.close();
        child.close();
    });
});
