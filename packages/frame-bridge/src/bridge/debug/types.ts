import {Bridge, BridgeStatus} from "@/bridge";
import {BridgeObserverEvent} from "@/bridge/observer/types";

export type BridgeDebugApi = {
    id: string,
    channelName: string,
    state: Bridge[`state`],
    addMessageObserver: Bridge[`addMessageObserver`]
}

export type BridgeRegistryEntry = {
    api: BridgeDebugApi,
    offState: () => void,
    offObserver: () => void,
    eventHistory: BridgeObserverEvent[],
}

export type BridgeRegistrySnapshot = {
    id: string,
    channelName: string,
    state: BridgeStatus,
    eventHistory: BridgeObserverEvent[],
}

export type BridgeRegistryData = {
    bridges: BridgeRegistrySnapshot[]
}