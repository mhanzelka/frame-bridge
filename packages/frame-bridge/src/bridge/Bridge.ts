import {
    Bridge,
    TransportType,
    SendMessageOptions,
    BridgeActiveTransports,
    OnMessageHandler,
    CreateBridgeParams, TransferableTransportType,
    WaitForReadyOptions
} from "@/bridge/types";
import {
    BridgeMessage, isBridgeEventMessage, isBridgeResponseMessage,
    makeEventMessage,
    makeRequestMessage,
    makeResponseMessage, MessageDomain, MessagePayload, SystemMessagePayload
} from "@/bridge/messages";
import {createBroadcastTransport} from "@/bridge/transports/BroadcastChannelTransport";
import {createPostMessageTransport} from "@/bridge/transports/PostMessageTransport";
import {Transport} from "@/bridge/transports/Transport";
import {detectChildTarget, isWindowReachable} from "@/BrowserUtils";
import {createPendingStore} from "@/comm/PendingStore";
import {createBridgeObserver} from "@/bridge/observer/BridgeObserver";
import {createBridgeState} from "@/bridge/BridgeState";
import {createMessagePortTransport} from "@/bridge/transports/MessagePortTransport";
import {getPrioritizedTransports} from "@/bridge/lib/transport";
import * as logger from "@/logger";

declare const __BRIDGE_VERSION__: string;
export const bridgeVersion: string = typeof __BRIDGE_VERSION__ !== `undefined` ? __BRIDGE_VERSION__ : `0.0.0`;

/**
 * Create a {@link Bridge} for two-way communication between a parent window/page
 * and a child (iframe or popup).
 *
 * Multiplexes over up to three transports — `broadcast-channel` (same-origin),
 * `post-message-channel` (cross-origin via `window.postMessage`), and `message-channel`
 * (transferred MessagePort, lowest latency). `enabled` order defines the default
 * priority for outbound messages.
 *
 * Roles: `parent` actively opens the MessageChannel and transfers a port to the child;
 * `child` receives the port via the post-message handshake. The `target` window is
 * auto-detected for child contexts (`window.parent` → `window.opener`); parent-role
 * pages typically pass it later via `setTarget` once the iframe mounts.
 *
 * @returns a {@link Bridge} object — see its docs for the public surface.
 */
export const createBridge
    = <T extends any>(
    {
        prefix = ``,
        channelName,
        enabled,
        targetOrigin,
        target,
        role,
        options
    }: CreateBridgeParams<T>
) => {
    const opt = {
        resolveMessageKey: (message: BridgeMessage) => message.msgId,
        ...options
    }

    let origin = targetOrigin === `same-origin` ? window.location.origin : targetOrigin;
    // No explicit target → infer the host window (iframe parent / popup opener).
    // Top-level pages without an opener stay null and rely on setTarget() later
    // (parent role pointing at an iframe.contentWindow).
    let targetWindow: Window | null = target ?? detectChildTarget();
    let onMessageHandler: OnMessageHandler<T> | null = null;

    const id = (prefix ? `${prefix}-` : ``) + Math.random().toString(36).slice(2);
    const {getState, subscribe, patchState, patchChannelState, incMessageCount} = createBridgeState({
        origin: origin
    });
    const pendingStore = createPendingStore({
        onChange: (pendingCount) => patchState({pendingCount})
    });
    const transports = new Map<TransportType, Transport<T>>();
    const handlersUnsubscribe = new Map<TransportType, () => void>();
    const {notifyObservers, addObserver: addMessageObserver} = createBridgeObserver<MessagePayload<T>>(id, channelName);

    const isSameOrigin = () => origin === window.location.origin;

    /**
     * Polls the peer with a `sys:ping` until it answers or the deadline expires.
     * Used internally during MessageChannel handshake and exposed publicly so a
     * parent can wait for the child bridge to come up before sending init payloads.
     */
    const waitForReady = async (options?: WaitForReadyOptions): Promise<void> => {
        const timeoutMs = options?.timeoutMs ?? 5000;
        const intervalMs = options?.intervalMs ?? 200;
        const preferredTransport = options?.preferredTransport;

        if (!isOpen()) {
            throw new Error(`[bridge:${channelName}] waitForReady called on closed bridge — call open() first`);
        }

        const deadline = Date.now() + timeoutMs;
        let attempts = 0;

        while (true) {
            attempts++;
            const remaining = deadline - Date.now();
            if (remaining <= 0) {
                throw new Error(`[bridge:${channelName}] waitForReady timed out after ${timeoutMs}ms (${attempts} attempts)`);
            }
            try {
                await sendSys({command: `ping`}, {
                    timeout: Math.min(1000, remaining),
                    preferredTransport
                });
                return;
            } catch {
                logger.warn(`[bridge:${channelName}] waitForReady ping attempt ${attempts} failed, retrying`);
                const wait = Math.min(intervalMs, deadline - Date.now());
                if (wait > 0) await new Promise(res => setTimeout(res, wait));
            }
        }
    }

    /**
     * Parent-side MessageChannel handshake: temporarily ensures the post-message
     * transport is open, waits for the child to answer a sys ping (so we know
     * a bridge is mounted on the other side), then transfers `port` to it.
     * If the post-message transport was not previously open, it is closed again
     * after the handshake — we only used it as a courier.
     */
    const messageChannelHandshake = async (port: MessagePort) => {
        try {
            const handshakeTransport: TransferableTransportType = `post-message-channel`;
            const transport = ensureTransportBuilt(handshakeTransport);
            const opened = transport.isOpen();

            await openTransport(handshakeTransport);
            await waitForReady({timeoutMs: 6000, intervalMs: 200, preferredTransport: handshakeTransport});

            logger.log(`[bridge:${channelName}] Sending MessageChannel handshake (id: ${id})`);
            await sendSys(
                {command: `handshake`},
                {transfer: [port], preferredTransport: handshakeTransport}
            );

            if (!opened) {
                closeTransport(handshakeTransport);
            }

            return true;
        } catch(e: any) {
            logger.error(`[bridge:${channelName}] MessageChannel handshake failed:`, e);
            return false;
        }
    }

    const buildBroadcastTransport = () => createBroadcastTransport<T>(channelName);
    const buildPostMessageTransport = () => createPostMessageTransport<T>(channelName,
        () => origin!,
        () => targetWindow!,
        async (port) => {
            await openTransport(`message-channel`, port)
        }
    )
    const buildMessagePortTransport = () => createMessagePortTransport<T>(channelName, messageChannelHandshake)

    const ensureTransportBuilt = (type: TransportType): Transport<T> => {
        if (transports.has(type)) return transports.get(type)!;
        switch (type) {
            case `broadcast-channel`: {
                const transport = buildBroadcastTransport();
                transports.set(type, transport);
                return transport;
            }
            case `post-message-channel`: {
                const transport = buildPostMessageTransport();
                transports.set(type, transport);
                return transport;
            }
            case `message-channel`: {
                const transport = buildMessagePortTransport();
                transports.set(type, transport);
                return transport;
            }
        }
    }

    const onBridgeSystemMessage = async (
        data: SystemMessagePayload,
        source: TransportType
    ) : Promise<SystemMessagePayload | undefined> => {
        switch (data.command) {
            case `handshake`:
                logger.log(`[bridge:${channelName}] Handshake received via ${source}`);
                return {command: `handshake`};
            case `ping`:
                return {command: `pong`};
        }
    }

    /**
     * Routes an incoming message:
     *   1. response → resolves a pending `send` promise via {@link pendingStore}
     *   2. sys request → handled by {@link onBridgeSystemMessage}
     *   3. app request → forwarded to the user-installed `onMessage` handler
     *
     * Request handlers may return a value, which is wrapped into a response
     * message and sent back over the same transport that delivered the request.
     * Event messages (`evt:` prefix) are dispatched without expecting a reply.
     */
    const handleIncomingMessages
        = async (message: BridgeMessage<T | SystemMessagePayload>, source: TransportType): Promise<BridgeMessage<T> | undefined> => {
        logger.log(`[bridge:${channelName}] ← ${source} ${message.msgId}`);

        notifyObservers(source, {type: `message`, direction: `in`, message});
        incMessageCount(source)

        if (isBridgeResponseMessage(message, channelName) && pendingStore.hasPending(message.responseTo)) {
            pendingStore.resolvePending(message.responseTo, message.data)
            return;
        }

        const messageHandler = message.domain === `sys`
            ? onBridgeSystemMessage
            : onMessageHandler;

        if (!messageHandler) {
            logger.warn(`[bridge:${channelName}] No onMessage handler — dropping ${message.msgId}`);
            return;
        }

        if (isBridgeEventMessage(message, channelName)) {
            await messageHandler(message.data, source);
            return;
        }

        const response = await messageHandler(message.data as any, source) as MessagePayload<T>;
        const responseMessage = makeResponseMessage<MessagePayload<T>>(id, message.domain, channelName, response, message.msgId);
        const transport = transports.get(source);
        if (!transport || !transport.isOpen()) {
            logger.warn(`[bridge:${channelName}] Transport ${source} unavailable for response`);
            return;
        }
        transport.post(responseMessage);
        notifyObservers(source, {type: `message`, direction: `out`, message: responseMessage});
        incMessageCount(source);
    }

    const openTransport = async (type: TransportType, port?: MessagePort) => {
        const transport = ensureTransportBuilt(type);
        if (handlersUnsubscribe.has(type)) return;
        const off = transport.onMessage((msg) => handleIncomingMessages(msg, type).catch(err => logger.error(`[bridge:${channelName}] Unhandled error in message handler:`, err)));
        handlersUnsubscribe.set(type, off);
        await transport.open(type === `message-channel` ? port : undefined);
        patchChannelState(type, {state: `open`, messageCount: 0});
    }

    const closeTransport = (type: TransportType) => {
        const transport = transports.get(type);
        if (!transport) return;
        handlersUnsubscribe.get(type)?.();
        handlersUnsubscribe.delete(type);
        transport.close();
        patchChannelState(type, {state: `closed`});
    }

    /**
     * Opens all enabled transports. Standard transports are opened in parallel;
     * `message-channel` is opened sequentially afterwards because it needs another
     * transport (post-message or broadcast) already open to negotiate the port handshake.
     * Only `parent` role actively opens `message-channel` — `child` receives the port via the handshake.
     */
    const open = async () => {
        const standard = enabled.filter(t => t !== `message-channel`);
        await Promise.all(standard.map(t => openTransport(t)));

        if (enabled.includes(`message-channel`) && role !== `child`) {
            if (!isWindowReachable(targetWindow) && !isSameOrigin()) {
                throw new Error(`Cannot open MessageChannel: no reachable target window or same-origin context`);
            }
            await openTransport(`message-channel`);
        }

        patchState({state: `open`});
    }

    /** Closes all transports and rejects any in-flight requests waiting for a response. */
    const close = () => {
        enabled.map(closeTransport)
        pendingStore.clearAll();
        patchState({state: `closed`});
    }

    /** Dynamically open a single transport that was declared in `enabled`. */
    const enable = async (type: TransportType) => {
        await openTransport(type);
    }

    /** Dynamically close a single transport without affecting the others. */
    const disable = (type: TransportType) => {
        closeTransport(type);
    }

    /** Returns a snapshot of which transports are currently enabled vs actually opened. */
    const active = () => {
        const enabledTransports = Array.from(transports.keys()) as TransportType[];
        const openedTransports = enabledTransports.filter(t => transports.get(t)!.isOpen());
        return {
            enabled: enabledTransports,
            opened: openedTransports
        } as BridgeActiveTransports
    }

    /** True once at least one transport is open. */
    const isOpen = () => active().opened.length > 0;

    /**
     * Retargets the post-message transport. Used by `IframeBridgeHost` to point the
     * parent bridge at the iframe's `contentWindow` on mount, and to clear it (`win = null`) on unmount.
     */
    const setTarget = (win: Window | null, newOrigin: string | `same-origin`) => {
        targetWindow = win;
        origin = newOrigin === `same-origin` ? window.location.origin : newOrigin;
        patchState({origin: newOrigin});
    }

    /**
     * Installs the single handler for incoming app messages. Returns an unsubscribe
     * function. Pass `null` to clear. The handler may return a value to reply to a
     * request, or `undefined` for events.
     */
    const onMessage = (handler: OnMessageHandler<T> | null) => {
        onMessageHandler = handler;
        return () => { onMessageHandler = null; };
    }

    /**
     * Core request/response send. Walks transports in priority order
     * (`preferredTransport` first if given, otherwise `enabled` order), posts
     * the message on the first one that's open, and registers a pending entry
     * so the matching response can resolve the returned promise. Times out
     * via {@link pendingStore}; cancellable via `options.signal`.
     */
    const sendInternal = async (
        data: MessagePayload<T>,
        domain: MessageDomain,
        options?: SendMessageOptions
    ) : Promise<T> => {
        const message = makeRequestMessage<MessagePayload<T>>(id, domain, channelName, data);
        const messageKey = domain === `sys`
            ? (msg: BridgeMessage) => msg.msgId
            : opt.resolveMessageKey;

        if (!isOpen())
            throw new Error(`Bridge is not open. Cannot send message (${messageKey}).`);
        const sendOpt = {
            timeout: 10000,
            ...options
        }

        for (const type of getPrioritizedTransports(enabled, sendOpt.preferredTransport)) {
            const transport = transports.get(type);
            if (!transport || !transport.isOpen()) {
                logger.warn(`[bridge:${channelName}] Transport ${type} unavailable, trying next`);
                continue;
            }
            logger.log(`[bridge:${channelName}] → ${type} ${message.msgId}`, message.data);
            notifyObservers(type, {type: `message`, direction: `out`, message});
            incMessageCount(type);
            transport.post(message, sendOpt.transfer || []);

            return new Promise<T>((resolve, reject) => {
                pendingStore.addPending(message.msgId, {
                    resolve,
                    reject,
                    timeout: sendOpt.timeout,
                    timeoutError: new Error(`Bridge message timeout after ${sendOpt.timeout}ms (${messageKey})`),
                    onTimeout: () => notifyObservers(type, {type: `message-timeout`, msgId: message.msgId})
                })

                sendOpt.signal?.addEventListener(`abort`, () => {
                    pendingStore.rejectPending(message.msgId, new Error(`Message aborted (${messageKey})`));
                }, {once: true});
            })
        }

        throw new Error(`No available transport for bridge ${channelName}. Ensure at least one transport is enabled and open.`);
    }

    const sendEventInternal = async (
        domain: MessageDomain,
        data: T
    ) => {
        if (!isOpen()) throw new Error(`Bridge ${channelName} is not open`);
        const message = makeEventMessage<T>(id, domain, channelName, data);
        for (const type of enabled) {
            const transport = transports.get(type);
            if (!transport || !transport.isOpen()) {
                logger.warn(`[bridge:${channelName}] Transport ${type} unavailable, trying next`);
                continue;
            }
            logger.log(`[bridge:${channelName}] →evt ${type} ${message.msgId}`);
            transport.post(message);
            notifyObservers(type, {type: `message`, direction: `out`, message});
            incMessageCount(type);
            return;
        }
        throw new Error(`No available transport to send event on bridge ${channelName}.`);
    }

    const sendSys = (data: SystemMessagePayload, options?: SendMessageOptions) =>
        sendInternal(data, `sys`, options);

    /** Request/response. Resolves with the peer's reply, rejects on timeout/abort. */
    const send = (data: T, options?: SendMessageOptions) => sendInternal(data, `app`, options);
    /** Fire-and-forget event. No reply expected. */
    const sendEvent = (data: T) => sendEventInternal(`app`, data);

    logger.log(`[bridge] Created channel "${channelName}" id=${id}`);

    return {
        id, channelName, origin,
        open, close, enable, disable, send, isOpen, active, setTarget, onMessage, sendEvent,
        waitForReady,
        addMessageObserver,
        state: {
            getState,
            subscribe
        }
    } as Bridge<T>;
}
