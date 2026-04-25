"use client";

import { useMemo, useState } from "react";
import { useBridgeRegistryState } from "@mhanzelka/react-frame-bridge-devtools";
import { clsx } from "clsx";
import type { BridgeRegistrySnapshot } from "@mhanzelka/frame-bridge/bridge/debug/types";
import { isBridgeObserverMessageEvent, isBridgeObserverMessageTimeoutEvent } from "@mhanzelka/frame-bridge/bridge/observer/types";

type Tab = "state" | "messages";

type MessageEntry = {
    msgId: string;
    ts: number;
    type: "req" | "res" | "evt";
    direction: "in" | "out";
    data: unknown;
    transport: string;
    responseTo?: string;
    response?: { msgId: string; ts: number; data: unknown } | "timeout";
};

const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}.${d.getMilliseconds().toString().padStart(3, "0")}`;
};

const getMsgType = (msgId: string): "req" | "res" | "evt" => {
    if (msgId.startsWith("req:")) return "req";
    if (msgId.startsWith("res:")) return "res";
    return "evt";
};

const typeColors: Record<MessageEntry["type"], string> = {
    req: "text-blue-400",
    res: "text-emerald-400",
    evt: "text-purple-400",
};

const typeBadgeColors: Record<MessageEntry["type"], string> = {
    req: "bg-blue-500/10 text-blue-400",
    res: "bg-emerald-500/10 text-emerald-400",
    evt: "bg-purple-500/10 text-purple-400",
};

type MessagesViewProps = { snapshot: BridgeRegistrySnapshot };

const MessagesView = ({ snapshot }: MessagesViewProps) => {
    const entries = useMemo(() => {
        const result: MessageEntry[] = [];

        for (const event of snapshot.eventHistory) {
            if (isBridgeObserverMessageEvent(event)) {
                const msg = event.message;
                const msgType = getMsgType(msg.msgId);

                if (msgType === "res" && typeof (msg as any).responseTo === "string") {
                    const reqIdx = result.findIndex(e => e.msgId === (msg as any).responseTo);
                    if (reqIdx !== -1) {
                        result[reqIdx].response = { msgId: msg.msgId, ts: msg.ts, data: msg.data };
                        continue;
                    }
                }

                result.push({
                    msgId: msg.msgId,
                    ts: msg.ts,
                    type: msgType,
                    direction: (msg as any).sourceId === snapshot.id ? "out" : "in",
                    data: msg.data,
                    transport: event.transportType,
                    responseTo: (msg as any).responseTo,
                });
            }

            if (isBridgeObserverMessageTimeoutEvent(event)) {
                const idx = result.findIndex(e => e.msgId === event.msgId);
                if (idx !== -1) result[idx].response = "timeout";
            }
        }

        return result.reverse();
    }, [snapshot]);

    if (entries.length === 0) {
        return <p className="py-6 text-center text-xs text-zinc-600">No messages yet</p>;
    }

    return (
        <div className="space-y-2">
            {entries.map(e => (
                <div key={e.msgId} className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-zinc-500">{formatTime(e.ts)}</span>
                        <span className={clsx("rounded px-1.5 py-0.5 font-mono text-xs", typeBadgeColors[e.type])}>
                            {e.type}
                        </span>
                        <span className={clsx("text-xs", e.direction === "out" ? "text-zinc-400" : "text-zinc-300")}>
                            {e.direction === "out" ? "→ sent" : "← received"}
                        </span>
                        <span className="ml-auto rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-xs text-zinc-500">
                            {e.transport}
                        </span>
                    </div>
                    <pre className="overflow-x-auto rounded bg-zinc-950 p-2 font-mono text-xs text-zinc-300">
                        {JSON.stringify(e.data, null, 2)}
                    </pre>
                    {e.type === "req" && (
                        <div className="mt-2 border-l-2 border-zinc-700 pl-3">
                            {!e.response && (
                                <p className="text-xs text-zinc-500">Waiting for response…</p>
                            )}
                            {e.response === "timeout" && (
                                <p className="text-xs text-red-400">Timed out</p>
                            )}
                            {e.response && e.response !== "timeout" && (
                                <>
                                    <div className="mb-1 flex items-center gap-2">
                                        <span className="font-mono text-xs text-zinc-500">{formatTime(e.response.ts)}</span>
                                        <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 font-mono text-xs text-emerald-400">res</span>
                                    </div>
                                    <pre className="overflow-x-auto rounded bg-zinc-950 p-2 font-mono text-xs text-zinc-300">
                                        {JSON.stringify(e.response.data, null, 2)}
                                    </pre>
                                </>
                            )}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

type StateViewProps = { snapshot: BridgeRegistrySnapshot };

const StateView = ({ snapshot }: StateViewProps) => {
    const transports = Object.entries(snapshot.state.transports);
    const totalMessages = transports.reduce((acc, [, t]) => acc + (t?.messageCount ?? 0), 0);

    const stateColor = snapshot.state.state === "open" ? "text-emerald-400" : "text-zinc-500";

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                    <div className="mb-1 text-xs text-zinc-500">State</div>
                    <div className={clsx("font-mono text-sm font-semibold", stateColor)}>
                        {snapshot.state.state}
                    </div>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                    <div className="mb-1 text-xs text-zinc-500">Pending</div>
                    <div className="font-mono text-sm font-semibold text-amber-400">
                        {snapshot.state.pendingCount}
                    </div>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                    <div className="mb-1 text-xs text-zinc-500">Messages</div>
                    <div className="font-mono text-sm font-semibold text-zinc-200">
                        {totalMessages}
                    </div>
                </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-zinc-800">
                <table className="w-full text-xs">
                    <thead className="bg-zinc-900 text-zinc-500">
                        <tr>
                            <th className="px-3 py-2 text-left font-medium">Transport</th>
                            <th className="px-3 py-2 text-left font-medium">Status</th>
                            <th className="px-3 py-2 text-right font-medium">Msgs</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transports.map(([name, data]) => (
                            <tr key={name} className="border-t border-zinc-800">
                                <td className="px-3 py-2 font-mono text-zinc-300">{name}</td>
                                <td className="px-3 py-2">
                                    <span className={clsx(
                                        "font-mono",
                                        data?.state === "open" ? "text-emerald-400" : "text-zinc-500",
                                    )}>
                                        {data?.state ?? "—"}
                                    </span>
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums text-zinc-400">
                                    {data?.messageCount ?? 0}
                                </td>
                            </tr>
                        ))}
                        {transports.length === 0 && (
                            <tr>
                                <td colSpan={3} className="px-3 py-4 text-center text-zinc-600">No transports</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export const InlineDevTools = () => {
    const { bridges } = useBridgeRegistryState();
    const [tab, setTab] = useState<Tab>("state");
    const [selectedId, setSelectedId] = useState<string>("");

    const snapshot = useMemo(() => {
        if (selectedId) return bridges.find(b => b.id === selectedId) ?? bridges[0] ?? null;
        return bridges[0] ?? null;
    }, [bridges, selectedId]);

    return (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950">
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
                <div className="flex items-center gap-1">
                    <span className="mr-2 text-xs font-semibold text-zinc-400">DevTools</span>
                    {(["state", "messages"] as Tab[]).map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={clsx(
                                "rounded px-3 py-1 text-xs font-medium transition-colors",
                                tab === t
                                    ? "bg-zinc-800 text-zinc-100"
                                    : "text-zinc-500 hover:text-zinc-300",
                            )}
                        >
                            {t === "state" ? "State" : "Messages"}
                        </button>
                    ))}
                </div>
                {bridges.length > 1 && (
                    <select
                        value={selectedId || bridges[0]?.id}
                        onChange={e => setSelectedId(e.target.value)}
                        className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-300"
                    >
                        {bridges.map(b => (
                            <option key={b.id} value={b.id}>
                                {b.channelName} ({b.id.slice(0, 8)})
                            </option>
                        ))}
                    </select>
                )}
            </div>

            <div className="max-h-96 overflow-y-auto p-4">
                {!snapshot && (
                    <p className="py-6 text-center text-xs text-zinc-600">No bridge registered</p>
                )}
                {snapshot && tab === "state" && <StateView snapshot={snapshot} />}
                {snapshot && tab === "messages" && <MessagesView snapshot={snapshot} />}
            </div>
        </div>
    );
};
