import {IframeHTMLAttributes, ReactEventHandler, useRef} from "react";
import {useBridge} from "@/bridge/hooks/useBridge";
import {Bridge} from "@mhanzelka/frame-bridge/bridge/types";

export interface IframeBridgeHostProps extends IframeHTMLAttributes<HTMLIFrameElement> {
    targetOrigin: string;
    handleIframe?: (iframe: HTMLIFrameElement | null) => void;
    /** Fires after iframe load AND child bridge answers a sys ping. Use to send init payloads. */
    onChildReady?: (bridge: Bridge) => void;
    /** Fires when waitForReady rejects (timeout, transport error). */
    onChildReadyError?: (error: Error) => void;
    /** Override Bridge.waitForReady() default timeout. */
    readyTimeoutMs?: number;
}

export const IframeBridgeHost = ({
    targetOrigin,
    handleIframe,
    onChildReady,
    onChildReadyError,
    readyTimeoutMs,
    onLoad,
    ...props
}: IframeBridgeHostProps) => {
    const bridge = useBridge();
    // Generation counter — bumped on every iframe load so a prior in-flight
    // waitForReady is recognized as stale and its callbacks are suppressed.
    const loadGen = useRef(0);

    const handleRef = (iframe: HTMLIFrameElement | null) => {
        bridge.setTarget(iframe?.contentWindow ?? null, targetOrigin);
        handleIframe?.(iframe);
    }

    const handleLoad: ReactEventHandler<HTMLIFrameElement> = (event) => {
        onLoad?.(event);

        if (!onChildReady && !onChildReadyError) return;

        const gen = ++loadGen.current;
        bridge.waitForReady({timeoutMs: readyTimeoutMs}).then(
            () => {
                if (gen !== loadGen.current) return;
                onChildReady?.(bridge);
            },
            (error: Error) => {
                if (gen !== loadGen.current) return;
                onChildReadyError?.(error);
            }
        );
    }

    return (
        <iframe ref={handleRef} onLoad={handleLoad} {...props} />
    )
}
