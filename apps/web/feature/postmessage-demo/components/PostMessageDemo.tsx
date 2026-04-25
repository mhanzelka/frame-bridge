"use client";

import { useState, useEffect } from "react";
import { BridgeProvider, IframeBridgeHost, useBridge, useBridgeState } from "@mhanzelka/react-frame-bridge";
import type { Bridge } from "@mhanzelka/frame-bridge/bridge/types";
import { InlineDevTools } from "@/shared/components/InlineDevTools";
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

const ParentControls = () => {
    const bridge = useBridge() as Bridge<DemoMessage>;
    const state = useBridgeState();
    const [log, setLog] = useState<LogEntry[]>([]);
    const [value, setValue] = useState(1);
    const [sending, setSending] = useState(false);

    const sendPing = async () => {
        const msg: DemoMessage = { type: "ping", value };
        setSending(true);
        setLog(prev => [entry("out", msg), ...prev]);
        try {
            const reply = await bridge.send(msg, { timeout: 3000 });
            setLog(prev => [entry("in", reply), ...prev]);
            setValue(v => v + 1);
        } catch {
            setLog(prev => [
                { id: ++seq, direction: "out", msg: { type: "ping", value }, at: "timeout" },
                ...prev,
            ]);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="flex h-full flex-col gap-4">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-zinc-100">Parent</h3>
                <StatusDot state={state.state} />
            </div>

            <div className="flex gap-2">
                <button
                    onClick={sendPing}
                    disabled={sending || state.state !== "open"}
                    className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {sending ? "Waiting for pong…" : `Send ping (value=${value})`}
                </button>
                <button
                    onClick={() => setLog([])}
                    className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200"
                >
                    Clear
                </button>
            </div>

            <div className="flex-1 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs">
                {log.length === 0 && (
                    <p className="text-zinc-600">Press "Send ping" to start</p>
                )}
                {log.map(e => (
                    <div
                        key={e.id}
                        className={clsx(
                            "mb-1 flex gap-2",
                            e.direction === "out" ? "text-blue-400" : "text-emerald-400",
                        )}
                    >
                        <span className="text-zinc-600">{e.at}</span>
                        <span>{e.direction === "out" ? "→" : "←"}</span>
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

type DemoAreaProps = { origin: string };

const DemoArea = ({ origin }: DemoAreaProps) => (
    <BridgeProvider<DemoMessage>
        open={true}
        channelName="frame-bridge-demo-pm"
        role="parent"
        enabledTransports={["post-message-channel"]}
        targetOrigin={origin}
    >
        <div className="grid h-80 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-blue-900/50 bg-zinc-900 p-5">
                <ParentControls />
            </div>
            <IframeBridgeHost
                src="/iframe/postmessage-child"
                targetOrigin={origin}
                className="h-full w-full rounded-xl border border-purple-900/50"
                title="postMessage child"
            />
        </div>
    </BridgeProvider>
);

export const PostMessageDemo = () => {
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
