import Link from "next/link";
import type { ReactNode } from "react";

const navItems = [
    { label: "Quick Start", href: "/docs" },
    { label: "frame-bridge", href: "/docs/frame-bridge", tag: "core" },
    { label: "react-frame-bridge", href: "/docs/react-frame-bridge", tag: "react" },
    { label: "devtools", href: "/docs/devtools", tag: "debug" },
];

type DocsLayoutProps = { children: ReactNode };

const DocsLayout = ({ children }: DocsLayoutProps) => (
    <div className="mx-auto flex max-w-7xl gap-12 px-6 py-10">
        <aside className="hidden w-52 shrink-0 lg:block">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                Documentation
            </p>
            <nav className="flex flex-col gap-1">
                {navItems.map(item => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className="group flex items-center justify-between rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 transition-colors"
                    >
                        {item.label}
                        {item.tag && (
                            <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500">
                                {item.tag}
                            </span>
                        )}
                    </Link>
                ))}
            </nav>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
    </div>
);

export default DocsLayout;
