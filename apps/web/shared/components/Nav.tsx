import Link from "next/link";
import { Github } from "lucide-react";

export const Nav = () => (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
            <Link href="/" className="flex items-center gap-2 font-semibold text-zinc-100">
                <span className="text-blue-400">⬡</span>
                <span>frame-bridge</span>
            </Link>

            <nav className="flex items-center gap-6 text-sm text-zinc-400">
                <Link href="/docs" className="hover:text-zinc-100 transition-colors">
                    Docs
                </Link>
                <Link href="/examples" className="hover:text-zinc-100 transition-colors">
                    Examples
                </Link>
                <a
                    href="https://github.com/mhanzelka/frame-bridge"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-zinc-100 transition-colors"
                >
                    <Github size={18} />
                </a>
            </nav>
        </div>
    </header>
);
