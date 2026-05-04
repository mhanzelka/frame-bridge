import { describe, it, expect } from "vitest";
import {
    generateMessageId,
    makeRequestMessage,
    makeResponseMessage,
    makeEventMessage,
    isBridgeMessage,
    isBridgeRequestMessage,
    isBridgeResponseMessage,
    isBridgeEventMessage,
    getBridgeMessageType,
} from "@/bridge/messages";

const CHANNEL = "test-channel";
const SOURCE = "src-1";

describe("generateMessageId", () => {
    it("produces correct prefix", () => {
        expect(generateMessageId("req")).toMatch(/^req:/);
        expect(generateMessageId("res")).toMatch(/^res:/);
        expect(generateMessageId("evt")).toMatch(/^evt:/);
    });

    it("produces unique IDs", () => {
        const ids = new Set(Array.from({ length: 100 }, () => generateMessageId("req")));
        expect(ids.size).toBe(100);
    });
});

describe("makeRequestMessage", () => {
    it("sets correct fields", () => {
        const msg = makeRequestMessage(SOURCE, "app", CHANNEL, { type: "ping" });
        expect(msg.channelName).toBe(CHANNEL);
        expect(msg.sourceId).toBe(SOURCE);
        expect(msg.domain).toBe("app");
        expect(msg.msgId).toMatch(/^req:/);
        expect(msg.data).toEqual({ type: "ping" });
        expect(msg.bridgeVersion).toBe("test");
    });
});

describe("makeResponseMessage", () => {
    it("links responseTo the request", () => {
        const req = makeRequestMessage(SOURCE, "app", CHANNEL, {});
        const res = makeResponseMessage(SOURCE, "app", CHANNEL, { ok: true }, req.msgId, req.sourceId);
        expect(res.responseTo).toBe(req.msgId);
        expect(res.msgId).toMatch(/^res:/);
    });

    it("addresses the response to the original requester via targetId", () => {
        const req = makeRequestMessage("requester-id", "app", CHANNEL, {});
        const res = makeResponseMessage(SOURCE, "app", CHANNEL, {}, req.msgId, req.sourceId);
        expect(res.targetId).toBe("requester-id");
    });
});

describe("makeEventMessage", () => {
    it("uses evt prefix", () => {
        const evt = makeEventMessage(SOURCE, "app", CHANNEL, { action: "click" });
        expect(evt.msgId).toMatch(/^evt:/);
    });
});

describe("isBridgeMessage", () => {
    it("accepts valid bridge messages", () => {
        const msg = makeRequestMessage(SOURCE, "app", CHANNEL, {});
        expect(isBridgeMessage(msg, CHANNEL)).toBe(true);
    });

    it("rejects wrong channel", () => {
        const msg = makeRequestMessage(SOURCE, "app", CHANNEL, {});
        expect(isBridgeMessage(msg, "other-channel")).toBe(false);
    });

    it("rejects non-objects", () => {
        expect(isBridgeMessage(null, CHANNEL)).toBe(false);
        expect(isBridgeMessage("string", CHANNEL)).toBe(false);
        expect(isBridgeMessage(42, CHANNEL)).toBe(false);
    });
});

describe("type guards", () => {
    it("isBridgeRequestMessage", () => {
        const req = makeRequestMessage(SOURCE, "app", CHANNEL, {});
        expect(isBridgeRequestMessage(req, CHANNEL)).toBe(true);
        expect(isBridgeResponseMessage(req, CHANNEL)).toBe(false);
        expect(isBridgeEventMessage(req, CHANNEL)).toBe(false);
    });

    it("isBridgeResponseMessage", () => {
        const res = makeResponseMessage(SOURCE, "app", CHANNEL, {}, "req:abc:123", "requester");
        expect(isBridgeResponseMessage(res, CHANNEL)).toBe(true);
    });

    it("isBridgeEventMessage", () => {
        const evt = makeEventMessage(SOURCE, "app", CHANNEL, {});
        expect(isBridgeEventMessage(evt, CHANNEL)).toBe(true);
    });
});

describe("getBridgeMessageType", () => {
    it("returns correct type for each prefix", () => {
        expect(getBridgeMessageType(makeRequestMessage(SOURCE, "app", CHANNEL, {}))).toBe("req");
        expect(getBridgeMessageType(makeResponseMessage(SOURCE, "app", CHANNEL, {}, "req:x:1", "requester"))).toBe("res");
        expect(getBridgeMessageType(makeEventMessage(SOURCE, "app", CHANNEL, {}))).toBe("evt");
    });

    it("throws for unknown prefix", () => {
        const msg = makeRequestMessage(SOURCE, "app", CHANNEL, {});
        const corrupted = { ...msg, msgId: "unknown:xyz" };
        expect(() => getBridgeMessageType(corrupted)).toThrow();
    });
});
