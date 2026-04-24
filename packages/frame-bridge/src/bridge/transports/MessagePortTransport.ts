import {BridgeMessage, isBridgeMessage, MessagePayload} from "@/bridge/messages";
import {Transport} from "@/bridge/transports/Transport";

export const createMessagePortTransport = <T extends any>(
    channelName: string,
    handshake?: (port: MessagePort) => Promise<boolean>
) : Transport<T> => {
    let port: MessagePort | null = null;
    let isOpen = false;
    let onIncomingMessage: ((data: BridgeMessage<T>) => void) | null = null;

    const handler = (event: MessageEvent) => {
        if (!isBridgeMessage<T>(event.data, channelName)) return;
        onIncomingMessage?.(event.data);
    }

    const openChannel = async (remotePort?: MessagePort | null,) => {
        if (remotePort) {
            port = remotePort;
            port.addEventListener(`message`, handler);
            port.start();
            isOpen = true;
            return true;
        }

        if (!handshake) {
            throw new Error(`MessagePortTransport requires a handshake or remote port to be provided to open the channel`);
        }

        if (port) return true;
        if (typeof (globalThis as any).MessageChannel !== `function`) {
            throw new Error(`MessageChannel is not supported in this browser`);
        }
        const messageChannel = new MessageChannel();
        port = messageChannel.port1;

        const handshakeResult = await handshake(messageChannel.port2);
        if (!handshakeResult) {
            port.close();
            throw new Error(`MessagePort handshake failed`);
        }

        port.addEventListener(`message`, handler);
        port.start();

        isOpen = true;
        return true;
    }

    const closeChannel = () => {
        if (!port) return;
        port.removeEventListener(`message`, handler);
        try { port.close(); } catch {}
        port = null;
        isOpen = false;
    }

    const postMessage = (data: BridgeMessage<MessagePayload<T>>, transfer?: Transferable[]) => {
        if (!port) {
            throw new Error(`MessageChannel is not open`);
        }

        port.postMessage(data, transfer || []);
    }

    const isOpenChannel = () => isOpen;

    const onMessage = (callback: (data: BridgeMessage<MessagePayload<T>>) => void) => {
        onIncomingMessage = callback;
        return () => {
            onIncomingMessage = null;
        }
    }

    return {
        type: `message-channel`,
        open: openChannel,
        close: closeChannel,
        post: postMessage,
        isOpen: isOpenChannel,
        onMessage
    }
}