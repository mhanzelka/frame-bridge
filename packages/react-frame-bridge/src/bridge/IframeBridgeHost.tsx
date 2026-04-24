import {IframeHTMLAttributes} from "react";
import {useBridge} from "@/bridge/hooks/useBridge";

export interface IframeBridgeHostProps extends IframeHTMLAttributes<HTMLIFrameElement> {
    targetOrigin: string;
    handleIframe?: (iframe: HTMLIFrameElement | null) => void;
}

export const IframeBridgeHost = ({targetOrigin, handleIframe, ...props}: IframeBridgeHostProps) => {
    const bridge = useBridge();

    const handleRef = (iframe: HTMLIFrameElement | null) => {
        bridge.setTarget(iframe?.contentWindow ?? null, targetOrigin);
        handleIframe?.(iframe);
    }

    return (
        <iframe ref={handleRef} {...props} />
    )
}