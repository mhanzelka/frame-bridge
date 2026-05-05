import { MessageChannelDemo } from "@/feature/messagechannel-demo/components/MessageChannelDemo";
import { CodeBlock } from "@/shared/components/CodeBlock";
import { Note } from "@/shared/components/Note";

const SOURCE_PARENT = `\
<BridgeProvider<DemoMessage>
    open={true}
    channelName="frame-bridge-demo-mc"
    role="parent"
    // post-message-channel is the one-shot courier that delivers port2.
    enabledTransports={["message-channel", "post-message-channel"]}
    targetOrigin={window.location.origin}
>
    <ParentControls />
    <IframeBridgeHost
        src="/iframe/messagechannel-child"
        targetOrigin={window.location.origin}
    />
</BridgeProvider>`;

const SOURCE_CHILD = `\
// app/(embed)/iframe/messagechannel-child/page.tsx
<BridgeProvider<DemoMessage>
    open={true}
    channelName="frame-bridge-demo-mc"
    role="child"
    enabledTransports={["message-channel", "post-message-channel"]}
    targetOrigin={window.location.origin}
>
    <ChildInner targetOrigin={window.location.origin} />
</BridgeProvider>

// Inside ChildInner:
useEffect(() => {
    bridge.setTarget(window.parent, targetOrigin);
}, [bridge, targetOrigin]);`;

const SOURCE_TRANSFER = `\
const buf = new Uint8Array(1024);
buf[0] = 42;

// The buffer is *transferred*, not copied — buf.buffer.byteLength becomes 0
// on the sender after this call resolves. Only message-channel can do this.
const ack = await bridge.send(
    { type: "buffer", bytes: buf.buffer, size: 1024 },
    { transfer: [buf.buffer] }
);

console.log(buf.buffer.byteLength); // 0 — detached
console.log(ack);                   // { type: "buffer-ack", size: 1024, firstByte: 42 }`;

const MessageChannelDemoPage = () => (
    <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8">
            <div className="mb-1 text-xs text-zinc-500">Examples</div>
            <h1 className="mb-2 text-2xl font-bold text-zinc-100">MessageChannel demo</h1>
            <p className="text-zinc-400">
                Parent page and child iframe — connected via a transferred{" "}
                <code className="font-mono text-sm text-blue-300">MessagePort</code>. After a
                one-shot handshake over <code className="font-mono text-sm">postMessage</code>,
                traffic flows directly between the two ports — the lowest-latency option, and
                the only one that supports zero-copy{" "}
                <code className="font-mono text-sm">Transferable</code> payloads.
            </p>
        </div>

        <Note>
            The parent transfers <code className="font-mono text-xs">port2</code> to the child
            over a one-shot <code className="font-mono text-xs">postMessage</code> handshake.
            On the <strong>child</strong>, <code className="font-mono text-xs">post-message-channel</code>{" "}
            must be listed in <code className="font-mono text-xs">enabledTransports</code> — that
            registers the <code className="font-mono text-xs">window.message</code> listener
            which receives the transferred port. On the <strong>parent</strong> it&apos;s
            optional: the bridge auto-bootstraps <code className="font-mono text-xs">post-message-channel</code>{" "}
            for the duration of the handshake and tears it down afterwards if it wasn&apos;t
            otherwise enabled. The demo lists both transports on both sides for symmetry. Once
            the handshake finishes, the dedicated port carries all subsequent traffic — watch
            the <code className="font-mono text-xs">message-channel</code> badge light up in the
            parent header.
        </Note>

        <div className="mt-6">
            <MessageChannelDemo />
        </div>

        {/* How it works */}
        <section className="mt-12">
            <h2 className="mb-4 text-lg font-semibold text-zinc-100">How it works</h2>
            <div className="grid gap-4 lg:grid-cols-2">
                <div>
                    <p className="mb-2 text-xs font-medium text-zinc-500">Parent setup</p>
                    <CodeBlock code={SOURCE_PARENT} lang="tsx" />
                </div>
                <div>
                    <p className="mb-2 text-xs font-medium text-zinc-500">Child setup (iframe page)</p>
                    <CodeBlock code={SOURCE_CHILD} lang="tsx" />
                </div>
            </div>
            <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 font-mono text-sm">
                <p className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-500">Message flow</p>
                <div className="space-y-2 text-zinc-400">
                    <div className="flex items-center gap-3">
                        <span className="text-blue-400">parent</span>
                        <span className="text-zinc-600">→</span>
                        <span className="text-zinc-300">opens post-message-channel, waits for child sys-ping</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-blue-400">parent</span>
                        <span className="text-zinc-600">→</span>
                        <span className="text-zinc-300">new MessageChannel(); transfers port2 via post-message handshake</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-purple-400">child iframe</span>
                        <span className="text-zinc-600">←</span>
                        <span className="text-zinc-300">receives port2, opens message-channel transport</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="ml-14 text-zinc-600">— from now on, traffic flows on the dedicated MessagePort —</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-blue-400">parent</span>
                        <span className="text-zinc-600">→</span>
                        <span className="text-zinc-300">bridge.send({"{ type: 'ping', value: 1 }"})</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-purple-400">child iframe</span>
                        <span className="text-zinc-600">←</span>
                        <span className="text-zinc-300">port.onmessage receives {"{ type: 'ping', value: 1 }"}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-blue-400">parent</span>
                        <span className="text-zinc-600">←</span>
                        <span className="text-zinc-300">await resolves with {"{ type: 'pong', value: 2 }"}</span>
                    </div>
                </div>
            </div>
        </section>

        {/* Transferable payloads */}
        <section className="mt-12">
            <h2 className="mb-4 text-lg font-semibold text-zinc-100">Transferable payloads</h2>
            <p className="mb-4 text-zinc-400">
                <code className="font-mono text-sm text-blue-300">message-channel</code> is the
                only transport that supports the{" "}
                <code className="font-mono text-sm">transfer</code> option of{" "}
                <code className="font-mono text-sm">bridge.send()</code>. The underlying{" "}
                <code className="font-mono text-sm">MessagePort.postMessage</code> takes a list of{" "}
                <code className="font-mono text-sm">Transferable</code> objects (e.g.{" "}
                <code className="font-mono text-sm">ArrayBuffer</code>,{" "}
                <code className="font-mono text-sm">ImageBitmap</code>,{" "}
                <code className="font-mono text-sm">OffscreenCanvas</code>) and hands ownership to
                the receiver — no clone, no copy.{" "}
                <code className="font-mono text-sm">BroadcastChannel</code> can't do this; calling{" "}
                <code className="font-mono text-sm">postMessage</code> with a transfer list throws.
            </p>
            <CodeBlock code={SOURCE_TRANSFER} lang="ts" />
            <p className="mt-4 text-sm text-zinc-500">
                Try <strong>Send buffer (1024 B)</strong> in the demo above — the log entry
                confirms the parent's <code className="font-mono text-xs">ArrayBuffer.byteLength</code>{" "}
                drops to <code className="font-mono text-xs">0</code> after the call, proving the
                transfer was zero-copy.
            </p>
        </section>
    </main>
);

export default MessageChannelDemoPage;
