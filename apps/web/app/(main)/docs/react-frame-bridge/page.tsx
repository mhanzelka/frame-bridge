import { CodeBlock } from "@/shared/components/CodeBlock";
import { ApiTable } from "@/shared/components/ApiTable";
import { Note } from "@/shared/components/Note";

const PROVIDER_EXAMPLE = `\
import { BridgeProvider, IframeBridgeHost, useBridge } from "@mhanzelka/react-frame-bridge";

type Messages = { type: "ping" | "pong"; value: number };

// Parent page
function Parent() {
    return (
        <BridgeProvider<Messages>
            open={true}
            channelName="my-channel"
            role="parent"
            targetOrigin="https://child.example.com"
            enabledTransports={["post-message-channel"]}
        >
            <IframeBridgeHost
                src="https://child.example.com/app"
                targetOrigin="https://child.example.com"
                style={{ width: "100%", height: 500 }}
            />
            <Controls />
        </BridgeProvider>
    );
}

// Child iframe at child.example.com
function Child() {
    return (
        <BridgeProvider<Messages>
            open={true}
            channelName="my-channel"
            role="child"
            targetOrigin="https://parent.example.com"
            enabledTransports={["post-message-channel"]}
        >
            <Handler />
        </BridgeProvider>
    );
}`;

const USE_BRIDGE = `\
function Controls() {
    const bridge = useBridge<Messages>();

    const ping = async () => {
        const reply = await bridge.send({ type: "ping", value: 1 });
        console.log(reply); // { type: "pong", value: 2 }
    };

    return <button onClick={ping}>Ping</button>;
}`;

const USE_BRIDGE_STATE = `\
function StatusBar() {
    const state = useBridgeState();

    return (
        <div>
            {state.state === "open" && <span>● Connected</span>}
            {state.state === "closed" && <span>● Disconnected</span>}
            <span>Pending: {state.pendingCount}</span>
        </div>
    );
}

// state shape:
// state.state          → "open" | "closed" | "partially-open"
// state.pendingCount   → number of unanswered requests
// state.transports     → { [type]: { state, messageCount } }`;

const USE_BRIDGE_WINDOW = `\
import { useBridgeWindow } from "@mhanzelka/react-frame-bridge";

function OpenPopupButton() {
    const { open } = useBridgeWindow<Messages>({
        onMessage: async (msg) => ({ ...msg, handled: true }),
        onBridgeReady: async (bridge) => {
            await bridge.send({ type: "init" });
        },
    });

    return (
        <button onClick={() => open({ url: "/popup", name: "settings" })}>
            Open Settings
        </button>
    );
}`;

const ON_MESSAGE = `\
function Handler() {
    const bridge = useBridge<Messages>();

    useEffect(() => {
        return bridge.onMessage(async (msg) => {
            if (msg.type === "ping")
                return { type: "pong", value: msg.value + 1 };
        });
    }, [bridge]);

    return null;
}`;

const providerProps = [
    { name: "open", type: "boolean", description: "Set to false to keep the bridge closed." },
    { name: "channelName", type: "string", description: "Must match on both sides." },
    { name: "role", type: '"parent" | "child"', description: "Role of this side." },
    { name: "enabledTransports", type: "TransportType[]", default: '["post-message-channel"]', description: "Which transports to use." },
    { name: "targetOrigin", type: "string", description: 'Required for "post-message-channel".' },
    { name: "prefix", type: "string", description: "Optional prefix for the bridge ID." },
    { name: "options.observer", type: "(event) => void", description: 'Called for every message sent/received. Event carries direction: "in" | "out" and transportType for filtering/logging.' },
    { name: "bridgeOptions", type: "CreateBridgeOptions", description: "Advanced options passed to createBridge." },
];

const iframeBridgeHostProps = [
    { name: "src", type: "string", description: "iframe URL." },
    { name: "targetOrigin", type: "string", description: "Origin to use for postMessage." },
    { name: "onChildReady", type: "(bridge: Bridge<T>) => void", description: "Fires after the iframe onLoad event AND the child bridge answers a sys ping. Use to send init payloads safely." },
    { name: "onChildReadyError", type: "(error: Error) => void", description: "Fires when waitForReady rejects (timeout, transport error). onChildReady will not fire." },
    { name: "readyTimeoutMs", type: "number", description: "Override Bridge.waitForReady() default timeout (5000ms)." },
    { name: "...rest", type: "IframeHTMLAttributes", description: "All standard iframe attributes." },
];

const IFRAME_HOST_READY = `\
<IframeBridgeHost
    src="https://child.example.com/app"
    targetOrigin="https://child.example.com"
    readyTimeoutMs={3000}
    onChildReady={(bridge) => bridge.send({ type: "init", config })}
    onChildReadyError={(err) => console.warn("child failed to come up", err)}
/>`;

const ReactFrameBridgePage = () => (
    <div className="max-w-3xl">
        <div className="mb-2 font-mono text-sm text-zinc-500">@mhanzelka/react-frame-bridge</div>
        <h1 className="mb-2 text-3xl font-bold text-zinc-100">react-frame-bridge</h1>
        <p className="mb-4 text-zinc-400">
            React provider and hooks. Manages bridge lifecycle — opens on mount, closes on unmount.
        </p>
        <div className="mb-10">
            <Note>
                <strong>Peer dependencies:</strong> react &ge; 19.0.0, react-dom &ge; 19.0.0,{" "}
                @mhanzelka/frame-bridge (installed separately).
            </Note>
        </div>

        <section className="mb-12">
            <h2 className="mb-4 text-xl font-semibold text-zinc-100">BridgeProvider</h2>
            <p className="mb-4 text-zinc-400">
                Creates and owns the bridge instance. The bridge is created once on mount — changes to
                <code className="ml-1 font-mono text-sm text-blue-300">channelName</code>,{" "}
                <code className="font-mono text-sm text-blue-300">role</code>, or{" "}
                <code className="font-mono text-sm text-blue-300">enabledTransports</code> after mount are ignored.
                Remount the provider to apply new configuration.
            </p>
            <div className="mb-6">
                <CodeBlock code={PROVIDER_EXAMPLE} lang="tsx" />
            </div>
            <ApiTable rows={providerProps} />
        </section>

        <section className="mb-12">
            <h2 className="mb-4 text-xl font-semibold text-zinc-100">useBridge&lt;T&gt;()</h2>
            <p className="mb-4 text-zinc-400">
                Returns the Bridge instance from the nearest BridgeProvider. Throws if used outside a provider.
            </p>
            <CodeBlock code={USE_BRIDGE} lang="tsx" />
        </section>

        <section className="mb-12">
            <h2 className="mb-4 text-xl font-semibold text-zinc-100">Handling incoming messages</h2>
            <p className="mb-4 text-zinc-400">
                Use <code className="font-mono text-sm text-blue-300">bridge.onMessage()</code> inside a{" "}
                <code className="font-mono text-sm">useEffect</code>. The return value is the unsubscribe function.
            </p>
            <CodeBlock code={ON_MESSAGE} lang="tsx" />
        </section>

        <section className="mb-12">
            <h2 className="mb-4 text-xl font-semibold text-zinc-100">useBridgeState()</h2>
            <p className="mb-4 text-zinc-400">
                Subscribes to bridge state changes via{" "}
                <code className="font-mono text-sm">useSyncExternalStore</code>. Re-renders on every state update.
            </p>
            <CodeBlock code={USE_BRIDGE_STATE} lang="tsx" />
        </section>

        <section className="mb-12">
            <h2 className="mb-4 text-xl font-semibold text-zinc-100">IframeBridgeHost</h2>
            <p className="mb-4 text-zinc-400">
                Drop-in <code className="font-mono text-sm">&lt;iframe&gt;</code> wrapper that automatically
                sets <code className="font-mono text-sm">contentWindow</code> as the postMessage target on the parent bridge.
            </p>
            <ApiTable rows={iframeBridgeHostProps} />
            <p className="mt-6 mb-4 text-zinc-400">
                Use <code className="font-mono text-sm text-blue-300">onChildReady</code> to send the first message only once the
                child bridge has confirmed it is alive — prevents lost init payloads when the iframe loads before the child mounts.
            </p>
            <CodeBlock code={IFRAME_HOST_READY} lang="tsx" />
        </section>

        <section className="mb-12">
            <h2 className="mb-4 text-xl font-semibold text-zinc-100">useBridgeWindow&lt;T&gt;()</h2>
            <p className="mb-4 text-zinc-400">
                Opens a popup window with a bridge connection. Tears down the bridge when the popup closes.
            </p>
            <CodeBlock code={USE_BRIDGE_WINDOW} lang="tsx" />
        </section>
    </div>
);

export default ReactFrameBridgePage;
