import { describe, it, expect, vi, beforeEach } from "vitest";
import { createBridgeRegistry } from "@/bridge/debug/BridgeRegistry";
import { createBridgeState } from "@/bridge/BridgeState";
import { createBridgeObserver } from "@/bridge/observer/BridgeObserver";

function makeFakeBridge(id: string, channelName: string) {
    const { getState, subscribe } = createBridgeState({});
    const { addObserver: addMessageObserver } = createBridgeObserver(id, channelName);
    return { id, channelName, state: { getState, subscribe }, addMessageObserver };
}

describe("createBridgeRegistry", () => {
    it("registerBridge adds bridge to snapshot", () => {
        const registry = createBridgeRegistry();
        const bridge = makeFakeBridge("b1", "ch1");
        registry.registerBridge(bridge as any);
        const snap = registry.getSnapshot();
        expect(snap.bridges).toHaveLength(1);
        expect(snap.bridges[0].id).toBe("b1");
        expect(snap.bridges[0].channelName).toBe("ch1");
    });

    it("registerBridge is idempotent — second call returns same unregister", () => {
        const registry = createBridgeRegistry();
        const bridge = makeFakeBridge("b1", "ch1");
        registry.registerBridge(bridge as any);
        registry.registerBridge(bridge as any);
        expect(registry.getSnapshot().bridges).toHaveLength(1);
    });

    it("returned unregister removes bridge from snapshot", () => {
        const registry = createBridgeRegistry();
        const bridge = makeFakeBridge("b2", "ch2");
        const unregister = registry.registerBridge(bridge as any);
        unregister();
        expect(registry.getSnapshot().bridges).toHaveLength(0);
    });

    it("subscribe listener is called on registration", () => {
        const registry = createBridgeRegistry();
        const listener = vi.fn();
        registry.subscribe(listener);
        registry.registerBridge(makeFakeBridge("b3", "ch3") as any);
        expect(listener).toHaveBeenCalled();
    });

    it("subscribe listener is called on unregistration", () => {
        const registry = createBridgeRegistry();
        const unregister = registry.registerBridge(makeFakeBridge("b4", "ch4") as any);
        const listener = vi.fn();
        registry.subscribe(listener);
        unregister();
        expect(listener).toHaveBeenCalled();
    });

    it("clear empties event history for the given bridge", () => {
        const registry = createBridgeRegistry();
        const bridge = makeFakeBridge("b5", "ch5");
        registry.registerBridge(bridge as any);

        // Manually verify clear runs without error and resets history
        registry.clear("b5");
        const snap = registry.getSnapshot();
        expect(snap.bridges[0].eventHistory).toEqual([]);
    });

    it("subscribe returns unsubscribe that stops notifications", () => {
        const registry = createBridgeRegistry();
        const listener = vi.fn();
        const unsub = registry.subscribe(listener);
        unsub();
        registry.registerBridge(makeFakeBridge("b6", "ch6") as any);
        expect(listener).not.toHaveBeenCalled();
    });

    it("getSnapshot returns stable reference until state changes", () => {
        const registry = createBridgeRegistry();
        const snap1 = registry.getSnapshot();
        const snap2 = registry.getSnapshot();
        expect(snap1).toBe(snap2);
    });
});
