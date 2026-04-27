import {BridgeMessage} from "@/bridge/messages";
import {BridgeObserver} from "@/bridge/observer/types";

export type BridgeRole = `parent` | `child`;
export type BridgeState = `closed` | `open` | `partially-open`;
export type TransportType = `post-message-channel` | `broadcast-channel` | `message-channel`;
export type TransferableTransportType = Exclude<TransportType, `broadcast-channel`>;

export type TransportState = `closed` | `open` | `disabled` | `standby`
export type BridgeActiveTransports = {
    enabled: TransportType[],
    opened: TransportType[]
}
export type OnMessageHandler<T extends any> = (message: T, source: TransportType) => Promise<T | undefined> | undefined;

export type BridgeStatus = {
    state: BridgeState,
    transports: Partial<Record<TransportType, {
        state: TransportState,
        messageCount: number,
    }>>
    pendingCount: number
    origin?: string
}

export type BridgeStateController = {
    getState: () => BridgeStatus,
    patchState: (state: Partial<BridgeStatus>) => void,
    patchChannelState: (channelName: string, state: Partial<BridgeStatus[`transports`][TransportType]>) => void,
    incMessageCount: (channelName: string) => void,
    subscribe: (l: () => void) => (() => void),
}

export type BridgeStateStore = Pick<BridgeStateController, `getState` | `subscribe`>;

export type SendMessageOptions = {
    timeout?: number,
    signal?: AbortSignal,
    transfer?: Transferable[],
    preferredTransport?: TransportType
}

export type SendEventFunction<T extends any = any> = (
    data: T
) => void;

export type SendMessageFunction<T extends any = any> = (
    data: T,
    options?: SendMessageOptions
) => Promise<T>;

export type WaitForReadyOptions = {
    timeoutMs?: number,
    intervalMs?: number,
    preferredTransport?: TransportType,
}

export interface CreateBridgeOptions<T extends any> {
    /**
     * Message key to identify messages belonging to this bridge instance.
     * Bridge uses this key when logging messages to the console for easier debugging.
     */
    resolveMessageKey?: (message: BridgeMessage<T>) => string
}

export type CreateBridgeParams<T extends any> = {
    prefix?: string,
    channelName: string,
    enabled: TransportType[],
    role: BridgeRole,
    targetOrigin?: string | `same-origin`,
    target?: Window,
    options?: CreateBridgeOptions<T>
}

export type Bridge<T extends any = any> = {
    id: string,
    channelName: string,
    open: () => Promise<void>
    close: () => void,
    enable: (type: TransportType) => Promise<void>,
    disable: (type: TransportType) => void,
    send: SendMessageFunction<T>,
    sendEvent: SendEventFunction<T>,
    waitForReady: (options?: WaitForReadyOptions) => Promise<void>,
    isOpen: () => boolean,
    active: () => BridgeActiveTransports,
    setTarget: (win: Window | null, newOrigin: string | `same-origin`) => void,
    onMessage: (handler: OnMessageHandler<T> | null) => (() => void),
    addMessageObserver: (observer: BridgeObserver<T>) => (() => void),
    state: BridgeStateStore
}