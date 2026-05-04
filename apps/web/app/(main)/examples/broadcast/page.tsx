import { BroadcastParent } from "@/feature/broadcast-demo/components/BroadcastParent";
import { InlineDevTools } from "@/shared/components/InlineDevTools";
import { CodeBlock } from "@/shared/components/CodeBlock";
import { Note } from "@/shared/components/Note";

const SOURCE_PARENT = `\
<BridgeProvider<DemoMessage>
    open={true}
    channelName="frame-bridge-demo"
    role="parent"
    enabledTransports={["broadcast-channel"]}
>
    <ParentControls />
</BridgeProvider>`;

const SOURCE_CHILD = `\
// app/(embed)/iframe/broadcast-child/page.tsx
<BridgeProvider<DemoMessage>
    open={true}
    channelName="frame-bridge-demo"
    role="child"
    enabledTransports={["broadcast-channel"]}
>
    <ChildInner />
</BridgeProvider>`;

const BroadcastDemoPage = () => (
    <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8">
            <div className="mb-1 text-xs text-zinc-500">Examples</div>
            <h1 className="mb-2 text-2xl font-bold text-zinc-100">BroadcastChannel demo</h1>
            <p className="text-zinc-400">
                Parent page and child iframe — connected via{" "}
                <code className="font-mono text-sm text-blue-300">BroadcastChannel</code>.
                The child runs in a real iframe (separate browsing context), same as across tabs.
            </p>
        </div>

        <Note>
            The child panel is a real <code className="font-mono text-xs">{"<iframe>"}</code> at{" "}
            <code className="font-mono text-xs">/iframe/broadcast-child</code>. Send a ping from the parent
            and watch the response arrive in both logs and the DevTools below.
            <br />
            Use <strong>Open new window</strong> to spawn extra child instances and the{" "}
            <strong>target</strong> dropdown to address one specific child by its{" "}
            <code className="font-mono text-xs">bridge.id</code> — others will see the request in their
            observer but ignore it at the handler.
        </Note>

        {/* Live demo */}
        <div className="mt-6 grid h-96 gap-4 lg:grid-cols-2">
            <div className="h-full overflow-hidden rounded-xl border border-blue-900/50 bg-zinc-900 p-5">
                <BroadcastParent />
            </div>
            <iframe
                src="/iframe/broadcast-child"
                className="h-full w-full rounded-xl border border-purple-900/50"
                title="BroadcastChannel child"
            />
        </div>

        {/* Always-visible DevTools */}
        <div className="mt-6">
            <p className="mb-2 text-xs font-medium text-zinc-500">DevTools — parent bridge</p>
            <InlineDevTools />
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
                        <span className="ml-14 text-zinc-600">BroadcastChannel (cross browsing context)</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-purple-400">child iframe</span>
                        <span className="text-zinc-600">←</span>
                        <span className="text-zinc-300">onMessage receives {"{ type: 'ping', value: 1 }"}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-purple-400">child iframe</span>
                        <span className="text-zinc-600">→</span>
                        <span className="text-zinc-300">returns {"{ type: 'pong', value: 2 }"}</span>
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

export default BroadcastDemoPage;
