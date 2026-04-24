import {BridgeMessage, isBridgeMessage, MessagePayload} from "@/bridge/messages";
import {Transport} from "@/bridge/transports/Transport";

export const createBroadcastTransport = <T extends any>(
    channelName: string,
) : Transport<T> => {
    let channel: BroadcastChannel | null = null;
    let isOpen = false;
    let onIncomingMessage: ((data: BridgeMessage<T>) => void) | null = null;

    const handler = (event: MessageEvent) => {
        if (!isBridgeMessage<T>(event.data, channelName)) return;
        onIncomingMessage?.(event.data);
    }

    const openChannel = async () => {
        if (channel) return true;
        if (typeof (globalThis as any).BroadcastChannel !== `function`) {
            throw new Error(`BroadcastChannel is not supported in this environment`);
        }
        channel = new BroadcastChannel(channelName);
        channel.addEventListener(`message`, handler);
        isOpen = true;
        return true;
    }

    const closeChannel = () => {
        if (!channel) return;
        channel.removeEventListener(`message`, handler);
        try { channel.close(); } catch {}
        channel = null;
        isOpen = false;
    }

    const postMessage = (data: BridgeMessage<MessagePayload<T>>) => {
        if (!channel) throw new Error(`BroadcastChannel not open for: ${channelName}`);
        channel.postMessage(data);
    }

    const onMessage = (callback: (data: BridgeMessage<T>) => void) => {
        onIncomingMessage = callback;
        return () => { onIncomingMessage = null; };
    }

    return {
        type: `broadcast-channel`,
        open: openChannel,
        close: closeChannel,
        post: postMessage,
        isOpen: () => isOpen,
        onMessage
    }
}
