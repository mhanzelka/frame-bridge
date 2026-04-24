"use client";

import React, { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

const clamp = (value: number, min: number, max: number) =>
    Math.min(Math.max(value, min), max);

export interface DevToolProps {
    toolName: string;
    buttonPosition: "top-left" | "top-right" | "bottom-left" | "bottom-right";
    offset?: number | string | (string | number)[];
    devToolHeader?: ReactNode;
    devToolContent: ReactNode;
}

export const DevTool = ({ toolName, buttonPosition, offset, devToolHeader, devToolContent }: DevToolProps) => {
    const DEFAULT_HEIGHT = 640;
    const MIN_HEIGHT = 160;
    const MAX_HEIGHT = typeof window !== "undefined" ? Math.floor(window.innerHeight * 0.95) : 900;

    const [isOpen, setIsOpen] = useState(false);
    const [panelHeight, setPanelHeight] = useState<number>(DEFAULT_HEIGHT);

    useEffect(() => {
        const saved = typeof window !== "undefined" ? window.localStorage.getItem("devtool:height") : null;
        if (saved) setPanelHeight(clamp(parseInt(saved, 10) || DEFAULT_HEIGHT, MIN_HEIGHT, MAX_HEIGHT));
    }, []);

    useEffect(() => {
        if (typeof window !== "undefined") {
            window.localStorage.setItem("devtool:height", String(panelHeight));
        }
    }, [panelHeight]);

    const onHandlePointerDown = (e: React.PointerEvent) => {
        const startY = e.clientY;
        const startHeight = panelHeight;

        const onMove = (ev: PointerEvent) => {
            const dy = ev.clientY - startY;
            const next = clamp(startHeight - dy, MIN_HEIGHT, MAX_HEIGHT);
            setPanelHeight(next);
            ev.preventDefault();
        };

        const onUp = () => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
        };

        window.addEventListener("pointermove", onMove, { passive: false });
        window.addEventListener("pointerup", onUp);
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    };

    const positionStyles = useMemo(() => {
        if (!offset) return { bottom: "1rem", right: "1rem" };

        const parseValue = (value: number | string) => (typeof value === "number" ? `${value}px` : value);
        const x = Array.isArray(offset) ? parseValue(offset[0]) : parseValue(offset);
        const y = Array.isArray(offset) ? parseValue(offset[1]) : parseValue(offset);

        switch (buttonPosition) {
            case "top-left": return { left: x, top: y };
            case "top-right": return { top: y, right: x };
            case "bottom-left": return { bottom: y, left: x };
            case "bottom-right": return { bottom: y, right: x };
            default: return { bottom: y, right: x };
        }
    }, [buttonPosition, offset]);

    return (
        <>
            {!isOpen && (
                <div className="fixed z-[9999]" style={positionStyles}>
                    <button
                        onClick={() => setIsOpen((prev) => !prev)}
                        className="border-black border-2 bg-yellow-300 text-black text-[0.6rem] size-12 text-center rounded-full m-3"
                    >
                        {toolName}
                    </button>
                </div>
            )}
            <div
                className={clsx(
                    "z-[999999] fixed flex flex-col items-center gap-1 bottom-0 w-full",
                    "bg-gradient-to-b from-gray-50 to-gray-100 p-2 transition-opacity border-t border-1 pt-3 border-gray-100",
                    isOpen ? "opacity-100" : "opacity-0"
                )}
                style={{ height: isOpen ? `${panelHeight}px` : 0 }}
            >
                <div
                    onPointerDown={onHandlePointerDown}
                    onDoubleClick={() => setPanelHeight(DEFAULT_HEIGHT)}
                    className={clsx(
                        "absolute -top-2 left-1/2 -translate-x-1/2",
                        "h-2 w-full bg-gray-400/40 hover:bg-gray-600 shadow-sm",
                        "cursor-ns-resize touch-none"
                    )}
                />
                <button className="-top-4 right-4 absolute bg-black rounded-sm" onClick={() => setIsOpen(false)}>
                    <ChevronDownIcon className="size-6 text-white" />
                </button>
                <header className="flex flex-row items-center justify-between w-full min-h-10 h-10">
                    {devToolHeader ?? <span>{toolName}</span>}
                </header>
                <div className="w-full h-[calc(100%-2rem)]">{devToolContent}</div>
            </div>
        </>
    );
};
