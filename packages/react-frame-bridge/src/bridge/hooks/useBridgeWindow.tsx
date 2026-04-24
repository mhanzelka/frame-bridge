import {openBridgeWindow, OpenBridgeWindowOptions} from "@mhanzelka/frame-bridge/bridge/BridgeUtils";
import {useEffect, useRef} from "react";
import {OnMessageHandler} from "@mhanzelka/frame-bridge/bridge/types";

type UseBridgeWindowProps<T> = {
    onMessage: OnMessageHandler<T>;
}

export const useBridgeWindow = <T extends any = any>({
    onMessage
}: UseBridgeWindowProps<T>) => {

    const onMessageRef = useRef<OnMessageHandler<T>>(null);

    const open = async (props: Omit<OpenBridgeWindowOptions<T>, `onMessage`>) => {
        await openBridgeWindow({
            ...props,
            onMessage: (message, source) => {
                if (onMessageRef.current) {
                    return onMessageRef.current(message, source);
                }
            }
        })
    }

    useEffect(() => {
        onMessageRef.current = onMessage;
        return () => {
            onMessageRef.current = null;
        }
    }, [onMessage]);

    return {open}
}