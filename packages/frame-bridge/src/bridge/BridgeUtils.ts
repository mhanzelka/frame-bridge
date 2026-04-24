import {Bridge, CreateBridgeParams, OnMessageHandler} from "@/bridge/types";
import {createBridge} from "@/bridge/Bridge";
import {bridgeRegistry} from "@/bridge/debug/BridgeRegistry";

export type OpenBridgeWindowOptions<T extends any> = {
    url: string;
    name: string;

    /** Optional AbortController to cancel the operation. */
    abortController?: AbortController;

    /** Polling interval (ms) to detect popup close. */
    pollIntervalMs?: number;

    /** Features string for window.open. */
    features?: string;

    bridge?: Partial<CreateBridgeParams<T>>,

    onMessage?: OnMessageHandler<T>;
    onBridgeReady?: (bridge: Bridge<T>) => Promise<void>;
};

export const openBridgeWindow
    = async <T extends any>({
        url,
        name,
        abortController,
        pollIntervalMs = 500,
        features = "popup,width=480,height=720",
        bridge: bridgeProps,
        onMessage,
        onBridgeReady,
    }: OpenBridgeWindowOptions<T>) => {

    const popup = window.open("about:blank", name, features);
    if (!popup) {
        throw new Error("Failed to open window (blocked by browser?)");
    }

    const bridge = createBridge<T>({
        prefix: name,
        channelName: name,
        enabled: [`post-message-channel`],
        role: `parent`,
        targetOrigin: `*`,
        target: popup,
    })

    await bridge.open();
    onBridgeReady?.(bridge);

    popup.location.href = url;

    const unregister = bridgeRegistry.registerBridge(bridge);
    const offMessage = onMessage ? bridge.onMessage(onMessage) : undefined;

    return new Promise<boolean>((resolve, reject) => {
        let cleaned = false;
        let intervalId: number | undefined;

        const clean = () => {
            if (cleaned) return;
            cleaned = true;

            try { if (intervalId) clearInterval(intervalId); } catch {}

            bridge.setTarget(null, ``);
            bridge.close();
            unregister();
            offMessage?.();
            try { popup.close(); } catch {}
        };

        const resolveSuccess = () => { clean(); resolve(true); };
        const resolveFail = () => { clean(); resolve(false); };

        intervalId = window.setInterval(() => {
            if (popup.closed) resolveSuccess();
        }, pollIntervalMs);

        abortController?.signal.addEventListener("abort", resolveFail);
    });
}