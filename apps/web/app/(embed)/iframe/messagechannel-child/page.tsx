"use client";

import { useState, useEffect } from "react";
import { BridgeProvider, useBridge, useBridgeState } from "@mhanzelka/react-frame-bridge";
import type { Bridge } from "@mhanzelka/frame-bridge/bridge/types";
import { clsx } from "clsx";

type DemoMessage =
    | { type: "ping"; value: number }
    | { type: "pong"; value: number }
    | { type: "buffer"; bytes: ArrayBuffer; size: number }
    | { type: "buffer-ack"; size: number; firstByte: number };

type LogEntry = {
    id: number;
    direction: "in" | "out";
    label: string;
    at: string;
};

let seq = 0;
const nowStamp = () =>
    new Date().toLocaleTimeString("en", { hour12: false, fractionalSecondDigits: 3 });

type EntryParams = { direction: LogEntry["direction"]; label: string };
const entry = ({ direction, label }: EntryParams): LogEntry => ({
    id: ++seq,
    direction,
    label,
    at: nowStamp(),
});

type ChildInnerProps = { targetOrigin: string };

const ChildInner = ({ targetOrigin }: ChildInnerProps) => {
    const bridge = useBridge() as Bridge<DemoMessage>;
    const status = useBridgeState();
    const [log, setLog] = useState<LogEntry[]>([]);

    // Required for post-message-channel — it's the courier that carries port2 from
    // the parent during the handshake. After that, traffic flows on the dedicated port.
    useEffect(() => {
        bridge.setTarget(window.parent, targetOrigin);
    }, [bridge, targetOrigin]);

    useEffect(() => {
        return bridge.onMessage(async (msg) => {
            if (msg.type === "ping") {
                setLog(prev => [entry({ direction: "in", label: `ping value=${msg.value}` }), ...prev]);
                const reply: DemoMessage = { type: "pong", value: msg.value * 2 };
                setLog(prev => [entry({ direction: "out", label: `pong value=${reply.value}` }), ...prev]);
                return reply;
            }
            if (msg.type === "buffer") {
                const view = new Uint8Array(msg.bytes);
                const firstByte = view.byteLength > 0 ? view[0] : NaN;
                setLog(prev => [
                    entry({
                        direction: "in",
                        label: `buffer ${view.byteLength} B firstByte=${firstByte}`,
                    }),
                    ...prev,
                ]);
                const reply: DemoMessage = {
                    type: "buffer-ack",
                    size: view.byteLength,
                    firstByte,
                };
                setLog(prev => [
                    entry({
                        direction: "out",
                        label: `buffer-ack size=${reply.size}`,
                    }),
                    ...prev,
                ]);
                return reply;
            }
            return undefined;
        });
    }, [bridge]);

    const portOpen = status.transports[`message-channel`]?.state === `open`;

    return (
        <div className="flex h-screen flex-col bg-zinc-950 p-4 font-sans text-zinc-100">
            <div className="mb-3 flex items-center gap-2">
                <span className="text-sm font-semibold text-zinc-300">MessageChannel child</span>
                <span
                    className={clsx(
                        "size-2 rounded-full",
                        status.state === "open" ? "bg-emerald-400" : "bg-zinc-600",
                    )}
                />
                <span className="text-xs text-zinc-500">{status.state}</span>
                <span
                    className={clsx(
                        "ml-auto rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
                        portOpen
                            ? "bg-emerald-500/10 text-emerald-300"
                            : "bg-zinc-800 text-zinc-500",
                    )}
                >
                    {portOpen ? "message-channel" : "handshaking…"}
                </span>
            </div>

            <p className="mb-3 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-400">
                Auto-replying: <span className="font-mono text-purple-400">ping → value × 2</span>,{" "}
                <span className="font-mono text-purple-400">buffer → buffer-ack</span>
            </p>

            <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900 p-3 font-mono text-xs">
                {log.length === 0 && <p className="text-zinc-600">Waiting for messages…</p>}
                {log.map(e => (
                    <div
                        key={e.id}
                        className={clsx(
                            "mb-1 flex gap-2",
                            e.direction === "in" ? "text-blue-400" : "text-purple-400",
                        )}
                    >
                        <span className="text-zinc-600">{e.at}</span>
                        <span>{e.direction === "in" ? "←" : "→"}</span>
                        <span>{e.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const MessageChannelChildPage = () => {
    const [origin, setOrigin] = useState("");

    useEffect(() => {
        setOrigin(window.location.origin);
    }, []);

    if (!origin) return null;

    return (
        <BridgeProvider<DemoMessage>
            open={true}
            channelName="frame-bridge-demo-mc"
            role="child"
            enabledTransports={["message-channel", "post-message-channel"]}
            targetOrigin={origin}
        >
            <ChildInner targetOrigin={origin} />
        </BridgeProvider>
    );
};

export default MessageChannelChildPage;
