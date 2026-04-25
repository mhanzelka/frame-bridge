"use client";

import { useState, useEffect } from "react";
import { BridgeProvider, useBridge, useBridgeState } from "@mhanzelka/react-frame-bridge";
import type { Bridge } from "@mhanzelka/frame-bridge/bridge/types";
import { clsx } from "clsx";

type DemoMessage = { type: "ping" | "pong"; value: number };

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

type ChildInnerProps = { targetOrigin: string };

const ChildInner = ({ targetOrigin }: ChildInnerProps) => {
    const bridge = useBridge() as Bridge<DemoMessage>;
    const state = useBridgeState();
    const [log, setLog] = useState<LogEntry[]>([]);

    useEffect(() => {
        bridge.setTarget(window.parent, targetOrigin);
    }, [bridge, targetOrigin]);

    useEffect(() => {
        return bridge.onMessage(async (msg) => {
            setLog(prev => [entry("in", msg), ...prev]);
            const reply: DemoMessage = { type: "pong", value: msg.value * 2 };
            setLog(prev => [entry("out", reply), ...prev]);
            return reply;
        });
    }, [bridge]);

    return (
        <div className="flex h-screen flex-col bg-zinc-950 p-4 font-sans text-zinc-100">
            <div className="mb-3 flex items-center gap-2">
                <span className="text-sm font-semibold text-zinc-300">postMessage child</span>
                <span
                    className={clsx(
                        "size-2 rounded-full",
                        state.state === "open" ? "bg-emerald-400" : "bg-zinc-600",
                    )}
                />
                <span className="text-xs text-zinc-500">{state.state}</span>
            </div>

            <p className="mb-3 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-400">
                Auto-replying with <span className="font-mono text-purple-400">value × 2</span>
            </p>

            <div className="flex-1 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900 p-3 font-mono text-xs">
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
                            <span className="text-zinc-500"> value={e.msg.value}</span>
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const PostMessageChildPage = () => {
    const [origin, setOrigin] = useState("");

    useEffect(() => {
        setOrigin(window.location.origin);
    }, []);

    if (!origin) return null;

    return (
        <BridgeProvider<DemoMessage>
            open={true}
            channelName="frame-bridge-demo-pm"
            role="child"
            enabledTransports={["post-message-channel"]}
            targetOrigin={origin}
        >
            <ChildInner targetOrigin={origin} />
        </BridgeProvider>
    );
};

export default PostMessageChildPage;
