import { CodeBlock } from "@/shared/components/CodeBlock";
import { ApiTable } from "@/shared/components/ApiTable";
import { Note } from "@/shared/components/Note";

const SETUP = `\
// 1. Import styles once in your app entry point
import "@mhanzelka/react-frame-bridge-devtools/styles.css";

// 2. Add the panel anywhere in the component tree
import { BridgeConsoleDevTool } from "@mhanzelka/react-frame-bridge-devtools";

function App() {
    return (
        <>
            {/* your app */}
            {process.env.NODE_ENV === "development" && (
                <BridgeConsoleDevTool buttonPosition="bottom-right" />
            )}
        </>
    );
}`;

const REGISTRY = `\
import { useBridgeRegistry } from "@mhanzelka/react-frame-bridge-devtools";

// Register a manually created bridge so it appears in the debug panel
function ManualBridgeSetup() {
    const { registerBridge } = useBridgeRegistry();

    useEffect(() => {
        const bridge = createBridge({ ... });
        const unregister = registerBridge(bridge);
        return unregister;
    }, []);
}`;

const REGISTRY_STATE = `\
import { useBridgeRegistryState } from "@mhanzelka/react-frame-bridge-devtools";

function BridgeMonitor() {
    const { bridges, clear } = useBridgeRegistryState();

    return (
        <ul>
            {bridges.map(b => (
                <li key={b.id}>
                    {b.channelName} — {b.state.state}
                    <button onClick={() => clear(b.id)}>Clear log</button>
                </li>
            ))}
        </ul>
    );
}

// BridgeRegistrySnapshot shape:
// b.id            → bridge instance ID
// b.channelName   → channel name
// b.state         → BridgeStatus (same as useBridgeState())
// b.eventHistory  → BridgeObserverEvent[]`;

const devToolProps = [
    { name: "buttonPosition", type: '"top-left" | "top-right" | "bottom-left" | "bottom-right"', description: "Where to place the toggle button." },
    { name: "offset", type: "number | string | [x, y]", description: "Distance from the edge in px or CSS value." },
];

const DevToolsPage = () => (
    <div className="max-w-3xl">
        <div className="mb-2 font-mono text-sm text-zinc-500">@mhanzelka/react-frame-bridge-devtools</div>
        <h1 className="mb-2 text-3xl font-bold text-zinc-100">DevTools</h1>
        <p className="mb-4 text-zinc-400">
            A floating debug panel for React apps. Discovers all bridges registered via{" "}
            <code className="font-mono text-sm text-blue-300">BridgeProvider</code> automatically.
        </p>
        <div className="mb-10">
            <Note>
                <strong>Peer dependencies:</strong> react &ge; 19, @headlessui/react &ge; 2, @heroicons/react &ge; 2, clsx &ge; 2.
            </Note>
        </div>

        <section className="mb-12">
            <h2 className="mb-4 text-xl font-semibold text-zinc-100">Setup</h2>
            <CodeBlock code={SETUP} lang="tsx" />
        </section>

        <section className="mb-12">
            <h2 className="mb-4 text-xl font-semibold text-zinc-100">What the panel shows</h2>
            <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 p-4 font-mono text-xs">
                <div className="mb-3 text-zinc-400">Bridge Console</div>
                <div className="mb-4 border-b border-zinc-700 pb-3">
                    <div className="mb-1 flex items-center gap-2 text-zinc-300">
                        <span className="size-2 rounded-full bg-emerald-400" />
                        <span>my-channel</span>
                        <span className="ml-auto text-zinc-500">open</span>
                    </div>
                    <div className="ml-4 flex gap-4 text-zinc-500">
                        <span>broadcast-channel ✓</span>
                        <span>48 messages</span>
                        <span>0 pending</span>
                    </div>
                </div>
                <div className="space-y-1">
                    <div className="flex gap-3 text-blue-400">
                        <span className="text-zinc-600">12:03:01.442</span>
                        <span>→ ping</span>
                        <span className="text-zinc-500">{"{ value: 1 }"}</span>
                    </div>
                    <div className="flex gap-3 text-emerald-400">
                        <span className="text-zinc-600">12:03:01.451</span>
                        <span>← pong</span>
                        <span className="text-zinc-500">{"{ value: 2 }"}</span>
                    </div>
                    <div className="flex gap-3 text-blue-400">
                        <span className="text-zinc-600">12:03:08.220</span>
                        <span>→ ping</span>
                        <span className="text-zinc-500">{"{ value: 3 }"}</span>
                        <span className="ml-auto animate-spin text-zinc-500">⏳</span>
                    </div>
                </div>
            </div>
        </section>

        <section className="mb-12">
            <h2 className="mb-4 text-xl font-semibold text-zinc-100">BridgeConsoleDevTool props</h2>
            <ApiTable rows={devToolProps} />
        </section>

        <section className="mb-12">
            <h2 className="mb-4 text-xl font-semibold text-zinc-100">useBridgeRegistry()</h2>
            <p className="mb-4 text-zinc-400">
                Used internally by <code className="font-mono text-sm text-blue-300">BridgeProvider</code>.
                Use this only if you create a bridge manually and want it to appear in the debug panel.
            </p>
            <CodeBlock code={REGISTRY} lang="tsx" />
        </section>

        <section className="mb-12">
            <h2 className="mb-4 text-xl font-semibold text-zinc-100">useBridgeRegistryState()</h2>
            <p className="mb-4 text-zinc-400">
                Returns reactive registry state. Re-renders when any registered bridge changes.
                Useful for building custom monitoring UIs.
            </p>
            <CodeBlock code={REGISTRY_STATE} lang="tsx" />
        </section>
    </div>
);

export default DevToolsPage;
