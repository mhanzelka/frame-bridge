import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createBroadcastTransport } from "@/bridge/transports/BroadcastChannelTransport";
import { makeRequestMessage } from "@/bridge/messages";

const CHANNEL = "bc-test";

describe("BroadcastChannelTransport", () => {
    it("opens and is open", async () => {
        const t = createBroadcastTransport(CHANNEL);
        expect(t.isOpen()).toBe(false);
        await t.open();
        expect(t.isOpen()).toBe(true);
        t.close();
    });

    it("closes cleanly", async () => {
        const t = createBroadcastTransport(CHANNEL);
        await t.open();
        t.close();
        expect(t.isOpen()).toBe(false);
    });

    it("receives messages via BroadcastChannel", async () => {
        const t = createBroadcastTransport(CHANNEL);
        await t.open();

        const received: any[] = [];
        t.onMessage((msg) => received.push(msg));

        const sender = new BroadcastChannel(CHANNEL);
        const msg = makeRequestMessage("src", "app", CHANNEL, { hello: "world" });
        sender.postMessage(msg);
        sender.close();

        // BroadcastChannel is async — wait one tick
        await new Promise(r => setTimeout(r, 0));

        expect(received).toHaveLength(1);
        expect(received[0].data).toEqual({ hello: "world" });
        t.close();
    });

    it("ignores messages for a different channel", async () => {
        const t = createBroadcastTransport(CHANNEL);
        await t.open();

        const received: any[] = [];
        t.onMessage((msg) => received.push(msg));

        const sender = new BroadcastChannel(CHANNEL);
        sender.postMessage({ channelName: "other-channel", msgId: "req:x:1" });
        sender.close();

        await new Promise(r => setTimeout(r, 0));

        expect(received).toHaveLength(0);
        t.close();
    });

    it("does not open twice", async () => {
        const t = createBroadcastTransport(CHANNEL);
        await t.open();
        await t.open(); // second call should be a no-op
        expect(t.isOpen()).toBe(true);
        t.close();
    });

    it("throws when posting without opening", () => {
        const t = createBroadcastTransport(CHANNEL);
        const msg = makeRequestMessage("src", "app", CHANNEL, {});
        expect(() => t.post(msg)).toThrow();
    });
});
