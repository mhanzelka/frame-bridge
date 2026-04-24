import { useSyncExternalStore } from "react";
import {useBridge} from "@/bridge/hooks/useBridge";

export const useBridgeState = () => {
    const bridge = useBridge();
    return useSyncExternalStore(bridge.state.subscribe, bridge.state.getState, bridge.state.getState)
}