import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { BridgeProvider } from "@/bridge/BridgeProvider";
import { useBridge } from "@/bridge/hooks/useBridge";
import { bridgeRegistry } from "@mhanzelka/frame-bridge/bridge/debug/BridgeRegistry";

function BridgeConsumer() {
    const bridge = useBridge();
    return <div data-testid="bridge">{bridge ? "ok" : "null"}</div>;
}

afterEach(() => {
    act(() => {
        bridgeRegistry.getSnapshot().bridges.forEach(b => {
            bridgeRegistry.unregisterBridge(b.id);
        });
    });
});

describe("BridgeProvider", () => {
    it("renders children", () => {
        render(
            <BridgeProvider open={false} channelName="ch" role="parent" enabledTransports={["broadcast-channel"]}>
                <span>hello</span>
            </BridgeProvider>
        );
        expect(screen.getByText("hello")).toBeInTheDocument();
    });

    it("provides bridge instance to children via context", () => {
        render(
            <BridgeProvider open={false} channelName="ch" role="parent" enabledTransports={["broadcast-channel"]}>
                <BridgeConsumer />
            </BridgeProvider>
        );
        expect(screen.getByTestId("bridge").textContent).toBe("ok");
    });

    it("forwards explicit id to the underlying bridge", () => {
        let bridge: ReturnType<typeof useBridge> | null = null;

        function Capture() {
            bridge = useBridge();
            return null;
        }

        render(
            <BridgeProvider id="named-endpoint" open={false} channelName="ch-id" role="parent" enabledTransports={["broadcast-channel"]}>
                <Capture />
            </BridgeProvider>
        );

        expect(bridge!.id).toBe("named-endpoint");
    });

    it("opens the bridge when open=true", async () => {
        let bridge: ReturnType<typeof useBridge> | null = null;

        function Capture() {
            bridge = useBridge();
            return null;
        }

        await act(async () => {
            render(
                <BridgeProvider open={true} channelName="ch-open" role="parent" enabledTransports={["broadcast-channel"]}>
                    <Capture />
                </BridgeProvider>
            );
        });

        expect(bridge!.isOpen()).toBe(true);
    });

    it("does not open the bridge when open=false", async () => {
        let bridge: ReturnType<typeof useBridge> | null = null;

        function Capture() {
            bridge = useBridge();
            return null;
        }

        await act(async () => {
            render(
                <BridgeProvider open={false} channelName="ch-closed" role="parent" enabledTransports={["broadcast-channel"]}>
                    <Capture />
                </BridgeProvider>
            );
        });

        expect(bridge!.isOpen()).toBe(false);
    });

    it("closes the bridge on unmount", async () => {
        let bridge: ReturnType<typeof useBridge> | null = null;

        function Capture() {
            bridge = useBridge();
            return null;
        }

        const { unmount } = render(
            <BridgeProvider open={true} channelName="ch-unmount" role="parent" enabledTransports={["broadcast-channel"]}>
                <Capture />
            </BridgeProvider>
        );

        await act(async () => {});
        expect(bridge!.isOpen()).toBe(true);

        act(() => { unmount(); });
        expect(bridge!.isOpen()).toBe(false);
    });

    it("registers the bridge in the global registry", async () => {
        await act(async () => {
            render(
                <BridgeProvider open={false} channelName="reg-channel" role="parent" enabledTransports={["broadcast-channel"]}>
                    <span />
                </BridgeProvider>
            );
        });

        const snapshot = bridgeRegistry.getSnapshot();
        expect(snapshot.bridges.some(b => b.channelName === "reg-channel")).toBe(true);
    });

    it("unregisters the bridge from the registry on unmount", async () => {
        const { unmount } = render(
            <BridgeProvider open={false} channelName="unreg-channel" role="parent" enabledTransports={["broadcast-channel"]}>
                <span />
            </BridgeProvider>
        );

        expect(bridgeRegistry.getSnapshot().bridges.some(b => b.channelName === "unreg-channel")).toBe(true);

        act(() => { unmount(); });

        expect(bridgeRegistry.getSnapshot().bridges.some(b => b.channelName === "unreg-channel")).toBe(false);
    });

    it("attaches an observer when options.observer is provided", async () => {
        const observer = vi.fn();

        await act(async () => {
            render(
                <BridgeProvider
                    open={true}
                    channelName="obs-channel"
                    role="parent"
                    enabledTransports={["broadcast-channel"]}
                    options={{ observer }}
                >
                    <span />
                </BridgeProvider>
            );
        });

        expect(observer).not.toHaveBeenCalled();
    });
});
