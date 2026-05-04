"use client";

import { useEffect, useRef, useState } from "react";
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
    direction: "out" | "in";
    msg: DemoMessage;
    at: string;
    targetId?: string;
};

const BROADCAST = "" as const;

let seq = 0;
const entry = (direction: LogEntry["direction"], msg: DemoMessage, targetId?: string): LogEntry => ({
    id: ++seq,
    direction,
    msg,
    at: new Date().toLocaleTimeString("en", { hour12: false, fractionalSecondDigits: 3 }),
    targetId,
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

const ParentControls = () => {
    const bridge = useBridge() as Bridge<DemoMessage>;
    const state = useBridgeState();
    const [log, setLog] = useState<LogEntry[]>([]);
    const [value, setValue] = useState(1);
    const [sending, setSending] = useState(false);
    const [peers, setPeers] = useState<string[]>([]);
    const [target, setTarget] = useState<string>(BROADCAST);
    // Bumped on Clear so an in-flight ping that resolves later won't repopulate
    // the log it was cleared from.
    const logGeneration = useRef(0);

    const clearLog = () => {
        logGeneration.current += 1;
        setLog([]);
    };

    // Collect peer ids from the discovery protocol. `who`/`hello` are kept off the
    // visible log to keep ping/pong front and center.
    useEffect(() => {
        return bridge.onMessage(async (msg) => {
            if (msg.type === "hello") {
                setPeers(prev => (prev.includes(msg.from) ? prev : [...prev, msg.from]));
            }
            return undefined;
        });
    }, [bridge]);

    // Probe for already-running peers when this bridge comes up. New peers will
    // also push their `hello` proactively, so the list converges either way.
    useEffect(() => {
        if (state.state !== "open") return;
        bridge.sendEvent({ type: "who" });
    }, [state.state, bridge]);

    // Stale targets become dead links — drop them so the user can't accidentally
    // ship requests at a closed window and hit a timeout.
    useEffect(() => {
        if (target && !peers.includes(target)) setTarget(BROADCAST);
    }, [peers, target]);

    const sendPing = async () => {
        const msg: DemoMessage = { type: "ping", value };
        const tid = target || undefined;
        const gen = logGeneration.current;
        setSending(true);
        setLog(prev => [entry("out", msg, tid), ...prev]);
        try {
            const reply = await bridge.send(msg, {
                timeout: 3000,
                ...(tid ? { targetId: tid } : {}),
            });
            if (logGeneration.current === gen) {
                setLog(prev => [entry("in", reply), ...prev]);
            }
            setValue(v => v + 1);
        } catch {
            if (logGeneration.current === gen) {
                setLog(prev => [
                    { id: ++seq, direction: "in", msg: { type: "pong", value: -1 }, at: "timeout", targetId: tid },
                    ...prev,
                ]);
            }
        } finally {
            setSending(false);
        }
    };

    const openInNewWindow = () => {
        window.open(
            "/iframe/broadcast-child",
            "_blank",
            "popup,width=480,height=520",
        );
    };

    return (
        <div className="flex h-full flex-col gap-4">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-zinc-100">Parent</h3>
                <StatusDot state={state.state} />
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">
                <span className="text-[10px] uppercase tracking-widest text-zinc-500">my id</span>
                <span className="font-mono text-xs text-blue-300" suppressHydrationWarning>{bridge.id}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs text-zinc-500">target</label>
                <select
                    value={target}
                    onChange={e => setTarget(e.target.value)}
                    className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-200 focus:border-blue-500 focus:outline-none"
                >
                    <option value={BROADCAST}>broadcast (all peers)</option>
                    {peers.map(p => (
                        <option key={p} value={p}>{p}</option>
                    ))}
                </select>
                <button
                    onClick={openInNewWindow}
                    className="rounded-lg border border-purple-700/60 bg-purple-900/30 px-2.5 py-1.5 text-xs text-purple-200 hover:border-purple-600 hover:bg-purple-900/50 transition-colors"
                >
                    Open new window ↗
                </button>
            </div>

            <div className="flex gap-2">
                <button
                    onClick={sendPing}
                    disabled={sending || state.state !== "open"}
                    className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
                >
                    {sending ? "Waiting for pong…" : `Send ping (value=${value})`}
                </button>
                <button
                    onClick={clearLog}
                    className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 transition-colors"
                >
                    Clear
                </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs">
                {log.length === 0 && (
                    <p className="text-zinc-600">Press &ldquo;Send ping&rdquo; to start</p>
                )}
                {log.map(e => (
                    <div
                        key={e.id}
                        className={clsx(
                            "mb-1 flex flex-wrap gap-2",
                            e.direction === "out" ? "text-blue-400" : "text-emerald-400",
                        )}
                    >
                        <span className="text-zinc-600">{e.at}</span>
                        <span>{e.direction === "out" ? "→" : "←"}</span>
                        <span>
                            {e.msg.type}
                            {("value" in e.msg) && (
                                <span className="text-zinc-500"> value={e.msg.value}</span>
                            )}
                        </span>
                        {e.direction === "out" && (
                            <span className="ml-1 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-300">
                                {e.targetId ? `→ ${e.targetId}` : "broadcast"}
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export const BroadcastParent = () => (
    <BridgeProvider<DemoMessage>
        open={true}
        channelName="frame-bridge-demo"
        role="parent"
        enabledTransports={["broadcast-channel"]}
    >
        <ParentControls />
    </BridgeProvider>
);
