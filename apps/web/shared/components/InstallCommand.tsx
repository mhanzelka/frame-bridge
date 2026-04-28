"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { clsx } from "clsx";

type InstallCommandProps = {
    command: string;
    className?: string;
};

export const InstallCommand = ({ command, className }: InstallCommandProps) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(command);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // Clipboard API can fail in insecure contexts — fail silently.
        }
    };

    return (
        <div
            className={clsx(
                "flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 font-mono text-sm",
                className,
            )}
        >
            <span className="text-zinc-500 select-none">$</span>
            <span className="flex-1 truncate text-zinc-100">{command}</span>
            <button
                type="button"
                onClick={handleCopy}
                aria-label={copied ? "Copied" : "Copy install command"}
                className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
            >
                {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
            </button>
        </div>
    );
};
