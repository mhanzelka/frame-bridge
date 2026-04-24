import {BridgeMessage, BridgeRequestMessage, BridgeResponseMessage} from "@mhanzelka/frame-bridge/bridge/messages"
import {TransportType} from "@mhanzelka/frame-bridge/bridge/types";

export type BridgeRequestWithResponse<T extends any = any> = BridgeRequestMessage<T> & {
    response: BridgeResponseMessage<T> | `timeout`,
    transportType: TransportType
}


export type BridgeConsoleEntry<T extends any = any> = (
    BridgeMessage<T> |
    BridgeRequestWithResponse<T>
    ) & {
    transportType: TransportType
}

export const isBridgeRequestWithResponse
    = <T extends any = any>(entry: BridgeConsoleEntry<T>): entry is BridgeRequestWithResponse<T> => {
    return (entry as BridgeRequestWithResponse<T>).response !== undefined;
}

export const isBridgeRequestTimeout
    = <T extends any = any>(entry: BridgeConsoleEntry<T>): entry is BridgeRequestWithResponse<T> & {response: `timeout`} => {
    return (entry as BridgeRequestWithResponse<T>).response === `timeout`;
}

export type ConsoleTab = `messages` | `state`;