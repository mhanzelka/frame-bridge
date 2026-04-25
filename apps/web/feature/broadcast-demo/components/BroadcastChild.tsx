"use client";

import { useState, useEffect } from "react";
import { BridgeProvider, useBridge, useBridgeState } from "@mhanzelka/react-frame-bridge";
import type { Bridge } from "@mhanzelka/frame-bridge/bridge/types";
import { clsx } from "clsx";

type DemoMessage = { type: "ping" | "pong"; value: number };

type LogEntry = {
    id: number;
    direction: "out" | "in";
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

const StatusDot = ({ state }: { state: string }) => (
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

const ChildHandler = () => {
    const bridge = useBridge() as Bridge<DemoMessage>;
    const state = useBridgeState();
    const [log, setLog] = useState<LogEntry[]>([]);

    useEffect(() => {
        return bridge.onMessage(async (msg) => {
            setLog(prev => [entry("in", msg), ...prev]);
            const reply: DemoMessage = { type: "pong", value: msg.value * 2 };
            setLog(prev => [entry("out", reply), ...prev]);
            return reply;
        });
    }, [bridge]);

    return (
        <div className="flex h-full flex-col gap-4">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-zinc-100">Child</h3>
                <StatusDot state={state.state} />
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-xs text-zinc-400">
                Auto-responding to all pings with{" "}
                <span className="font-mono text-purple-400">value × 2</span>
            </div>

            <div className="flex-1 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs">
                {log.length === 0 && (
                    <p className="text-zinc-600">Waiting for messages…</p>
                )}
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
                            <span className="text-zinc-500"> value={e.msg.value}</span>
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const BroadcastChild = () => (
    <BridgeProvider<DemoMessage>
        open={true}
        channelName="frame-bridge-demo"
        role="child"
        enabledTransports={["broadcast-channel"]}
    >
        <ChildHandler />
    </BridgeProvider>
);
