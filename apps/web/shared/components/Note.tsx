import { Info, AlertTriangle } from "lucide-react";
import { clsx } from "clsx";
import type { ReactNode } from "react";

type NoteProps = {
    type?: "info" | "warning";
    children: ReactNode;
};

export const Note = ({ type = "info", children }: NoteProps) => (
    <div
        className={clsx(
            "flex gap-3 rounded-xl border px-4 py-3 text-sm",
            type === "info" && "border-blue-800/50 bg-blue-950/30 text-blue-200",
            type === "warning" && "border-amber-800/50 bg-amber-950/30 text-amber-200",
        )}
    >
        <span className="mt-0.5 shrink-0">
            {type === "info" ? <Info size={16} /> : <AlertTriangle size={16} />}
        </span>
        <div>{children}</div>
    </div>
);
