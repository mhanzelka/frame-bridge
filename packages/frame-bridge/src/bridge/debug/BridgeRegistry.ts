import {Bridge} from "@/bridge/types";
import {createRingBuffer} from "@/Buffers";
import {BridgeDebugApi, BridgeRegistryData, BridgeRegistryEntry, BridgeRegistrySnapshot} from "@/bridge/debug/types";
import {BridgeObserverEvent} from "@/bridge/observer/types";

export const createBridgeRegistry = (messageHistoryCap: number = 1000) => {
    const map = new Map<string, BridgeRegistryEntry>();
    const listeners = new Set<() => void>;

    let cachedSnapshot: BridgeRegistryData = { bridges: [] };

    const recomputeSnapshot = () => {
        cachedSnapshot = {
            bridges: Array.from(map.values()).map(({ api, eventHistory }) => ({
                id: api.id,
                channelName: api.channelName,
                state: api.state.getState(),
                eventHistory,
            } as BridgeRegistrySnapshot)),
        };
    };

    const emit = () => {
        recomputeSnapshot();
        listeners.forEach(l => l())
    }

    const unregisterBridge = (bridgeId: string) => {
        const entry = map.get(bridgeId);
        if (!entry) return;
        entry.offState();
        entry.offObserver();
        map.delete(bridgeId);
        emit();
    }

    const registerBridge = (bridge: Bridge) => {
        return register({
            id: bridge.id,
            channelName: bridge.channelName,
            addMessageObserver: bridge.addMessageObserver,
            state: bridge.state
        });
    }

    const register = (api: BridgeDebugApi) => {
        if (map.has(api.id)) return () => unregisterBridge(api.id);


        const rb = createRingBuffer<BridgeObserverEvent>(messageHistoryCap);
        const offState = api.state.subscribe(() => {
            emit();
        });

        const offObserver = api.addMessageObserver((data) => {
            rb.push(data);
            if (map.has(api.id))
                map.get(api.id)!.eventHistory = rb.snapshot();
            emit();
        });

        map.set(api.id, {
            api,
            offState,
            offObserver,
            eventHistory: rb.snapshot(),
        });
        emit();

        return () => unregisterBridge(api.id);
    }

    const getSnapshot = () : BridgeRegistryData => {
        return cachedSnapshot
    }

    const subscribe = (listener: () => void) => {
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
        }
    }

    const clear = (bridgeId: string) => {
        const entry = map.get(bridgeId);
        if (!entry) return;
        entry.eventHistory = [];
        emit();
    }

    return {
        registerBridge,
        unregisterBridge,
        getSnapshot,
        subscribe,
        clear
    }
}

export const bridgeRegistry = createBridgeRegistry();