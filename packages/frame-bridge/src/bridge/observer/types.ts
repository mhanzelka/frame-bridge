import {BridgeMessage, TransportType} from "@/bridge";

export type BridgeObserver<T = any> = (data: BridgeObserverEvent<T>) => void;
export type BridgeObserverEventParamPayload<T = any> =
    BridgeObserverMessageEvent<T> |
    BridgeObserverMessageTimeoutEvent;
export type BridgeObserverEvent<T = any> = {
    type: string;
    channelName: string,
    transportType: TransportType,
} & BridgeObserverEventParamPayload<T>

export type BridgeObserverMessageEvent<T extends any = any> = {
    type: `message`,
    message: BridgeMessage<T>,
}

export const isBridgeObserverMessageEvent = <T = any>(
    event: BridgeObserverEventParamPayload<T>
): event is BridgeObserverMessageEvent<T> => {
    return event.type === `message`;
}

export type BridgeObserverMessageTimeoutEvent = {
    type: `message-timeout`,
    msgId: string
}

export const isBridgeObserverMessageTimeoutEvent = <T = any>(
    event: BridgeObserverEventParamPayload<T>
): event is BridgeObserverMessageTimeoutEvent => {
    return event.type === `message-timeout`;
}