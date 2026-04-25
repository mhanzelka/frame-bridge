import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createBridge } from "@/bridge/Bridge";

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
});
