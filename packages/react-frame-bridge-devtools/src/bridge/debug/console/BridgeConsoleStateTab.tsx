import {TransportType} from "@mhanzelka/frame-bridge/bridge/types";
import {BridgeRegistrySnapshot} from "@mhanzelka/frame-bridge/bridge/debug/types";
import {PropsWithChildren, useMemo} from "react";
import {StatusDot} from "@/StatusDot";

export type BridgeConsoleStateTabProps = {
    snapshot: BridgeRegistrySnapshot
}

type BoxProps = {
    label: string;
    value: number | string;
    tone?: "amber" | "indigo" | "slate";
    className?: string
}

const Box = ({label, value, tone = "slate", className = ""}: BoxProps) => {
    const toneMap = {
        amber: "bg-amber-50 ring-amber-200 text-amber-800",
        indigo: "bg-indigo-50 ring-indigo-200 text-indigo-800",
        slate: "bg-slate-50 ring-slate-200 text-slate-800",
    } as const;
    return (
        <div className={`rounded-xl ring-1 ${toneMap[tone]} px-3 py-2 ${className}`}>
            <div className={`text-base opacity-70`}>{label}</div>
            <div className={`text-xl font-semibold tabular-nums`}>{value}</div>
        </div>
    );
}

const stringTransportType = (type: TransportType) => {
    switch (type) {
        case `post-message-channel`:
            return "postMessage";
        case `broadcast-channel`:
            return "BroadcastChannel";
        case `message-channel`:
            return "MessageChannel";
    }
}

export const BridgeConsoleStateTab = ({snapshot}: BridgeConsoleStateTabProps) => {

    const transports = useMemo(() => Object.entries(snapshot.state.transports), [snapshot.state.transports]);

    const messageCount = useMemo(() => transports.reduce((acc, [_, data]) => {
        return acc + (data?.messageCount ?? 0);
    }, 0), [transports]);

    return (
        <section className={`rounded-2xl border border-gray-200 bg-white/90 backdrop-blur p-4 shadow-sm`}>

            <header className={`mb-3 flex items-end justify-between gap-3`}>
                <div>
                    <h2 className={`text-lg font-semibold`}>{snapshot.channelName}</h2>
                    <p className={`text-xs text-gray-500`}>{snapshot.id}</p>
                </div>
                <div className={`grid grid-cols-2 gap-x-6 gap-y-1 text-sm`}>
                    <div className={`text-gray-500`}>Opened</div>
                    <div className={`font-medium`}>-</div>
                    <div className={`text-gray-500`}>Uptime</div>
                    <div className={`font-medium tabular-nums`}>-</div>
                </div>
            </header>


            <div className={`mb-3 grid grid-cols-2 md:grid-cols-3 gap-3`}>
                <Box label="Pending" value={snapshot.state.pendingCount} tone="amber"/>
                <Box label="Messages (total)" value={messageCount} tone="indigo"/>
                <Box label="Transports" value={Object.keys(snapshot.state.transports).length} tone="slate"
                     className={`hidden md:block`}/>
            </div>

            <div className={`overflow-hidden rounded-xl border border-gray-200`}>
                <table className={`w-full text-sm`}>
                    <thead className={`bg-gray-50 text-gray-600`}>
                    <tr>
                        <Th>Transport</Th>
                        <Th>Status</Th>
                        <Th className={`text-right`}>Messages</Th>
                        <Th className={`text-right`}>Last msg</Th>
                    </tr>
                    </thead>
                    <tbody>
                    {transports.map(([name, data]) => (
                        <tr key={name} className={`border-t border-gray-200`}>
                            <Td className={``}>{stringTransportType(name as TransportType)} {snapshot.state.origin && name === `post-message-channel` ? `(${snapshot.state.origin})` : ``}</Td>
                            <Td>
                                <span className={`inline-flex items-center gap-2`}>
                                    <StatusDot
                                        status={data?.state}
                                        statusMap={{
                                            closed: `bg-red-500`,
                                            open: `bg-green-500`,
                                            disabled: `bg-gray-300`,
                                            standby: `bg-orange-500`,
                                        }}
                                        />
                                    {data?.state}
                                </span>
                            </Td>
                            <Td className={`text-right tabular-nums`}>{data?.messageCount ?? 0}</Td>
                            <Td className={`text-right text-gray-500`}>
                                {"-"}
                            </Td>
                        </tr>
                    ))}
                    {transports.length === 0 && (
                        <tr>
                            <Td colSpan={4} className={`py-6 text-center text-gray-500`}>No transports</Td>
                        </tr>
                    )}
                    </tbody>
                </table>
            </div>
        </section>
    )
}

const Th = ({children, className = ""}: PropsWithChildren<{ className?: string }>) => {
    return <th className={`px-3 py-2 text-left font-medium ${className}`}>{children}</th>;
}

const Td = ({children, className = "", colSpan}: PropsWithChildren<{ className?: string; colSpan?: number }>) => {
    return <td className={`px-3 py-2 ${className}`} colSpan={colSpan}>{children}</td>;
}