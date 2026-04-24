import { describe, it, expect } from "vitest";
import { createRingBuffer } from "@/Buffers";

describe("createRingBuffer", () => {
    it("stores items up to capacity", () => {
        const rb = createRingBuffer<number>(3);
        rb.push(1);
        rb.push(2);
        rb.push(3);
        expect(rb.snapshot()).toEqual([1, 2, 3]);
    });

    it("drops oldest item when full", () => {
        const rb = createRingBuffer<number>(3);
        rb.push(1);
        rb.push(2);
        rb.push(3);
        rb.push(4);
        expect(rb.snapshot()).toEqual([2, 3, 4]);
    });

    it("returns snapshot copy, not live reference", () => {
        const rb = createRingBuffer<number>(3);
        rb.push(1);
        const snap = rb.snapshot();
        rb.push(2);
        expect(snap).toEqual([1]);
    });

    it("clears correctly", () => {
        const rb = createRingBuffer<number>(3);
        rb.push(1);
        rb.push(2);
        rb.clear();
        expect(rb.snapshot()).toEqual([]);
    });

    it("handles capacity 1", () => {
        const rb = createRingBuffer<string>(1);
        rb.push("a");
        rb.push("b");
        expect(rb.snapshot()).toEqual(["b"]);
    });
});
