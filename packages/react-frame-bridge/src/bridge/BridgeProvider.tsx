"use client"

import {createContext, ReactNode, useEffect, useMemo} from "react";
import {
    Bridge,
    BridgeRole,
    TransportType,
    CreateBridgeOptions
} from "@mhanzelka/frame-bridge/bridge/types";
import {createBridge} from "@mhanzelka/frame-bridge/bridge/Bridge";
import {BridgeObserverEvent} from "@mhanzelka/frame-bridge/bridge/observer/types";
import {bridgeRegistry} from "@mhanzelka/frame-bridge/bridge/debug/BridgeRegistry";

type BridgeContextProps = {
    bridge: Bridge | null;
}

export type BridgeProviderOptions<T extends any> = {
    observer?: (data: BridgeObserverEvent<T>) => void;
}

type BridgeProviderProps<T extends any> = {
    open: boolean;
    prefix?: string;
    channelName: string;
    role: BridgeRole,
    targetOrigin?: string | `same-origin`;
    enabledTransports?: TransportType[];
    options?: BridgeProviderOptions<T>;
    bridgeOptions?: CreateBridgeOptions<T>,
    children: ReactNode;
}

export const BridgeContext
    = createContext<BridgeContextProps>({bridge: null});

export const BridgeProvider = <T extends any>({open, prefix, channelName, role, targetOrigin, enabledTransports, options, bridgeOptions, children}: BridgeProviderProps<T>) => {

    const bridge = useMemo(() => createBridge<T>({
        prefix,
        channelName,
        role,
        targetOrigin,
        enabled: enabledTransports ?? [`post-message-channel`],
        options: bridgeOptions
    }), []);

    useEffect(() => {
        if (!open) return;
        bridge.open().catch(err => console.error("[BridgeProvider] Failed to open:", err));
        return () => { bridge.close(); };
    }, [open]);

    useEffect(() => {
        return bridgeRegistry.registerBridge(bridge);
    }, []);

    useEffect(() => {
        if (!options?.observer) return;
        return bridge.addMessageObserver(options.observer);
    }, [options?.observer]);

    return (
        <BridgeContext value={{bridge}}>
            {children}
        </BridgeContext>
    )
}
