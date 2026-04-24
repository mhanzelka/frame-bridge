import {useContext} from "react";
import {BridgeContext} from "@/bridge/BridgeProvider";

export const useBridge = () => {
    const context = useContext(BridgeContext);
    if (!context) {
        throw new Error("useBridgeContext must be used within a BridgeContextProvider");
    }
    if (!context.bridge) {
        throw new Error("Bridge is not initialized");
    }

    return context.bridge;
}