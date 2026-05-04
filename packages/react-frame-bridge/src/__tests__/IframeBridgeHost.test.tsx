import { describe, it, expect, vi, beforeEach, type MockInstance } from "vitest";
import { render, act, fireEvent, waitFor } from "@testing-library/react";
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
        let setTarget: MockInstance | null = null;

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
        let setTarget: MockInstance | null = null;

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

    it("fires onChildReady after iframe load when waitForReady resolves", async () => {
        let waitForReadySpy: MockInstance | null = null;

        function SpyWaitForReady() {
            const bridge = useBridge();
            waitForReadySpy = vi.spyOn(bridge, "waitForReady").mockResolvedValue(undefined);
            return null;
        }

        const onChildReady = vi.fn();

        render(
            <BridgeProvider open={false} channelName="iframe-ready-1" role="parent" enabledTransports={["broadcast-channel"]}>
                <SpyWaitForReady />
                <IframeBridgeHost src="about:blank" targetOrigin="http://localhost" onChildReady={onChildReady} />
            </BridgeProvider>
        );

        await waitFor(() => expect(onChildReady).toHaveBeenCalled());
        expect(waitForReadySpy).toHaveBeenCalled();
    });

    it("fires onChildReadyError when waitForReady rejects", async () => {
        function SpyWaitForReady() {
            const bridge = useBridge();
            vi.spyOn(bridge, "waitForReady").mockRejectedValue(new Error("timed out"));
            return null;
        }

        const onChildReady = vi.fn();
        const onChildReadyError = vi.fn();

        render(
            <BridgeProvider open={false} channelName="iframe-ready-2" role="parent" enabledTransports={["broadcast-channel"]}>
                <SpyWaitForReady />
                <IframeBridgeHost
                    src="about:blank"
                    targetOrigin="http://localhost"
                    onChildReady={onChildReady}
                    onChildReadyError={onChildReadyError}
                />
            </BridgeProvider>
        );

        await waitFor(() => expect(onChildReadyError).toHaveBeenCalled());
        expect(onChildReadyError.mock.calls[0][0].message).toMatch(/timed out/i);
        expect(onChildReady).not.toHaveBeenCalled();
    });

    it("does not call waitForReady when no ready callback is provided", async () => {
        let waitForReadySpy: MockInstance | null = null;

        function SpyWaitForReady() {
            const bridge = useBridge();
            waitForReadySpy = vi.spyOn(bridge, "waitForReady");
            return null;
        }

        render(
            <BridgeProvider open={false} channelName="iframe-ready-3" role="parent" enabledTransports={["broadcast-channel"]}>
                <SpyWaitForReady />
                <IframeBridgeHost src="about:blank" targetOrigin="http://localhost" />
            </BridgeProvider>
        );

        // Wait one microtask flush to ensure no async load handler kicks in
        await new Promise(r => setTimeout(r, 20));
        expect(waitForReadySpy).not.toHaveBeenCalled();
    });

    it("composes user onLoad alongside the ready handshake", async () => {
        function SpyWaitForReady() {
            const bridge = useBridge();
            vi.spyOn(bridge, "waitForReady").mockResolvedValue(undefined);
            return null;
        }

        const userOnLoad = vi.fn();
        const onChildReady = vi.fn();

        render(
            <BridgeProvider open={false} channelName="iframe-ready-4" role="parent" enabledTransports={["broadcast-channel"]}>
                <SpyWaitForReady />
                <IframeBridgeHost
                    src="about:blank"
                    targetOrigin="http://localhost"
                    onLoad={userOnLoad}
                    onChildReady={onChildReady}
                />
            </BridgeProvider>
        );

        await waitFor(() => expect(onChildReady).toHaveBeenCalled());
        expect(userOnLoad).toHaveBeenCalled();
    });

    it("suppresses stale onChildReady when iframe reloads before previous resolves", async () => {
        // First load: waitForReady is held until explicitly resolved after a synthetic
        // re-load has already kicked off the second call. The first resolution must
        // then be recognized as stale and its callback suppressed.
        let firstResolve: (() => void) | null = null;
        let callCount = 0;
        const callbackCalls: number[] = [];

        function SpyWaitForReady() {
            const bridge = useBridge();
            vi.spyOn(bridge, "waitForReady").mockImplementation(() => {
                callCount++;
                if (callCount === 1) {
                    return new Promise<void>((resolve) => { firstResolve = resolve; });
                }
                return Promise.resolve();
            });
            return null;
        }

        const onChildReady = vi.fn(() => { callbackCalls.push(callCount); });

        const { container } = render(
            <BridgeProvider open={false} channelName="iframe-ready-5" role="parent" enabledTransports={["broadcast-channel"]}>
                <SpyWaitForReady />
                <IframeBridgeHost src="about:blank" targetOrigin="http://localhost" onChildReady={onChildReady} />
            </BridgeProvider>
        );

        // Wait for the auto-load to register the first (held) waitForReady call
        await waitFor(() => expect(callCount).toBe(1));

        // Trigger a synthetic reload — second waitForReady resolves immediately
        const iframe = container.querySelector("iframe")!;
        fireEvent.load(iframe);

        await waitFor(() => expect(onChildReady).toHaveBeenCalledOnce());

        // Resolve the held first promise — the stale callback must NOT fire
        await act(async () => {
            firstResolve?.();
            await Promise.resolve();
        });

        expect(onChildReady).toHaveBeenCalledOnce();
    });
});
