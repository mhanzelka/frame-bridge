import { CodeBlock } from "@/shared/components/CodeBlock";
import { ApiTable } from "@/shared/components/ApiTable";
import { Note } from "@/shared/components/Note";

const CREATE_BRIDGE = `\
import { createBridge } from "@mhanzelka/frame-bridge";

type AppMessage =
    | { type: "ping"; value: number }
    | { type: "pong"; value: number };

const bridge = createBridge<AppMessage>({
    channelName: "my-channel",
    role: "parent",
    enabled: ["broadcast-channel"],
});

await bridge.open();`;

const SEND_OPTIONS = `\
const reply = await bridge.send(data, {
    timeout: 5000,                         // ms — throws if no reply (default: 10 000)
    signal: abortController.signal,        // AbortSignal to cancel
    transfer: [arrayBuffer],               // Transferable objects
    preferredTransport: "message-channel", // hint which transport to use
});`;

const EVENTS = `\
// Fire-and-forget — no reply expected
bridge.sendEvent({ type: "user-activity", timestamp: Date.now() });

// Register handler for incoming messages
const unsubscribe = bridge.onMessage(async (msg, source) => {
    if (msg.type === "ping") return { type: "pong", value: msg.value + 1 };
});

// Remove handler later
unsubscribe();`;

const CROSS_ORIGIN = `\
// parent.ts — host page
const parent = createBridge({
    channelName: "iframe-channel",
    enabled: ["post-message-channel"],
    role: "parent",
    targetOrigin: "https://child.example.com",
    target: iframeElement.contentWindow,
});

await parent.open();

// child.ts — inside the iframe at child.example.com
const child = createBridge({
    channelName: "iframe-channel",
    enabled: ["post-message-channel"],
    role: "child",
    targetOrigin: "https://parent.example.com",
    // target auto-detected from window.parent
});

await child.open();
child.onMessage(async (msg) => ({ ...msg, received: true }));`;

const DEBUG = `\
import { enableBridgeDebug, disableBridgeDebug } from "@mhanzelka/frame-bridge";

enableBridgeDebug();   // prints all bridge activity to console
disableBridgeDebug();  // silence (default)`;

const WAIT_FOR_READY = `\
const bridge = createBridge({
    channelName: "iframe-channel",
    enabled: ["post-message-channel"],
    role: "parent",
    targetOrigin: "https://child.example.com",
    target: iframeElement.contentWindow,
});

await bridge.open();

// Wait until the child bridge answers a sys ping before sending the first request.
// Defaults: timeoutMs = 5000, intervalMs = 200.
await bridge.waitForReady({ timeoutMs: 5000 });
await bridge.send({ type: "init", config });`;

const POPUP = `\
import { openBridgeWindow } from "@mhanzelka/frame-bridge/bridge/BridgeUtils";

await openBridgeWindow({
    url: "/popup",
    name: "my-popup",
    onMessage: async (msg) => ({ ...msg, handled: true }),
    onBridgeReady: async (bridge) => {
        await bridge.send({ type: "init" });
    },
});`;

const createBridgeParams = [
    { name: "channelName", type: "string", description: "Must match on both sides." },
    { name: "role", type: '"parent" | "child"', description: "Each side picks a role. For MessageChannel, parent initiates." },
    { name: "enabled", type: "TransportType[]", description: 'Which transports to use: "broadcast-channel", "post-message-channel", "message-channel".' },
    { name: "targetOrigin", type: "string", description: 'Required for "post-message-channel". Use "same-origin" for same-origin targets.' },
    { name: "target", type: "Window?", description: 'Target window for "post-message-channel". Optional in child contexts — auto-detects window.parent (iframe) or window.opener (popup). Parent contexts pass it explicitly (or via setTarget when the iframe mounts).' },
    { name: "prefix", type: "string", description: "Optional prefix for the generated bridge ID." },
    { name: "options.resolveMessageKey", type: "(msg) => string", description: "Custom key used in timeout error messages." },
];

const bridgeMethods = [
    { name: "open()", type: "Promise<void>", description: "Open all enabled transports." },
    { name: "close()", type: "void", description: "Close all transports, reject pending requests." },
    { name: "send(data, options?)", type: "Promise<T>", description: "Send a request and await the response." },
    { name: "sendEvent(data)", type: "void", description: "Fire-and-forget — no response expected." },
    { name: "onMessage(handler)", type: "() => void", description: "Register incoming message handler. Returns unsubscribe function." },
    { name: "isOpen()", type: "boolean", description: "True if at least one transport is open." },
    { name: "active()", type: "BridgeActiveTransports", description: "Lists currently enabled and open transports." },
    { name: "waitForReady(options?)", type: "Promise<void>", description: "Polls the peer with a sys ping until it answers (or the deadline expires). Use after open() to gate the first send so it doesn't hit a not-yet-mounted child." },
    { name: "enable(type)", type: "Promise<void>", description: "Enable a transport at runtime." },
    { name: "disable(type)", type: "void", description: "Disable a transport at runtime." },
    { name: "setTarget(win, origin)", type: "void", description: "Update the postMessage target window and origin." },
    { name: "addMessageObserver(fn)", type: "() => void", description: 'Subscribe to all sent/received messages for debugging. Each event carries direction: "in" | "out" and the transportType.' },
    { name: "state", type: "BridgeStateStore", description: "Reactive state store, compatible with useSyncExternalStore." },
];

const FrameBridgePage = () => (
    <div className="max-w-3xl">
        <div className="mb-2 font-mono text-sm text-zinc-500">@mhanzelka/frame-bridge</div>
        <h1 className="mb-2 text-3xl font-bold text-zinc-100">frame-bridge</h1>
        <p className="mb-10 text-zinc-400">
            Core library. Works in any JS/TS project. No runtime dependencies — only browser APIs.
        </p>

        <section className="mb-12">
            <h2 className="mb-4 text-xl font-semibold text-zinc-100">createBridge&lt;T&gt;(options)</h2>
            <p className="mb-4 text-zinc-400">
                Creates a bridge instance. The generic <code className="font-mono text-sm text-blue-300">T</code> defines
                the message type — it's enforced on both <code className="font-mono text-sm">send()</code> and <code className="font-mono text-sm">onMessage()</code>.
            </p>
            <div className="mb-6">
                <CodeBlock code={CREATE_BRIDGE} lang="ts" />
            </div>
            <ApiTable rows={createBridgeParams} />
        </section>

        <section className="mb-12">
            <h2 className="mb-4 text-xl font-semibold text-zinc-100">Bridge&lt;T&gt; methods</h2>
            <ApiTable rows={bridgeMethods} />
        </section>

        <section className="mb-12">
            <h2 className="mb-4 text-xl font-semibold text-zinc-100">Send options</h2>
            <CodeBlock code={SEND_OPTIONS} lang="ts" />
        </section>

        <section className="mb-12">
            <h2 className="mb-4 text-xl font-semibold text-zinc-100">Events and handlers</h2>
            <CodeBlock code={EVENTS} lang="ts" />
        </section>

        <section className="mb-12">
            <h2 className="mb-4 text-xl font-semibold text-zinc-100">Cross-origin iframe</h2>
            <p className="mb-4 text-zinc-400">
                Use <code className="font-mono text-sm text-blue-300">post-message-channel</code> for cross-origin targets.
                Both sides must specify each other's origin.
            </p>
            <CodeBlock code={CROSS_ORIGIN} lang="ts" />
            <div className="mt-4">
                <Note type="warning">
                    Never use <code className="font-mono text-sm">targetOrigin: "*"</code> in production — it skips origin validation on receive.
                </Note>
            </div>
        </section>

        <section className="mb-12">
            <h2 className="mb-4 text-xl font-semibold text-zinc-100">Waiting for the peer</h2>
            <p className="mb-4 text-zinc-400">
                Use <code className="font-mono text-sm text-blue-300">waitForReady()</code> after{" "}
                <code className="font-mono text-sm">open()</code> to gate the first send. It polls the other
                side with a system ping until it answers — useful when the iframe loads before the child bridge mounts.
            </p>
            <CodeBlock code={WAIT_FOR_READY} lang="ts" />
        </section>

        <section className="mb-12">
            <h2 className="mb-4 text-xl font-semibold text-zinc-100">Popup windows</h2>
            <CodeBlock code={POPUP} lang="ts" />
        </section>

        <section className="mb-12">
            <h2 className="mb-4 text-xl font-semibold text-zinc-100">Debug logging</h2>
            <CodeBlock code={DEBUG} lang="ts" />
        </section>
    </div>
);

export default FrameBridgePage;
