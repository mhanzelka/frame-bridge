import {BridgeMessage, isBridgeMessage, MessagePayload, SystemMessagePayload} from "@/bridge/messages";
import {Transport} from "@/bridge/transports/Transport";
import * as logger from "@/logger";

export const createPostMessageTransport = <T extends any>(
    channelName: string,
    targetOrigin: () => string,
    targetWindow: () => Window | null,
    onHandshakePort?: (port: MessagePort) => Promise<void>,
): Transport<T> => {
    let isOpen = false;
    let onIncomingMessage: ((data: BridgeMessage<T>) => void) | null = null;

    const handler = async (event: MessageEvent) => {
        // Validate origin before processing — prevents cross-origin injection
        const expected = targetOrigin();
        if (expected && expected !== `*` && event.origin !== expected) return;

        if (!isBridgeMessage<T>(event.data, channelName)) return;
        const msg = event.data;

        if (msg.domain === `sys`) {
            const payload = msg.data as SystemMessagePayload;
            if (payload.command === `handshake`) {
                if (event.ports.length > 0 && onHandshakePort) {
                    const port = event.ports[0];
                    await onHandshakePort(port);
                } else {
                    logger.warn(`[PostMessageTransport:${channelName}] Handshake without port or handler`);
                }
            }
        }

        onIncomingMessage?.(msg);
    }

    const openChannel = async () => {
        if (isOpen) return true;
        window.addEventListener(`message`, handler);
        logger.log(`[PostMessageTransport:${channelName}] Opened`);
        isOpen = true;
        return true;
    }

    const closeChannel = () => {
        if (!isOpen) return;
        window.removeEventListener(`message`, handler);
        logger.log(`[PostMessageTransport:${channelName}] Closed`);
        isOpen = false;
    }

    const postMessage = (
        data: BridgeMessage<MessagePayload<T>>,
        transfer?: Transferable[]
    ) => {
        const win = targetWindow();
        if (!win) throw new Error(
            `[PostMessageTransport:${channelName}] No target window. ` +
            `For iframe children pass createBridge({ target: window.parent, targetOrigin: '*' }). ` +
            `For popup children pass createBridge({ target: window.opener, targetOrigin: '*' }).`
        );

        const origin = targetOrigin();
        if (!origin) throw new Error(`[PostMessageTransport:${channelName}] No target origin`);

        win.postMessage(data, origin, transfer);
    }

    const onMessage = (
        callback: (data: BridgeMessage<MessagePayload<T>>) => void
    ) => {
        onIncomingMessage = callback;
        return () => { onIncomingMessage = null; };
    }

    return {
        type: `post-message-channel`,
        open: openChannel,
        close: closeChannel,
        post: postMessage,
        isOpen: () => isOpen,
        onMessage
    }
}
