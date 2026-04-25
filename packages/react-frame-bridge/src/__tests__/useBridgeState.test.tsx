import { describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { BridgeProvider } from "@/bridge/BridgeProvider";
import { useBridgeState } from "@/bridge/hooks/useBridgeState";
import { useBridge } from "@/bridge/hooks/useBridge";

function StateDisplay() {
    const state = useBridgeState();
    return <div data-testid="state">{state.state}</div>;
}

describe("useBridgeState", () => {
    it("returns closed state before open", async () => {
        render(
            <BridgeProvider open={false} channelName="state-ch" role="parent" enabledTransports={["broadcast-channel"]}>
                <StateDisplay />
            </BridgeProvider>
        );

        expect(screen.getByTestId("state").textContent).toBe("closed");
    });

    it("returns open state after bridge opens", async () => {
        await act(async () => {
            render(
                <BridgeProvider open={true} channelName="state-open" role="parent" enabledTransports={["broadcast-channel"]}>
                    <StateDisplay />
                </BridgeProvider>
            );
        });

        expect(screen.getByTestId("state").textContent).toBe("open");
    });

    it("reflects pending request count", async () => {
        function PendingDisplay() {
            const state = useBridgeState();
            const bridge = useBridge();
            return (
                <>
                    <div data-testid="pending">{state.pendingCount}</div>
                    <button onClick={() => bridge.send({ type: "x" }, { timeout: 500 }).catch(() => {})}>
                        send
                    </button>
                </>
            );
        }

        await act(async () => {
            render(
                <BridgeProvider open={true} channelName="state-pending" role="parent" enabledTransports={["broadcast-channel"]}>
                    <PendingDisplay />
                </BridgeProvider>
            );
        });

        expect(screen.getByTestId("pending").textContent).toBe("0");

        act(() => {
            screen.getByRole("button").click();
        });

        expect(screen.getByTestId("pending").textContent).toBe("1");
    });
});
