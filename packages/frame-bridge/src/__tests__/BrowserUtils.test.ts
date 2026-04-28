import { describe, it, expect } from "vitest";
import { detectChildTarget } from "@/BrowserUtils";

describe("detectChildTarget", () => {
    it("returns parent when window.parent !== window", () => {
        const fakeParent = {} as Window;
        const fakeWin = { parent: fakeParent, opener: null } as unknown as Window;
        expect(detectChildTarget(fakeWin)).toBe(fakeParent);
    });

    it("returns opener when there is no parent (top-level popup)", () => {
        const fakeOpener = {} as Window;
        const fakeWin = {
            parent: undefined,
            opener: fakeOpener
        } as unknown as Window;
        expect(detectChildTarget(fakeWin)).toBe(fakeOpener);
    });

    it("prefers parent over opener when both exist", () => {
        const fakeParent = { tag: "parent" } as unknown as Window;
        const fakeOpener = { tag: "opener" } as unknown as Window;
        const fakeWin = {
            parent: fakeParent,
            opener: fakeOpener
        } as unknown as Window;
        expect(detectChildTarget(fakeWin)).toBe(fakeParent);
    });

    it("returns null on a top-level page (parent === self, no opener)", () => {
        const fakeWin = { opener: null } as unknown as Window;
        (fakeWin as any).parent = fakeWin;
        expect(detectChildTarget(fakeWin)).toBeNull();
    });

    it("returns null and swallows errors if property access throws", () => {
        const fakeWin = {
            get parent(): Window { throw new Error("cross-origin"); },
            get opener(): Window | null { throw new Error("cross-origin"); }
        } as unknown as Window;
        expect(detectChildTarget(fakeWin)).toBeNull();
    });
});
