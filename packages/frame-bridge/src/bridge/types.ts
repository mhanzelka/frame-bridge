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
    /** Total deadline before rejecting. Default 5000ms. */
    timeoutMs?: number,
    /** Delay between ping retries when the previous attempt fails. Default 200ms. */
    intervalMs?: number,
    /** Force the ping to go through a specific transport instead of the default priority order. */
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
    /** Optional prefix prepended to the generated bridge `id` for easier log filtering. */
    prefix?: string,
    /** Logical channel name. Both ends must agree on it for messages to be routed. */
    channelName: string,
    /** Transports to attempt to open. Order matters: first opened becomes the default for `send`. */
    enabled: TransportType[],
    /** `parent` opens MessageChannel actively; `child` waits to receive a port via handshake. */
    role: BridgeRole,
    /** Target origin for postMessage. Use `'same-origin'` to resolve to `window.location.origin`, `'*'` to skip the check. */
    targetOrigin?: string | `same-origin`,
    /** Explicit target Window. If omitted, the bridge auto-detects `window.parent` or `window.opener` (child contexts). Parent-role pages typically pass it later via `setTarget`. */
    target?: Window,
    options?: CreateBridgeOptions<T>
}

/**
 * A two-way messaging bridge between a parent window/page and a child (iframe or popup).
 *
 * Multiplexes over up to three transports — `broadcast-channel` (same-origin),
 * `post-message-channel` (cross-origin via `window.postMessage`), and `message-channel`
 * (transferred MessagePort, lowest latency). The first opened transport in the
 * `enabled` order is used as the default for `send`/`sendEvent`; callers can
 * override per-call via `SendMessageOptions.preferredTransport`.
 *
 * Lifecycle: `open()` → `waitForReady()` (optional, gates first send) → `send`/`sendEvent` → `close()`.
 */
export type Bridge<T extends any = any> = {
    /** Random per-instance ID. Used in log lines for correlating both ends. */
    id: string,
    /** Logical channel name shared by both ends. Read-only mirror of `CreateBridgeParams.channelName`. */
    channelName: string,
    /**
     * Opens all enabled transports. For `parent` role this also actively opens the
     * `message-channel` transport (transferring a port to the child via handshake).
     * Must be called before `send`, `sendEvent`, or `waitForReady`.
     */
    open: () => Promise<void>
    /** Closes all transports and rejects any in-flight requests. */
    close: () => void,
    /** Dynamically open a single transport that is in the `enabled` list. */
    enable: (type: TransportType) => Promise<void>,
    /** Dynamically close a single transport without affecting the others. */
    disable: (type: TransportType) => void,
    /**
     * Request/response. Sends `data` and resolves with the peer's reply, or rejects
     * on timeout/abort. Tries transports in priority order until one is open.
     */
    send: SendMessageFunction<T>,
    /** Fire-and-forget. Sends `data` over the first available transport; no reply expected. */
    sendEvent: SendEventFunction<T>,
    /**
     * Polls the peer with a `sys:ping` until it answers (or the deadline expires).
     * Use after `open()` to gate the first `send` and avoid losing the message
     * to a not-yet-mounted child bridge.
     */
    waitForReady: (options?: WaitForReadyOptions) => Promise<void>,
    /** True once at least one transport is open. */
    isOpen: () => boolean,
    /** Snapshot of which transports are currently enabled vs actually opened. */
    active: () => BridgeActiveTransports,
    /**
     * Retargets the post-message transport at runtime. Used by `IframeBridgeHost`
     * to point the parent bridge at the iframe's `contentWindow` once it mounts,
     * and to clear the target on unmount (`win = null`).
     */
    setTarget: (win: Window | null, newOrigin: string | `same-origin`) => void,
    /**
     * Installs the single handler for incoming app messages. Returns an unsubscribe
     * function. Passing `null` clears the handler. The handler may return a value
     * to reply to a request, or `undefined` for events.
     */
    onMessage: (handler: OnMessageHandler<T> | null) => (() => void),
    /**
     * Installs a passive observer that sees every in/out message and timeouts.
     * Multi-subscriber (used by devtools); does not affect message delivery or replies.
     */
    addMessageObserver: (observer: BridgeObserver<T>) => (() => void),
    /** Reactive state store: `getState()` for a snapshot, `subscribe(l)` for change notifications. */
    state: BridgeStateStore
}