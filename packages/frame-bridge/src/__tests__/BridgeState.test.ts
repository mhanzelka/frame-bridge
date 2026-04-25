import { describe, it, expect, vi } from "vitest";
import { createBridgeState } from "@/bridge/BridgeState";

describe("createBridgeState", () => {
    it("initial state is closed", () => {
        const { getState } = createBridgeState({});
        expect(getState().state).toBe("closed");
    });

    it("applies initial state overrides", () => {
        const { getState } = createBridgeState({ origin: "http://example.com" });
        expect(getState().origin).toBe("http://example.com");
    });

    it("patchState merges partial state", () => {
        const { getState, patchState } = createBridgeState({});
        patchState({ state: "open", pendingCount: 3 });
        const s = getState();
        expect(s.state).toBe("open");
        expect(s.pendingCount).toBe(3);
    });

    it("patchState notifies subscribers", () => {
        const { patchState, subscribe } = createBridgeState({});
        const listener = vi.fn();
        subscribe(listener);
        patchState({ state: "open" });
        expect(listener).toHaveBeenCalledTimes(1);
    });

    it("patchChannelState updates a specific transport", () => {
        const { getState, patchChannelState } = createBridgeState({});
        patchChannelState("broadcast-channel", { state: "open", messageCount: 0 });
        expect(getState().transports["broadcast-channel"]?.state).toBe("open");
    });

    it("patchChannelState does not affect other transports", () => {
        const { getState, patchChannelState } = createBridgeState({});
        patchChannelState("broadcast-channel", { state: "open" });
        expect(getState().transports["post-message-channel"]?.state).toBe("disabled");
    });

    it("incMessageCount increments the correct transport", () => {
        const { getState, incMessageCount } = createBridgeState({});
        incMessageCount("broadcast-channel");
        incMessageCount("broadcast-channel");
        expect(getState().transports["broadcast-channel"]?.messageCount).toBe(2);
    });

    it("subscribe returns an unsubscribe function", () => {
        const { patchState, subscribe } = createBridgeState({});
        const listener = vi.fn();
        const unsub = subscribe(listener);
        unsub();
        patchState({ state: "open" });
        expect(listener).not.toHaveBeenCalled();
    });

    it("multiple subscribers all receive notifications", () => {
        const { patchState, subscribe } = createBridgeState({});
        const a = vi.fn();
        const b = vi.fn();
        subscribe(a);
        subscribe(b);
        patchState({ pendingCount: 1 });
        expect(a).toHaveBeenCalledOnce();
        expect(b).toHaveBeenCalledOnce();
    });
});
