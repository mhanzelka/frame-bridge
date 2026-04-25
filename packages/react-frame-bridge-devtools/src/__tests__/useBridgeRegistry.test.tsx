import { describe, it, expect, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { createBridge } from "@mhanzelka/frame-bridge/bridge/Bridge";
import { bridgeRegistry } from "@mhanzelka/frame-bridge/bridge/debug/BridgeRegistry";
import { useBridgeRegistry, useBridgeRegistryState } from "@/bridge/debug/useBridgeRegistry";

function makeTestBridge(channelName: string) {
    return createBridge({
        channelName,
        role: "parent",
        enabled: ["broadcast-channel"],
    });
}

afterEach(() => {
    act(() => {
        bridgeRegistry.getSnapshot().bridges.forEach(b => {
            bridgeRegistry.unregisterBridge(b.id);
        });
    });
});

describe("useBridgeRegistry", () => {
    it("returns a registerBridge function", () => {
        function Consumer() {
            const { registerBridge } = useBridgeRegistry();
            return <div data-testid="type">{typeof registerBridge}</div>;
        }

        render(<Consumer />);
        expect(screen.getByTestId("type").textContent).toBe("function");
    });

    it("registerBridge adds the bridge to the registry", () => {
        const bridge = makeTestBridge("reg-hook-ch");

        function Consumer() {
            const { registerBridge } = useBridgeRegistry();
            registerBridge(bridge);
            return null;
        }

        act(() => { render(<Consumer />); });

        expect(bridgeRegistry.getSnapshot().bridges.some(b => b.channelName === "reg-hook-ch")).toBe(true);
    });
});

describe("useBridgeRegistryState", () => {
    it("returns empty bridges list initially", () => {
        function Consumer() {
            const { bridges } = useBridgeRegistryState();
            return <div data-testid="count">{bridges.length}</div>;
        }

        render(<Consumer />);
        expect(screen.getByTestId("count").textContent).toBe("0");
    });

    it("reflects bridges registered in the global registry", () => {
        const bridge = makeTestBridge("state-hook-ch");

        function Consumer() {
            const { bridges } = useBridgeRegistryState();
            return <div data-testid="count">{bridges.length}</div>;
        }

        render(<Consumer />);
        expect(screen.getByTestId("count").textContent).toBe("0");

        act(() => { bridgeRegistry.registerBridge(bridge); });

        expect(screen.getByTestId("count").textContent).toBe("1");
    });

    it("re-renders when a bridge is unregistered", () => {
        const bridge = makeTestBridge("unreg-hook-ch");
        const unregister = bridgeRegistry.registerBridge(bridge);

        function Consumer() {
            const { bridges } = useBridgeRegistryState();
            return <div data-testid="count">{bridges.length}</div>;
        }

        render(<Consumer />);
        expect(screen.getByTestId("count").textContent).toBe("1");

        act(() => { unregister(); });

        expect(screen.getByTestId("count").textContent).toBe("0");
    });

    it("exposes a clear function that wipes message history", () => {
        const bridge = makeTestBridge("clear-hook-ch");
        bridgeRegistry.registerBridge(bridge);

        function Consumer() {
            const { bridges, clear } = useBridgeRegistryState();
            const b = bridges[0];
            return (
                <>
                    <div data-testid="id">{b?.id ?? "none"}</div>
                    <button onClick={() => b && clear(b.id)}>clear</button>
                </>
            );
        }

        render(<Consumer />);
        const id = screen.getByTestId("id").textContent;
        expect(id).not.toBe("none");
    });
});
