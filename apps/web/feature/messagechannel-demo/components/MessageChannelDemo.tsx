"use client";

import { useState, useEffect } from "react";
import { BridgeProvider, IframeBridgeHost, useBridge, useBridgeState } from "@mhanzelka/react-frame-bridge";
import type { Bridge } from "@mhanzelka/frame-bridge/bridge/types";
import { InlineDevTools } from "@/shared/components/InlineDevTools";
import { clsx } from "clsx";

type DemoMessage =
    | { type: "ping"; value: number }
    | { type: "pong"; value: number }
    | { type: "buffer"; bytes: ArrayBuffer; size: number }
    | { type: "buffer-ack"; size: number; firstByte: number };

type LogEntry = {
    id: number;
    direction: "out" | "in";
    label: string;
    detail?: string;
    at: string;
};

const BUFFER_SIZE = 1024;
const BUFFER_FIRST_BYTE = 42;

let seq = 0;
const nowStamp = () =>
    new Date().toLocaleTimeString("en", { hour12: false, fractionalSecondDigits: 3 });

type EntryParams = { direction: LogEntry["direction"]; label: string; detail?: string };
const entry = ({ direction, label, detail }: EntryParams): LogEntry => ({
    id: ++seq,
    direction,
    label,
    detail,
    at: nowStamp(),
});

type StatusDotProps = { state: string };
const StatusDot = ({ state }: StatusDotProps) => (
    <span className="flex items-center gap-1.5 text-xs text-zinc-400">
        <span
            className={clsx(
                "size-2 rounded-full",
                state === "open" ? "bg-emerald-400" : "bg-zinc-600",
            )}
        />
        {state}
    </span>
);

type TransportBadgeProps = { active: boolean };
const TransportBadge = ({ active }: TransportBadgeProps) => (
    <span
        className={clsx(
            "rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
            active
                ? "bg-emerald-500/10 text-emerald-300"
                : "bg-zinc-800 text-zinc-500",
        )}
        title={
            active
                ? "Direct MessagePort is open — traffic flows on the dedicated channel."
                : "Dedicated port not open yet — handshake hasn't completed."
        }
    >
        {active ? "message-channel" : "handshaking…"}
    </span>
);

const ParentControls = () => {
    const bridge = useBridge() as Bridge<DemoMessage>;
    const status = useBridgeState();
    const [log, setLog] = useState<LogEntry[]>([]);
    const [pingValue, setPingValue] = useState(1);
    const [sendingPing, setSendingPing] = useState(false);
    const [sendingBuffer, setSendingBuffer] = useState(false);

    const portOpen = status.transports[`message-channel`]?.state === `open`;

    const sendPing = async () => {
        const msg: DemoMessage = { type: "ping", value: pingValue };
        setSendingPing(true);
        setLog(prev => [entry({ direction: "out", label: `ping value=${pingValue}` }), ...prev]);
        try {
            const reply = await bridge.send(msg, { timeout: 3000 });
            const value = reply.type === "pong" ? reply.value : NaN;
            setLog(prev => [entry({ direction: "in", label: `pong value=${value}` }), ...prev]);
            setPingValue(v => v + 1);
        } catch {
            setLog(prev => [entry({ direction: "out", label: "ping timeout" }), ...prev]);
        } finally {
            setSendingPing(false);
        }
    };

    const sendBuffer = async () => {
        // Allocate a fresh buffer each click — MessageChannel transfers it,
        // so a previously transferred buffer would have byteLength === 0.
        const buf = new Uint8Array(BUFFER_SIZE);
        buf[0] = BUFFER_FIRST_BYTE;
        const arrayBuffer = buf.buffer;

        setSendingBuffer(true);
        setLog(prev => [
            entry({
                direction: "out",
                label: `buffer ${BUFFER_SIZE} B`,
                detail: `firstByte=${BUFFER_FIRST_BYTE}`,
            }),
            ...prev,
        ]);

        try {
            const reply = await bridge.send(
                { type: "buffer", bytes: arrayBuffer, size: BUFFER_SIZE },
                { timeout: 3000, transfer: [arrayBuffer] }
            );

            // After the transfer, the parent's reference is detached — proves zero-copy.
            const transferredAway = arrayBuffer.byteLength === 0;
            const ackSize = reply.type === "buffer-ack" ? reply.size : NaN;
            const ackFirst = reply.type === "buffer-ack" ? reply.firstByte : NaN;

            setLog(prev => [
                entry({
                    direction: "in",
                    label: `buffer-ack size=${ackSize} firstByte=${ackFirst}`,
                    detail: transferredAway
                        ? "parent buf.byteLength is 0 → zero-copy transfer"
                        : "parent buf.byteLength still > 0 (no transfer happened)",
                }),
                ...prev,
            ]);
        } catch {
            setLog(prev => [
                entry({ direction: "out", label: "buffer timeout" }),
                ...prev,
            ]);
        } finally {
            setSendingBuffer(false);
        }
    };

    const busy = sendingPing || sendingBuffer;

    return (
        <div className="flex h-full flex-col gap-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-zinc-100">Parent</h3>
                    <TransportBadge active={portOpen} />
                </div>
                <StatusDot state={status.state} />
            </div>

            <div className="flex flex-wrap gap-2">
                <button
                    onClick={sendPing}
                    disabled={busy || status.state !== "open"}
                    className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {sendingPing ? "Waiting for pong…" : `Send ping (value=${pingValue})`}
                </button>
                <button
                    onClick={sendBuffer}
                    disabled={busy || status.state !== "open"}
                    className="rounded-lg bg-purple-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {sendingBuffer ? "Transferring buffer…" : `Send buffer (${BUFFER_SIZE} B)`}
                </button>
                <button
                    onClick={() => setLog([])}
                    className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200"
                >
                    Clear
                </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs">
                {log.length === 0 && (
                    <p className="text-zinc-600">Press a button to send a message</p>
                )}
                {log.map(e => (
                    <div
                        key={e.id}
                        className={clsx(
                            "mb-1.5",
                            e.direction === "out" ? "text-blue-400" : "text-emerald-400",
                        )}
                    >
                        <div className="flex gap-2">
                            <span className="text-zinc-600">{e.at}</span>
                            <span>{e.direction === "out" ? "→" : "←"}</span>
                            <span>{e.label}</span>
                        </div>
                        {e.detail && (
                            <div className="ml-[4.25rem] text-[11px] text-zinc-500">{e.detail}</div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

type DemoAreaProps = { origin: string };

const DemoArea = ({ origin }: DemoAreaProps) => (
    <BridgeProvider<DemoMessage>
        open={true}
        channelName="frame-bridge-demo-mc"
        role="parent"
        // Both transports must be enabled: post-message-channel acts as a one-shot
        // courier that delivers port2 to the child during the handshake.
        enabledTransports={["message-channel", "post-message-channel"]}
        targetOrigin={origin}
    >
        <div className="grid h-80 gap-4 lg:grid-cols-2">
            <div className="h-full overflow-hidden rounded-xl border border-blue-900/50 bg-zinc-900 p-5">
                <ParentControls />
            </div>
            <IframeBridgeHost
                src="/iframe/messagechannel-child"
                targetOrigin={origin}
                className="h-full w-full rounded-xl border border-purple-900/50"
                title="MessageChannel child"
            />
        </div>
    </BridgeProvider>
);

export const MessageChannelDemo = () => {
    const [origin, setOrigin] = useState("");

    useEffect(() => {
        setOrigin(window.location.origin);
    }, []);

    return (
        <>
            {origin && <DemoArea origin={origin} />}
            <div className="mt-6">
                <p className="mb-2 text-xs font-medium text-zinc-500">DevTools — parent bridge</p>
                <InlineDevTools />
            </div>
        </>
    );
};
