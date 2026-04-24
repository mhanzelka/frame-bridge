import { describe, it, expect } from "vitest";
import { getPrioritizedTransports } from "@/bridge/lib/transport";
import type { TransportType } from "@/bridge/types";

const all: TransportType[] = ["post-message-channel", "broadcast-channel", "message-channel"];

describe("getPrioritizedTransports", () => {
    it("returns original order when no priority", () => {
        expect(getPrioritizedTransports(all)).toEqual(all);
    });

    it("moves priority to front", () => {
        const result = getPrioritizedTransports(all, "message-channel");
        expect(result[0]).toBe("message-channel");
        expect(result).toHaveLength(3);
    });

    it("ignores priority not in list", () => {
        const subset: TransportType[] = ["post-message-channel"];
        const result = getPrioritizedTransports(subset, "broadcast-channel");
        expect(result).toEqual(subset);
    });

    it("handles single transport", () => {
        const single: TransportType[] = ["broadcast-channel"];
        expect(getPrioritizedTransports(single, "broadcast-channel")).toEqual(single);
    });
});
