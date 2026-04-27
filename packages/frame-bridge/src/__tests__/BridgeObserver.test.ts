import { describe, it, expect, vi } from "vitest";
import { createBridgeObserver } from "@/bridge/observer/BridgeObserver";
import { makeRequestMessage } from "@/bridge/messages";

const CHANNEL = "obs-test";
const BRIDGE_ID = "bridge-1";

describe("createBridgeObserver", () => {
    it("notifies added observer with correct event shape", () => {
        const { addObserver, notifyObservers } = createBridgeObserver(BRIDGE_ID, CHANNEL);
        const observer = vi.fn();
        addObserver(observer);

        const msg = makeRequestMessage("src", "app", CHANNEL, { x: 1 });
        notifyObservers("broadcast-channel", { type: "message", direction: "in", message: msg });

        expect(observer).toHaveBeenCalledOnce();
        const event = observer.mock.calls[0][0];
        expect(event.channelName).toBe(CHANNEL);
        expect(event.transportType).toBe("broadcast-channel");
        expect(event.type).toBe("message");
        expect(event.direction).toBe("in");
        expect(event.message).toBe(msg);
    });

    it("does not add the same observer twice", () => {
        const { addObserver, notifyObservers } = createBridgeObserver(BRIDGE_ID, CHANNEL);
        const observer = vi.fn();
        addObserver(observer);
        addObserver(observer);

        notifyObservers("broadcast-channel", { type: "message", direction: "in", message: makeRequestMessage("s", "app", CHANNEL, {}) });
        expect(observer).toHaveBeenCalledOnce();
    });

    it("removes observer via returned unsubscribe", () => {
        const { addObserver, notifyObservers } = createBridgeObserver(BRIDGE_ID, CHANNEL);
        const observer = vi.fn();
        const remove = addObserver(observer);
        remove();

        notifyObservers("broadcast-channel", { type: "message", direction: "in", message: makeRequestMessage("s", "app", CHANNEL, {}) });
        expect(observer).not.toHaveBeenCalled();
    });

    it("observer error does not crash other observers", () => {
        const { addObserver, notifyObservers } = createBridgeObserver(BRIDGE_ID, CHANNEL);
        const bad = vi.fn().mockImplementation(() => { throw new Error("boom"); });
        const good = vi.fn();
        addObserver(bad);
        addObserver(good);

        notifyObservers("broadcast-channel", { type: "message", direction: "in", message: makeRequestMessage("s", "app", CHANNEL, {}) });
        expect(good).toHaveBeenCalledOnce();
    });

    it("notifies timeout events correctly", () => {
        const { addObserver, notifyObservers } = createBridgeObserver(BRIDGE_ID, CHANNEL);
        const observer = vi.fn();
        addObserver(observer);

        notifyObservers("post-message-channel", { type: "message-timeout", msgId: "req:abc:123" });

        const event = observer.mock.calls[0][0];
        expect(event.type).toBe("message-timeout");
        expect(event.msgId).toBe("req:abc:123");
    });

    it("multiple independent observers all receive events", () => {
        const { addObserver, notifyObservers } = createBridgeObserver(BRIDGE_ID, CHANNEL);
        const a = vi.fn();
        const b = vi.fn();
        addObserver(a);
        addObserver(b);

        notifyObservers("broadcast-channel", { type: "message", direction: "in", message: makeRequestMessage("s", "app", CHANNEL, {}) });
        expect(a).toHaveBeenCalledOnce();
        expect(b).toHaveBeenCalledOnce();
    });
});
