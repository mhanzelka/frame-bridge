import { CodeBlock } from "@/shared/components/CodeBlock";
import { Note } from "@/shared/components/Note";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const INSTALL = `npm install @mhanzelka/frame-bridge`;
const INSTALL_REACT = `npm install @mhanzelka/react-frame-bridge @mhanzelka/frame-bridge`;
const INSTALL_DEVTOOLS = `npm install @mhanzelka/react-frame-bridge-devtools`;

const QUICKSTART_PARENT = `\
import { createBridge } from "@mhanzelka/frame-bridge";

type Messages = { type: "ping" | "pong"; value: number };

const parent = createBridge<Messages>({
    channelName: "my-channel",
    role: "parent",
    enabled: ["broadcast-channel"],
});

await parent.open();

// Send a request and wait for the response
const reply = await parent.send({ type: "ping", value: 1 });
console.log(reply); // { type: "pong", value: 2 }`;

const QUICKSTART_CHILD = `\
import { createBridge } from "@mhanzelka/frame-bridge";

type Messages = { type: "ping" | "pong"; value: number };

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

const REACT_EXAMPLE = `\
import { BridgeProvider, useBridge, useBridgeState } from "@mhanzelka/react-frame-bridge";

type Messages = { type: "ping" | "pong"; value: number };

function App() {
    return (
        <BridgeProvider<Messages>
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

    const handlePing = async () => {
        const reply = await bridge.send({ type: "ping", value: 1 });
        console.log(reply); // { type: "pong", value: 2 }
    };

    return (
        <div>
            <p>Status: {state.state}</p>
            <button onClick={handlePing} disabled={state.state !== "open"}>
                Send ping
            </button>
        </div>
    );
}`;

const DEVTOOLS_EXAMPLE = `\
import { BridgeConsoleDevTool } from "@mhanzelka/react-frame-bridge-devtools";
import "@mhanzelka/react-frame-bridge-devtools/styles.css";

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

const QuickStartPage = () => (
    <div className="prose-zinc max-w-3xl">
        <h1 className="mb-2 text-3xl font-bold text-zinc-100">Quick Start</h1>
        <p className="mb-10 text-zinc-400">
            Three packages — pick what you need. Start with the core, add React and DevTools when ready.
        </p>

        {/* Step 1 */}
        <section className="mb-12">
            <h2 className="mb-4 text-xl font-semibold text-zinc-100">
                1. Vanilla JS / TypeScript
            </h2>
            <p className="mb-4 text-zinc-400">
                Install the core package. No runtime dependencies — only browser APIs.
            </p>
            <div className="mb-4">
                <CodeBlock code={INSTALL} lang="bash" />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
                <CodeBlock code={QUICKSTART_PARENT} lang="ts" filename="parent.ts" />
                <CodeBlock code={QUICKSTART_CHILD} lang="ts" filename="child.ts" />
            </div>
            <div className="mt-4">
                <Note>
                    Both sides must use the same <code className="font-mono text-sm">channelName</code>.
                    The <code className="font-mono text-sm">role</code> determines who initiates the handshake for MessageChannel transport.
                </Note>
            </div>
        </section>

        {/* Step 2 */}
        <section className="mb-12">
            <h2 className="mb-4 text-xl font-semibold text-zinc-100">
                2. React integration
            </h2>
            <p className="mb-4 text-zinc-400">
                Wrap your tree with <code className="font-mono text-sm text-blue-300">BridgeProvider</code>.
                Access the bridge anywhere via hooks. Peer deps: React 19+.
            </p>
            <div className="mb-4">
                <CodeBlock code={INSTALL_REACT} lang="bash" />
            </div>
            <CodeBlock code={REACT_EXAMPLE} lang="tsx" />
        </section>

        {/* Step 3 */}
        <section className="mb-12">
            <h2 className="mb-4 text-xl font-semibold text-zinc-100">
                3. DevTools (optional)
            </h2>
            <p className="mb-4 text-zinc-400">
                Add a floating debug panel to your React app. Shows live messages, connection state, and request/response pairs.
            </p>
            <div className="mb-4">
                <CodeBlock code={INSTALL_DEVTOOLS} lang="bash" />
            </div>
            <CodeBlock code={DEVTOOLS_EXAMPLE} lang="tsx" />
        </section>

        <div className="flex flex-wrap gap-3 border-t border-zinc-800 pt-8">
            <Link
                href="/docs/frame-bridge"
                className="flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-600 hover:text-zinc-100 transition-colors"
            >
                frame-bridge API <ArrowRight size={14} />
            </Link>
            <Link
                href="/docs/react-frame-bridge"
                className="flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-600 hover:text-zinc-100 transition-colors"
            >
                react-frame-bridge API <ArrowRight size={14} />
            </Link>
            <Link
                href="/examples"
                className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-400 transition-colors"
            >
                See live demo <ArrowRight size={14} />
            </Link>
        </div>
    </div>
);

export default QuickStartPage;
