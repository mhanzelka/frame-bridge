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

    // Polls the other side with a sys ping until it answers or the deadline expires.
    // Used both internally during MessageChannel handshake and exposed publicly so
    // a parent can wait for a child bridge to come up before sending init payloads.
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

    const open = async () => {
        // Open all non-message-channel transports first (message-channel needs them for handshake)
        const standard = enabled.filter(t => t !== `message-channel`);
        await Promise.all(standard.map(t => openTransport(t)));

        // Then handle message-channel sequentially (parent only — child receives port via handshake)
        if (enabled.includes(`message-channel`) && role !== `child`) {
            if (!isWindowReachable(targetWindow) && !isSameOrigin()) {
                throw new Error(`Cannot open MessageChannel: no reachable target window or same-origin context`);
            }
            await openTransport(`message-channel`);
        }

        patchState({state: `open`});
    }

    const close = () => {
        enabled.map(closeTransport)
        pendingStore.clearAll();
        patchState({state: `closed`});
    }

    const enable = async (type: TransportType) => {
        await openTransport(type);
    }

    const disable = (type: TransportType) => {
        closeTransport(type);
    }

    const active = () => {
        const enabledTransports = Array.from(transports.keys()) as TransportType[];
        const openedTransports = enabledTransports.filter(t => transports.get(t)!.isOpen());
        return {
            enabled: enabledTransports,
            opened: openedTransports
        } as BridgeActiveTransports
    }

    const isOpen = () => active().opened.length > 0;

    const setTarget = (win: Window | null, newOrigin: string | `same-origin`) => {
        targetWindow = win;
        origin = newOrigin === `same-origin` ? window.location.origin : newOrigin;
        patchState({origin: newOrigin});
    }

    const onMessage = (handler: OnMessageHandler<T> | null) => {
        onMessageHandler = handler;
        return () => { onMessageHandler = null; };
    }

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

    const send = (data: T, options?: SendMessageOptions) => sendInternal(data, `app`, options);
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
