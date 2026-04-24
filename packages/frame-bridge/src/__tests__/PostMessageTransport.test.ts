import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createPostMessageTransport } from "@/bridge/transports/PostMessageTransport";
import { makeRequestMessage } from "@/bridge/messages";

const CHANNEL = "pm-test";
const ORIGIN = "http://localhost";

function makeTransport(originFn = () => ORIGIN, windowFn = () => window as Window | null) {
    return createPostMessageTransport(CHANNEL, originFn, windowFn);
}

describe("PostMessageTransport", () => {
    it("opens and becomes open", async () => {
        const t = makeTransport();
        await t.open();
        expect(t.isOpen()).toBe(true);
        t.close();
    });

    it("closes cleanly", async () => {
        const t = makeTransport();
        await t.open();
        t.close();
        expect(t.isOpen()).toBe(false);
    });

    it("receives own postMessage (same origin)", async () => {
        const t = makeTransport(() => window.location.origin);
        await t.open();

        const received: any[] = [];
        t.onMessage(msg => received.push(msg));

        const msg = makeRequestMessage("src", "app", CHANNEL, { x: 1 });
        window.postMessage(msg, window.location.origin);

        await new Promise(r => setTimeout(r, 0));

        expect(received).toHaveLength(1);
        t.close();
    });

    it("drops messages from wrong origin", async () => {
        const t = makeTransport(() => "http://trusted.example.com");
        await t.open();

        const received: any[] = [];
        t.onMessage(msg => received.push(msg));

        const msg = makeRequestMessage("src", "app", CHANNEL, {});
        // postMessage to self — origin will be localhost, not trusted.example.com
        window.postMessage(msg, window.location.origin);

        await new Promise(r => setTimeout(r, 0));

        expect(received).toHaveLength(0);
        t.close();
    });

    it("does not open twice", async () => {
        const t = makeTransport();
        await t.open();
        await t.open();
        expect(t.isOpen()).toBe(true);
        t.close();
    });

    it("throws when posting without target window", () => {
        const t = createPostMessageTransport(CHANNEL, () => ORIGIN, () => null);
        expect(() => t.post(makeRequestMessage("src", "app", CHANNEL, {}))).toThrow();
    });
});
