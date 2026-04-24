import {TransportType} from "@/bridge/types";
import {BridgeMessage, MessagePayload} from "@/bridge/messages";

export type UnregisterFunction = () => void;

export type Transport<T extends any> = {
    type: TransportType,
    isOpen: () => boolean,
    open: (port?: MessagePort) => Promise<boolean>
    post: (data: BridgeMessage<MessagePayload<T>>, transfer?: Transferable[]) => void,
    close: () => void,
    onMessage: (callback: (data: BridgeMessage<MessagePayload<T>>) => void) => UnregisterFunction,
    setTarget?: (targetWindow: Window | null, targetOrigin: string) => void,
}