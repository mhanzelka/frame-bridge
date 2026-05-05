import Link from "next/link";
import { ArrowRight, Radio, MessageSquare, Zap } from "lucide-react";

const examples = [
    {
        href: "/examples/broadcast",
        icon: Radio,
        title: "BroadcastChannel",
        description:
            "Parent page and child iframe communicating via BroadcastChannel. Same mechanism that works across separate browser tabs — no direct window reference needed.",
        tags: ["same-origin", "cross-frame", "request/response"],
        badge: "Interactive",
    },
    {
        href: "/examples/postmessage",
        icon: MessageSquare,
        title: "postMessage",
        description:
            "Parent page and child iframe communicating via window.postMessage. Point-to-point: the parent holds a direct reference to the iframe's contentWindow.",
        tags: ["point-to-point", "cross-frame", "IframeBridgeHost"],
        badge: "Interactive",
    },
    {
        href: "/examples/messagechannel",
        icon: Zap,
        title: "MessageChannel",
        description:
            "Parent and child iframe connected via a transferred MessagePort. Lowest latency, supports zero-copy ArrayBuffer transfer. After a one-shot handshake over postMessage, traffic flows on a dedicated port pair.",
        tags: ["dedicated-port", "low-latency", "transferables"],
        badge: "Interactive",
    },
];

const ExamplesPage = () => (
    <main className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="mb-2 text-3xl font-bold text-zinc-100">Examples</h1>
        <p className="mb-12 text-zinc-400">
            Interactive demos with real iframes. Inspect message flow, connection state, and response
            timing in the always-visible DevTools panel below each example.
        </p>

        <div className="grid gap-4">
            {examples.map(({ href, icon: Icon, title, description, tags, badge }) => (
                <Link
                    key={href}
                    href={href}
                    className="group flex gap-5 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 hover:border-zinc-700 hover:bg-zinc-900 transition-colors"
                >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                        <Icon size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                            <h2 className="font-semibold text-zinc-100">{title}</h2>
                            <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400">
                                {badge}
                            </span>
                        </div>
                        <p className="mb-3 text-sm text-zinc-400">{description}</p>
                        <div className="flex flex-wrap gap-2">
                            {tags.map(t => (
                                <span
                                    key={t}
                                    className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-xs text-zinc-500"
                                >
                                    {t}
                                </span>
                            ))}
                        </div>
                    </div>
                    <ArrowRight
                        size={18}
                        className="mt-1 shrink-0 text-zinc-600 transition-transform group-hover:translate-x-1 group-hover:text-zinc-400"
                    />
                </Link>
            ))}
        </div>
    </main>
);

export default ExamplesPage;
