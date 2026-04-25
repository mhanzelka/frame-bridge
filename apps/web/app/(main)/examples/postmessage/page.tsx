import { PostMessageDemo } from "@/feature/postmessage-demo/components/PostMessageDemo";
import { CodeBlock } from "@/shared/components/CodeBlock";
import { Note } from "@/shared/components/Note";

const SOURCE_PARENT = `\
<BridgeProvider<DemoMessage>
    open={true}
    channelName="frame-bridge-demo-pm"
    role="parent"
    enabledTransports={["post-message-channel"]}
    targetOrigin={window.location.origin}
>
    <ParentControls />
    <IframeBridgeHost
        src="/iframe/postmessage-child"
        targetOrigin={window.location.origin}
    />
</BridgeProvider>`;

const SOURCE_CHILD = `\
// app/(embed)/iframe/postmessage-child/page.tsx
<BridgeProvider<DemoMessage>
    open={true}
    channelName="frame-bridge-demo-pm"
    role="child"
    enabledTransports={["post-message-channel"]}
    targetOrigin={window.location.origin}
>
    <ChildInner targetOrigin={window.location.origin} />
</BridgeProvider>

// Inside ChildInner:
useEffect(() => {
    bridge.setTarget(window.parent, targetOrigin);
}, [bridge, targetOrigin]);`;

const PostMessageDemoPage = () => (
    <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8">
            <div className="mb-1 text-xs text-zinc-500">Examples</div>
            <h1 className="mb-2 text-2xl font-bold text-zinc-100">postMessage demo</h1>
            <p className="text-zinc-400">
                Parent page and child iframe — connected via{" "}
                <code className="font-mono text-sm text-blue-300">window.postMessage</code>.{" "}
                <code className="font-mono text-sm text-blue-300">IframeBridgeHost</code> wires
                up the iframe ref so the bridge knows exactly where to send messages.
            </p>
        </div>

        <Note>
            Unlike BroadcastChannel, postMessage is point-to-point — the parent holds a direct
            reference to the iframe&apos;s{" "}
            <code className="font-mono text-xs">contentWindow</code>. The child connects back via{" "}
            <code className="font-mono text-xs">window.parent</code>.
        </Note>

        <div className="mt-6">
            <PostMessageDemo />
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
                        <span className="text-zinc-300">bridge.send({"{ type: 'ping', value: 1 }"})</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="ml-14 text-zinc-600">window.postMessage → iframe.contentWindow</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-purple-400">child iframe</span>
                        <span className="text-zinc-600">←</span>
                        <span className="text-zinc-300">onMessage receives {"{ type: 'ping', value: 1 }"}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-purple-400">child iframe</span>
                        <span className="text-zinc-600">→</span>
                        <span className="text-zinc-300">window.parent.postMessage {"{ type: 'pong', value: 2 }"}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-blue-400">parent</span>
                        <span className="text-zinc-600">←</span>
                        <span className="text-zinc-300">await resolves with {"{ type: 'pong', value: 2 }"}</span>
                    </div>
                </div>
            </div>
        </section>
    </main>
);

export default PostMessageDemoPage;
