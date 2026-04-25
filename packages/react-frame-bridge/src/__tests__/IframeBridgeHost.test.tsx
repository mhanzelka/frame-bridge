import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";
import { BridgeProvider } from "@/bridge/BridgeProvider";
import { IframeBridgeHost } from "@/bridge/IframeBridgeHost";
import { useBridge } from "@/bridge/hooks/useBridge";

describe("IframeBridgeHost", () => {
    it("renders an iframe element", () => {
        const { container } = render(
            <BridgeProvider open={false} channelName="iframe-ch" role="parent" enabledTransports={["broadcast-channel"]}>
                <IframeBridgeHost src="about:blank" targetOrigin="http://localhost" />
            </BridgeProvider>
        );

        expect(container.querySelector("iframe")).not.toBeNull();
    });

    it("passes extra props to the iframe", () => {
        const { container } = render(
            <BridgeProvider open={false} channelName="iframe-ch2" role="parent" enabledTransports={["broadcast-channel"]}>
                <IframeBridgeHost src="about:blank" targetOrigin="http://localhost" data-testid="my-iframe" title="test" />
            </BridgeProvider>
        );

        const iframe = container.querySelector("iframe")!;
        expect(iframe.getAttribute("title")).toBe("test");
    });

    it("calls setTarget on the bridge when iframe mounts", () => {
        let setTarget: ReturnType<typeof vi.fn> | null = null;

        function SpySetTarget() {
            const bridge = useBridge();
            setTarget = vi.spyOn(bridge, "setTarget");
            return null;
        }

        render(
            <BridgeProvider open={false} channelName="iframe-ch3" role="parent" enabledTransports={["broadcast-channel"]}>
                <SpySetTarget />
                <IframeBridgeHost src="about:blank" targetOrigin="http://localhost" />
            </BridgeProvider>
        );

        expect(setTarget).toHaveBeenCalledWith(expect.anything(), "http://localhost");
    });

    it("calls setTarget(null) when iframe unmounts", () => {
        let setTarget: ReturnType<typeof vi.fn> | null = null;

        function SpySetTarget() {
            const bridge = useBridge();
            setTarget = vi.spyOn(bridge, "setTarget");
            return null;
        }

        const { unmount } = render(
            <BridgeProvider open={false} channelName="iframe-ch4" role="parent" enabledTransports={["broadcast-channel"]}>
                <SpySetTarget />
                <IframeBridgeHost src="about:blank" targetOrigin="http://localhost" />
            </BridgeProvider>
        );

        act(() => { unmount(); });

        const calls = (setTarget as any).mock.calls;
        const lastCall = calls[calls.length - 1];
        expect(lastCall[0]).toBeNull();
    });
});
