import {bridgeRegistry} from "@mhanzelka/frame-bridge/bridge/debug/BridgeRegistry";
import {useMemo, useSyncExternalStore} from "react";

export const useBridgeRegistry = () => {
    return {
        registerBridge: bridgeRegistry.registerBridge
    }
}

export const useBridgeRegistryState = () => {
    const bs = useSyncExternalStore(bridgeRegistry.subscribe, bridgeRegistry.getSnapshot, bridgeRegistry.getSnapshot);
    return useMemo(() => ({
        ...bs,
        clear: bridgeRegistry.clear,
    }), [bs]);
}