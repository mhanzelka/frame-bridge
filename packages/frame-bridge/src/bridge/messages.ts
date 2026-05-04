import {bridgeVersion} from "@/bridge/Bridge";

export type MessageDomain = `app` | `sys`;
export type MessageType = `req` | `res` | `evt`;
export type MsgId<P extends MessageType> = `${P}:${string}:${number}`;

export type MessagePayload<T> = T | SystemMessagePayload;

export type SystemMessagePayload = {
    command: `handshake` | `ping` | `pong` | `getBridgeInfo` | `bridgeInfo`,
    [key: string]: any
}

/**
 * Generate a unique message ID with the given prefix.
 * The ID is composed of the prefix, a random string, and the current timestamp.
 * @param prefix - The prefix indicating the message type (e.g., 'req', 'res', 'evt', 'sys')
 * @example
 * generateMessageId('req') // 'req:abc123:1616161616161'
 * @returns A unique message ID string
 */
export const generateMessageId = <P extends MessageType>(prefix: P): MsgId<P> => {
    return `${prefix}:${Math.random().toString(36).slice(2)}:${Date.now()}`;
}

export interface BridgeMessage<T extends any = any> {
    ts: number,
    msgId: string,
    domain: MessageDomain,
    sourceId: string,
    // Optional addressing. When set, only the bridge instance whose `id` matches
    // processes the message; other recipients ignore it. Responses always carry
    // the original requester's id here, so cross-tab broadcasts of replies
    // don't leak into unrelated bridges.
    targetId?: string,
    channelName: string,
    bridgeVersion: string,
    data: T,
}

export interface BridgeRequestMessage<T extends any = any> extends BridgeMessage<T> {
    msgId: MsgId<`req`>
}

export interface BridgeResponseMessage<T extends any = any> extends BridgeMessage<T> {
    msgId: MsgId<`res`>,
    responseTo: string
}

export interface BridgeEventMessage<T extends any = any> extends BridgeMessage<T> {
    msgId: MsgId<`evt`>,
}

export const isBridgeMessage
    = <T extends any = any>(
    msg: any,
    channelName: string
): msg is BridgeMessage<T> => {
    return Boolean(msg && typeof msg === `object` && msg.channelName === channelName && typeof msg.msgId === `string`);
}

export const isBridgeRequestMessage
    = <T extends any = any>(
    msg: any,
    channelName: string
): msg is BridgeRequestMessage<T> => {
    return isBridgeMessage<T>(msg, channelName) && msg.msgId.startsWith(`req:`);
}

export const isBridgeResponseMessage
    = <T extends any = any>(
    msg: any,
    channelName: string
): msg is BridgeResponseMessage<T> => {
    return isBridgeMessage<T>(msg, channelName)
        && msg.msgId.startsWith(`res:`)
        && `responseTo` in msg
        && typeof msg.responseTo === `string`;
}

export const isBridgeEventMessage
    = <T extends any = any>(
    msg: any,
    channelName: string
): msg is BridgeEventMessage<T> => {
    return isBridgeMessage<T>(msg, channelName) && msg.msgId.startsWith(`evt:`);
}

/**
 * Extract the message type from a BridgeMessage based on its msgId prefix.
 * @param msg - The BridgeMessage object
 * @returns The message type as 'req', 'res', 'evt', or 'sys'
 * @throws Error if the msgId does not match any known prefixes
 */
export const getBridgeMessageType = (msg: BridgeMessage<any>): MessageType => {
    if (msg.msgId.startsWith(`req:`)) return `req`;
    if (msg.msgId.startsWith(`res:`)) return `res`;
    if (msg.msgId.startsWith(`evt:`)) return `evt`;
    throw new Error(`Unknown message type for msgId: ${msg.msgId}`);
}

/**
 * Make a request message. Request messages expect a response and are prefixed with `req:` in the msgId.
 * When a request message is sent, the sender should wait for a corresponding response message
 * with the same msgId in the `responseTo` field.
 * @param sourceId - ID of the bridge instance sending the message
 * @param domain - Domain of the message (e.g., 'app' or 'sys')
 * @param channelName - Name of the channel the message is sent on
 * @param data - Data payload
 * @param targetId - Optional bridge instance id the request is addressed to. When omitted, any listener may answer.
 * @returns A BridgeRequestMessage object
 */
export const makeRequestMessage = <T extends any>(
    sourceId: string,
    domain: MessageDomain,
    channelName: string,
    data: T,
    targetId?: string
): BridgeRequestMessage<T> => {
    const msg: BridgeRequestMessage<T> = {
        ts: Date.now(),
        domain: domain,
        msgId: generateMessageId(`req`),
        sourceId,
        channelName,
        bridgeVersion,
        data: data
    }
    if (targetId !== undefined) msg.targetId = targetId;
    return msg;
}

/**
 * Make a response message. Response messages are sent in reply to a request message
 * and are prefixed with `res:` in the msgId.
 * A response message must include the `responseTo` field, which is the msgId of the request message.
 * @param sourceId - ID of the bridge instance sending the message
 * @param domain - Domain of the message (e.g., 'app' or 'sys')
 * @param channelName - Name of the channel the message is sent on
 * @param data - Data payload
 * @param responseTo - msgId of the request message being responded to
 * @param targetId - Bridge instance id the response is addressed to (the original requester's sourceId).
 *                   Always set so unrelated tabs sharing a BroadcastChannel ignore it.
 * @returns A BridgeResponseMessage object
 */
export const makeResponseMessage = <T extends any>(
    sourceId: string,
    domain: MessageDomain,
    channelName: string,
    data: T,
    responseTo: string,
    targetId: string
): BridgeResponseMessage<T> => {
    return {
        ts: Date.now(),
        domain: domain,
        msgId: generateMessageId(`res`),
        sourceId,
        targetId,
        channelName,
        data: data,
        bridgeVersion,
        responseTo
    }
}

/**
 * Make an event message. Event messages are used for one-way notifications and do not expect a response.
 * They are prefixed with `evt:` in the msgId.
 * @param sourceId - ID of the bridge instance sending the message
 * @param domain - Domain of the message (e.g., 'app' or 'sys')
 * @param channelName - Name of the channel the message is sent on
 * @param data - Data payload
 * @param targetId - Optional bridge instance id the event is addressed to. When omitted, every listener handles it.
 * @returns A BridgeEventMessage object
 */
export const makeEventMessage = <T extends any>(
    sourceId: string,
    domain: MessageDomain,
    channelName: string,
    data: T,
    targetId?: string
): BridgeEventMessage<T> => {
    const msg: BridgeEventMessage<T> = {
        ts: Date.now(),
        domain: domain,
        msgId: generateMessageId(`evt`),
        sourceId,
        channelName,
        bridgeVersion,
        data: data
    }
    if (targetId !== undefined) msg.targetId = targetId;
    return msg;
}
