import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPendingStore } from "@/comm/PendingStore";

describe("PendingStore", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    it("resolves pending with correct data", async () => {
        const store = createPendingStore();
        const p = new Promise((resolve, reject) => {
            store.addPending("msg-1", { resolve, reject, timeout: 5000 });
        });
        store.resolvePending("msg-1", { ok: true });
        await expect(p).resolves.toEqual({ ok: true });
    });

    it("rejects pending on timeout", async () => {
        const store = createPendingStore();
        const p = new Promise((resolve, reject) => {
            store.addPending("msg-2", {
                resolve,
                reject,
                timeout: 100,
                timeoutError: new Error("timed out"),
            });
        });
        vi.advanceTimersByTime(150);
        await expect(p).rejects.toThrow("timed out");
    });

    it("calls onChange with pending count", () => {
        const onChange = vi.fn();
        const store = createPendingStore({ onChange });
        store.addPending("msg-3", {
            resolve: () => {},
            reject: () => {},
            timeout: 5000,
        });
        expect(onChange).toHaveBeenCalledWith(1);
        store.resolvePending("msg-3", null);
        expect(onChange).toHaveBeenCalledWith(0);
    });

    it("returns false when resolving non-existent message", () => {
        const store = createPendingStore();
        expect(store.resolvePending("nonexistent", null)).toBe(false);
    });

    it("hasPending returns correct state", () => {
        const store = createPendingStore();
        expect(store.hasPending("x")).toBe(false);
        store.addPending("x", { resolve: () => {}, reject: () => {}, timeout: 5000 });
        expect(store.hasPending("x")).toBe(true);
        store.resolvePending("x", null);
        expect(store.hasPending("x")).toBe(false);
    });

    it("clearAll rejects all pending", async () => {
        const store = createPendingStore();
        const p1 = new Promise((_, reject) => store.addPending("a", { resolve: () => {}, reject, timeout: 5000 }));
        const p2 = new Promise((_, reject) => store.addPending("b", { resolve: () => {}, reject, timeout: 5000 }));
        store.clearAll();
        await expect(p1).rejects.toThrow("cleared");
        await expect(p2).rejects.toThrow("cleared");
    });
});
