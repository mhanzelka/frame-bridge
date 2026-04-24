import {useMemo} from "react";
import {
    isBridgeRequestMessage,
    isBridgeResponseMessage,
    getBridgeMessageType
} from "@mhanzelka/frame-bridge/bridge/messages";
import clsx from "clsx";
const Spinner = () => (
    <svg className="animate-spin size-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
);
import {BridgeRegistrySnapshot} from "@mhanzelka/frame-bridge/bridge/debug/types";
import {
    isBridgeObserverMessageEvent,
    isBridgeObserverMessageTimeoutEvent
} from "@mhanzelka/frame-bridge/bridge/observer/types";
import {BridgeConsoleEntry, isBridgeRequestWithResponse} from "@/bridge/debug/console/types";

export type BridgeConsoleMessagesTabProps = {
    snapshot: BridgeRegistrySnapshot
    prettyJson: boolean
}

const formatTime = (date: Date) => {
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    const s = date.getSeconds().toString().padStart(2, '0');
    const ms = date.getMilliseconds().toString().padStart(3, '0');
    return `${h}:${m}:${s}:${ms}`;
}

export const BridgeConsoleMessagesTab = ({snapshot, prettyJson}: BridgeConsoleMessagesTabProps) => {
    const mergedMessages: BridgeConsoleEntry[] = useMemo(() => {
        if (!snapshot) return []
        return snapshot.eventHistory.reduce((
            acc,
            event
        ) => {
            if (isBridgeObserverMessageEvent(event)) {
                const message = event.message;
                if (isBridgeResponseMessage(message, snapshot.channelName)) {
                    const requestMessageIndex = acc.findIndex(m => m.msgId === message.responseTo);
                    if (requestMessageIndex !== -1) {
                        const requestMessage = acc[requestMessageIndex];
                        if (isBridgeRequestMessage(requestMessage, snapshot.channelName)) {
                            acc[requestMessageIndex] = {
                                ...requestMessage,
                                response: message,
                            }
                            return acc;
                        }
                    }
                }
                acc.push({
                    ...message,
                    transportType: event.transportType,
                });
            }

            if (isBridgeObserverMessageTimeoutEvent(event)) {
                const timeoutMessageIndex = acc.findIndex(m => m.msgId === event.msgId);
                if (timeoutMessageIndex !== -1) {
                    const timeoutMessage = acc[timeoutMessageIndex];
                    if (isBridgeRequestMessage(timeoutMessage, snapshot.channelName)) {
                        acc[timeoutMessageIndex] = {
                            ...timeoutMessage,
                            response: `timeout`
                        }
                    }
                }
            }

            return acc;
        }, [] as BridgeConsoleEntry[])
    }, [snapshot?.eventHistory])

    return useMemo(() => {
        if (!snapshot) return (
            <div className={`flex flex-col items-center justify-center w-full h-full p-4`}>
                <div className={`text-black/60`}>No snapshot available</div>
            </div>
        )
        if (mergedMessages.length === 0) return (
            <div className={`flex flex-col items-center justify-center w-full h-full p-4`}>
                <div className={`text-black/60`}>No messages</div>
            </div>
        )

        return mergedMessages.reverse().map((message) => {
            const messageType = getBridgeMessageType(message);

            const messageColor = (() => {
                switch (messageType) {
                    case "res": return `bg-green-100/70 border-green-300`;
                    case "req": return `bg-blue-100/70 border-blue-300`;
                    case "evt": return `bg-purple-100/70 border-purple-300`;
                    default : return `bg-gray-100/70 border-gray-300`;
                }
            })();

            const domainColor = (() => {
                switch (message.domain) {
                    case "sys": return `bg-red-100/70 border-red-300`;
                    case "app": return `bg-yellow-100/70 border-yellow-300`;
                    default : return `bg-gray-100/70 border-gray-300`;
                }
            })();

            const prettyName = (() => {
                switch (messageType) {
                    case "res": return `Response`;
                    case "req": return `Request`;
                    case "evt": return `Event`;
                    default : return `Message`;
                }
            })();

            const incoming = message.sourceId !== snapshot.id;
            const isRequest = isBridgeRequestMessage(message, snapshot.channelName);
            const hasResponse = isBridgeRequestWithResponse(message);

            const responseChildren = (() => {
                if (!hasResponse) return (
                    <div
                        className={`space-y-1 bg-gray-100/70 border border-gray-300 p-2 rounded-md w-full`}>
                        <div className={`flex flex-row items-center justify-start gap-2`}>
                            <Spinner />
                            <div className={`text-sm text-black/60`}>Waiting for response...</div>
                        </div>
                    </div>
                )

                if (message.response === `timeout`) {
                    return (
                        <div
                            className={`space-y-1 bg-red-100/70 border border-red-300 p-2 rounded-md w-full`}>
                            <div className={`text-sm text-red-600`}>Response timed out.</div>
                        </div>
                    )
                }

                return (
                    <>
                        <div className={`flex flex-row items-center gap-2 grow`}>
                            <div
                                className={`text-sm text-black/60 font-mono `}>{formatTime(new Date(message.response.ts))}</div>
                            <Badge title={`Response`} className={`bg-green-100/70 border-green-300`}/>
                            <span
                                className={`text-sm text-black/60 font-mono tracking-tight`}>{message.response.msgId}</span>

                        </div>
                        {message.response.data && (
                            <JsonBlock data={message.response.data} prettyJson={prettyJson}/>
                        )}
                    </>
                )

            })();

            return (
                <section key={message.msgId}
                         className={`space-y-2 w-full p-2 rounded-xl border border-gray-200 bg-white/90 backdrop-blur shadow-sm`}>
                    <div className={clsx(`space-y-2 border  p-2 rounded-md w-full`, messageColor)}>
                        <div className={`flex flex-col lg:flex-row items-start justify-between w-full gap-1 overflow-hidden`}>
                            <div className={`flex flex-row items-center gap-2 grow`}>
                                <div className={`text-sm text-black/60 font-mono `}>{formatTime(new Date(message.ts))}</div>
                                <Badge title={prettyName} className={messageColor}/>
                                <Badge title={`domain:${message.domain}`} className={domainColor}/>
                                {incoming ?
                                    <Badge title={`Recieve`} className={`bg-yellow-200 text-black border-black`}/> :
                                    <Badge title={`Send`} className={`bg-red-300 text-black border-black`}/>
                                }
                                <span className={`text-sm text-black/60 font-mono tracking-tight truncate`}>{message.msgId}</span>
                            </div>
                            <div className={`flex flex-row items-center gap-2`}>
                                <Badge title={`${message.transportType}`} className={`bg-gray-100`}/>
                                <Badge title={`bridge v${message.bridgeVersion}`} className={`bg-gray-100`}/>
                            </div>
                        </div>
                        <JsonBlock data={message.data} prettyJson={prettyJson}/>
                    </div>

                    {isRequest && (
                        <div className={`border-l-2 border-dashed border-gray-200 pl-2 w-full`}>
                            {responseChildren}
                        </div>
                    )}
                </section>
            )
        })
    }, [mergedMessages, prettyJson]);
}

export const Badge = ({title, className}: { title: string, className?: string }) => {
    return (
        <div className={clsx(`text-black/70 border h-5 flex items-center justify-center text-xs px-2.5  rounded-full whitespace-nowrap`, className)}>
            {title}
        </div>
    )
}

const shortenBase64InObject = (obj: any): any => {
    if (typeof obj === "string") {
        if (obj.startsWith("data:image/") && obj.length > 60) {
            const start = obj.slice(0, 40);
            const end = obj.slice(-40);
            return `${start}...${end}`;
        }
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(shortenBase64InObject);
    }

    if (obj && typeof obj === "object") {
        const out: Record<string, any> = {};
        for (const [k, v] of Object.entries(obj)) {
            out[k] = shortenBase64InObject(v);
        }
        return out;
    }

    return obj;
}

export const JsonBlock = ({data, prettyJson}: { data: any, prettyJson: boolean }) => {

    const json = useMemo(() => JSON.stringify(shortenBase64InObject(data), null, prettyJson ? 2 : 0), [data, prettyJson]);

    return (
        <pre
            className={`break-all text-xs p-2 bg-white/80 rounded-md text-black/80 w-full overflow-hidden whitespace-pre-wrap`}>
            {json}
        </pre>
    )
}