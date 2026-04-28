import Link from "next/link";
import { ArrowRight, Zap, GitMerge, Code2, Bug, Github } from "lucide-react";
import { CodeBlock } from "@/shared/components/CodeBlock";
import { InstallCommand } from "@/shared/components/InstallCommand";

const HERO_CODE = `\
// parent.ts
const parent = createBridge<Messages>({
    channelName: "my-channel",
    role: "parent",
    enabled: ["broadcast-channel"],
});

await parent.open();
const reply = await parent.send({ type: "ping", value: 1 });
// reply: { type: "pong", value: 2 }

// child.ts
const child = createBridge<Messages>({
    channelName: "my-channel",
    role: "child",
    enabled: ["broadcast-channel"],
});

await child.open();
child.onMessage(async (msg) => {
    if (msg.type === "ping")
        return { type: "pong", value: msg.value + 1 };
});`;

const REACT_CODE = `\
function App() {
    return (
        <BridgeProvider
            open={true}
            channelName="my-channel"
            role="parent"
            enabledTransports={["broadcast-channel"]}
        >
            <Controls />
        </BridgeProvider>
    );
}

function Controls() {
    const bridge = useBridge<Messages>();
    const state = useBridgeState();

    return (
        <button onClick={() => bridge.send({ type: "ping", value: 1 })}>
            {state.state === "open" ? "Send" : "Connecting…"}
        </button>
    );
}`;

const features = [
    {
        icon: Code2,
        title: "Type-safe by default",
        description:
            "Define your message types once. Get autocomplete and type checking on both sides of the bridge.",
    },
    {
        icon: GitMerge,
        title: "Three transports",
        description:
            "BroadcastChannel for same-origin, postMessage for cross-origin iframes, MessageChannel for high-throughput dedicated channels.",
    },
    {
        icon: Zap,
        title: "React integration",
        description:
            "BridgeProvider, useBridge, useBridgeState, and IframeBridgeHost. Drop-in hooks that follow React patterns.",
    },
    {
        icon: Bug,
        title: "Built-in DevTools",
        description:
            "Floating debug panel shows live messages, connection state, and request/response pairs with timing.",
    },
];

const transports = [
    {
        name: "broadcast-channel",
        api: "BroadcastChannel",
        when: "Same-origin tabs, iframes, popups",
        crossOrigin: false,
    },
    {
        name: "post-message-channel",
        api: "window.postMessage",
        when: "Cross-origin iframes",
        crossOrigin: true,
    },
    {
        name: "message-channel",
        api: "MessageChannel",
        when: "High-throughput dedicated channel",
        crossOrigin: true,
    },
];

const Home = () => (
    <main>
        {/* Hero */}
        <section className="border-b border-zinc-800 px-6 py-24">
            <div className="mx-auto max-w-7xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-400">
                    <span className="size-1.5 rounded-full bg-blue-400" />
                    Open source · MIT
                </div>
                <h1 className="mb-6 max-w-3xl text-5xl font-bold tracking-tight text-zinc-100">
                    Type-safe messaging between{" "}
                    <span className="text-blue-400">browser windows</span>
                </h1>
                <p className="mb-8 max-w-2xl text-lg text-zinc-400">
                    Send requests and receive responses between iframes, tabs, and popups.
                    Works with vanilla JS or React. Three transport mechanisms, one unified API.
                </p>
                <div className="mb-10 max-w-md">
                    <InstallCommand command="npm install @mhanzelka/frame-bridge" />
                </div>
                <div className="flex flex-wrap gap-3">
                    <Link
                        href="/docs"
                        className="flex items-center gap-2 rounded-lg bg-blue-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-400 transition-colors"
                    >
                        Get started <ArrowRight size={16} />
                    </Link>
                    <Link
                        href="/examples"
                        className="flex items-center gap-2 rounded-lg border border-zinc-700 px-5 py-2.5 text-sm text-zinc-300 hover:border-zinc-600 hover:text-zinc-100 transition-colors"
                    >
                        See live demo
                    </Link>
                    <a
                        href="https://github.com/mhanzelka/frame-bridge"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-lg border border-zinc-700 px-5 py-2.5 text-sm text-zinc-300 hover:border-zinc-600 hover:text-zinc-100 transition-colors"
                    >
                        <Github size={16} /> View on GitHub
                    </a>
                </div>
            </div>
        </section>

        {/* Quick start code */}
        <section className="border-b border-zinc-800 px-6 py-16">
            <div className="mx-auto max-w-7xl">
                <div className="grid gap-8 lg:grid-cols-2">
                    <div>
                        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-zinc-500">
                            Vanilla JS / TypeScript
                        </p>
                        <h2 className="mb-4 text-2xl font-bold text-zinc-100">
                            As simple as calling a function
                        </h2>
                        <p className="mb-6 text-zinc-400">
                            The bridge handles message correlation, timeouts, transport selection,
                            and error handling. You just send and receive.
                        </p>
                        <InstallCommand command="npm install @mhanzelka/frame-bridge" />
                    </div>
                    <CodeBlock code={HERO_CODE} lang="ts" />
                </div>
            </div>
        </section>

        {/* React */}
        <section className="border-b border-zinc-800 bg-zinc-900/30 px-6 py-16">
            <div className="mx-auto max-w-7xl">
                <div className="grid gap-8 lg:grid-cols-2">
                    <CodeBlock code={REACT_CODE} lang="tsx" />
                    <div>
                        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-zinc-500">
                            React
                        </p>
                        <h2 className="mb-4 text-2xl font-bold text-zinc-100">
                            First-class React integration
                        </h2>
                        <p className="mb-6 text-zinc-400">
                            Wrap your tree with{" "}
                            <code className="rounded bg-zinc-800 px-1 font-mono text-sm text-blue-300">
                                BridgeProvider
                            </code>
                            , access the bridge anywhere with{" "}
                            <code className="rounded bg-zinc-800 px-1 font-mono text-sm text-blue-300">
                                useBridge()
                            </code>
                            , subscribe to connection state with{" "}
                            <code className="rounded bg-zinc-800 px-1 font-mono text-sm text-blue-300">
                                useBridgeState()
                            </code>
                            .
                        </p>
                        <InstallCommand command="npm install @mhanzelka/react-frame-bridge" />
                    </div>
                </div>
            </div>
        </section>

        {/* Features */}
        <section className="border-b border-zinc-800 px-6 py-16">
            <div className="mx-auto max-w-7xl">
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {features.map(({ icon: Icon, title, description }) => (
                        <div
                            key={title}
                            className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5"
                        >
                            <Icon size={20} className="mb-3 text-blue-400" />
                            <h3 className="mb-2 font-semibold text-zinc-100">{title}</h3>
                            <p className="text-sm text-zinc-400">{description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        {/* Transport table */}
        <section className="border-b border-zinc-800 bg-zinc-900/30 px-6 py-16">
            <div className="mx-auto max-w-7xl">
                <h2 className="mb-2 text-2xl font-bold text-zinc-100">Choose your transport</h2>
                <p className="mb-8 text-zinc-400">
                    Enable multiple transports and the bridge picks the best available one per message.
                </p>
                <div className="overflow-x-auto rounded-xl border border-zinc-800">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-zinc-800 bg-zinc-900">
                                <th className="px-4 py-3 text-left font-medium text-zinc-400">Transport</th>
                                <th className="px-4 py-3 text-left font-medium text-zinc-400">Browser API</th>
                                <th className="px-4 py-3 text-left font-medium text-zinc-400">Best for</th>
                                <th className="px-4 py-3 text-left font-medium text-zinc-400">Cross-origin</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transports.map(t => (
                                <tr key={t.name} className="border-b border-zinc-800/50 last:border-0">
                                    <td className="px-4 py-3 font-mono text-blue-400">{t.name}</td>
                                    <td className="px-4 py-3 font-mono text-xs text-zinc-300">{t.api}</td>
                                    <td className="px-4 py-3 text-zinc-400">{t.when}</td>
                                    <td className="px-4 py-3 text-zinc-400">
                                        {t.crossOrigin ? (
                                            <span className="text-emerald-400">✓</span>
                                        ) : (
                                            <span className="text-zinc-600">Same-origin only</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>

        {/* CTA */}
        <section className="px-6 py-20 text-center">
            <div className="mx-auto max-w-xl">
                <h2 className="mb-4 text-3xl font-bold text-zinc-100">Ready to bridge the gap?</h2>
                <p className="mb-8 text-zinc-400">
                    Three packages. Zero runtime dependencies in the core. Works in any modern browser.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                    <Link
                        href="/docs"
                        className="flex items-center gap-2 rounded-lg bg-blue-500 px-6 py-3 font-medium text-white hover:bg-blue-400 transition-colors"
                    >
                        Read the docs <ArrowRight size={16} />
                    </Link>
                    <Link
                        href="/examples"
                        className="rounded-lg border border-zinc-700 px-6 py-3 font-medium text-zinc-300 hover:border-zinc-600 hover:text-zinc-100 transition-colors"
                    >
                        Live examples
                    </Link>
                    <a
                        href="https://github.com/mhanzelka/frame-bridge"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-lg border border-zinc-700 px-6 py-3 font-medium text-zinc-300 hover:border-zinc-600 hover:text-zinc-100 transition-colors"
                    >
                        <Github size={16} /> GitHub
                    </a>
                </div>
            </div>
        </section>
    </main>
);

export default Home;
