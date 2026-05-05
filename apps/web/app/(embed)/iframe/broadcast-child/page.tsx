"use client";

import { useState, useEffect } from "react";
import { BridgeProvider, useBridge, useBridgeState } from "@mhanzelka/react-frame-bridge";
import type { Bridge } from "@mhanzelka/frame-bridge/bridge/types";
import { clsx } from "clsx";

type DemoMessage =
    | { type: "ping"; value: number }
    | { type: "pong"; value: number }
    | { type: "hello"; from: string }
    | { type: "who" };

type LogEntry = {
    id: number;
    direction: "in" | "out";
    msg: DemoMessage;
    at: string;
};

let seq = 0;
const entry = (direction: LogEntry["direction"], msg: DemoMessage): LogEntry => ({
    id: ++seq,
    direction,
    msg,
    at: new Date().toLocaleTimeString("en", { hour12: false, fractionalSecondDigits: 3 }),
});

const ChildInner = () => {
    const bridge = useBridge() as Bridge<DemoMessage>;
    const state = useBridgeState();
    const [log, setLog] = useState<LogEntry[]>([]);
    const [copied, setCopied] = useState(false);

    // Reply protocol + visible message log. `who`/`hello` are wiring for peer
    // discovery and stay out of the log to keep it focused on ping/pong.
    useEffect(() => {
        return bridge.onMessage(async (msg) => {
            if (msg.type === "who") {
                bridge.sendEvent({ type: "hello", from: bridge.id });
                return undefined;
            }
            if (msg.type === "ping") {
                setLog(prev => [entry("in", msg), ...prev]);
                const reply: DemoMessage = { type: "pong", value: msg.value * 2 };
                setLog(prev => [entry("out", reply), ...prev]);
                return reply;
            }
            return undefined;
        });
    }, [bridge]);

    // Announce ourselves once the transport is up so parents already running
    // see us without having to re-trigger discovery manually.
    useEffect(() => {
        if (state.state !== "open") return;
        bridge.sendEvent({ type: "hello", from: bridge.id });
    }, [state.state, bridge]);

    const copyId = async () => {
        try {
            await navigator.clipboard.writeText(bridge.id);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
        } catch {
            /* clipboard blocked — ignore */
        }
    };

    return (
        <div className="flex h-screen flex-col bg-zinc-950 p-4 font-sans text-zinc-100">
            <div className="mb-3 flex items-center gap-2">
                <span className="text-sm font-semibold text-zinc-300">BroadcastChannel child</span>
                <span
                    className={clsx(
                        "size-2 rounded-full",
                        state.state === "open" ? "bg-emerald-400" : "bg-zinc-600",
                    )}
                />
                <span className="text-xs text-zinc-500">{state.state}</span>
            </div>

            <button
                onClick={copyId}
                className="mb-3 flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-left transition-colors hover:border-zinc-700"
                title="Click to copy"
            >
                <span className="text-[10px] uppercase tracking-widest text-zinc-500">my id</span>
                <span className="font-mono text-xs text-purple-300" suppressHydrationWarning>{bridge.id}</span>
                <span className="ml-auto text-[10px] text-zinc-500">{copied ? "copied" : "click to copy"}</span>
            </button>

            <p className="mb-3 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-400">
                Auto-replying with <span className="font-mono text-purple-400">value × 2</span>
            </p>

            <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900 p-3 font-mono text-xs">
                {log.length === 0 && <p className="text-zinc-600">Waiting for pings…</p>}
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
                        <span>
                            {e.msg.type}
                            {("value" in e.msg) && (
                                <span className="text-zinc-500"> value={e.msg.value}</span>
                            )}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const BroadcastChildPage = () => (
    <BridgeProvider<DemoMessage>
        open={true}
        channelName="frame-bridge-demo"
        role="child"
        enabledTransports={["broadcast-channel"]}
    >
        <ChildInner />
    </BridgeProvider>
);

export default BroadcastChildPage;
