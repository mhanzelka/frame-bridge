import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BridgeProvider } from "@/bridge/BridgeProvider";
import { useBridge } from "@/bridge/hooks/useBridge";

describe("useBridge", () => {
    it("throws when used outside BridgeProvider", () => {
        function Bad() {
            useBridge();
            return null;
        }

        expect(() => render(<Bad />)).toThrow();
    });

    it("returns the bridge instance inside BridgeProvider", () => {
        function Consumer() {
            const bridge = useBridge();
            return <div data-testid="out">{typeof bridge.send}</div>;
        }

        render(
            <BridgeProvider open={false} channelName="ch" role="parent" enabledTransports={["broadcast-channel"]}>
                <Consumer />
            </BridgeProvider>
        );

        expect(screen.getByTestId("out").textContent).toBe("function");
    });
});
