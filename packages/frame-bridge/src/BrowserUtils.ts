/**
 * Check if the browser supports the getUserMedia API
 */
export const hasGetUserMedia = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

export const isWindowReachable = (win: Window | null) => {
    try {
        if (!win) return false
        if (win.closed) return false;
        // check post message, this will not throw cross-origin error
        void win.postMessage;
        return true;
    } catch {
        return false;
    }
}

export const openWindow = (path: string, name: string, width: number = 500, height: number = 650) => {
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    return window.open(path, name, `width=${width},height=${height},top=${top},left=${left},popup=yes,resizable=yes,scrollbars=yes,toolbar=no,location=no,status=no`);
}

export type OpenWindowOptions = {
    url: string;
    name: string;
    /** Expected origin for window.postMessage security check (recommended). */
    expectedOrigin: string;

    /** Optional AbortController to cancel the operation. */
    abortController?: AbortController;

    /** BroadcastChannel name; defaults to window name. */
    broadcastChannelName?: string;

    /** Message discriminator used by both transports. Defaults to `${name}_response`. */
    responseType?: string;

    /** Polling interval (ms) to detect popup close. */
    pollIntervalMs?: number;

    /** Features string for window.open. */
    features?: string;
};

/**
 * Opens a popup and listens via BOTH BroadcastChannel and window.postMessage simultaneously.
 * Resolves `true` on first matching response; resolves `false` if popup closes or aborted.
 */
export const openWindowWithChannelResponse = ({
                                                  url,
                                                  name,
                                                  expectedOrigin,
                                                  abortController,
                                                  broadcastChannelName,
                                                  responseType,
                                                  pollIntervalMs = 500,
                                                  features = "popup,width=480,height=720"
                                              }: OpenWindowOptions): Promise<boolean> => {
    const respType = responseType ?? `${name}_response`;
    const channelName = broadcastChannelName ?? name;

    const localAbort = new AbortController();

    // Open popup first to avoid blockers; navigate after listeners are ready
    const popup = window.open("about:blank", name, features);
    if (!popup) {
        return Promise.reject(new Error("Failed to open window (blocked by browser?)"));
    }

    return new Promise<boolean>((resolve) => {
        let cleaned = false;
        let intervalId: number | undefined;
        let bc: BroadcastChannel | null = null;

        const clean = () => {
            if (cleaned) return;
            cleaned = true;

            try { if (intervalId) clearInterval(intervalId); } catch {}
            try { localAbort.abort(); } catch {}

            // Remove window message listener
            try { window.removeEventListener("message", onWindowMessage as EventListener); } catch {}

            // Close BroadcastChannel
            try {
                if (bc) {
                    bc.removeEventListener("message", onBCMessage as EventListener);
                    bc.close();
                }
            } catch {}
        };

        const resolveSuccess = () => { clean(); resolve(true); };
        const resolveFail = () => { clean(); resolve(false); };

        // ---- Listener: BroadcastChannel (same-origin relay) ----
        const onBCMessage = (ev: MessageEvent) => {
            const t = (ev?.data && (ev.data as any).type) || undefined;
            if (t === respType) resolveSuccess();
        };

        try {
            if (typeof (globalThis as any).BroadcastChannel === "function") {
                bc = new BroadcastChannel(channelName);
                bc.addEventListener("message", onBCMessage as EventListener, { signal: localAbort.signal });
            }
        } catch {
            // ignore BC runtime failures; opener listener still active
        }

        // ---- Listener: window.postMessage(opener) ----
        const onWindowMessage = (ev: MessageEvent) => {
            // Security: require matching origin if provided
            if (expectedOrigin && ev.origin !== expectedOrigin) return;

            const t = (ev?.data && (ev.data as any).type) || undefined;
            if (t === respType) resolveSuccess();
        };

        window.addEventListener("message", onWindowMessage as EventListener, { signal: localAbort.signal });

        // ---- Abort & popup-close handling ----
        intervalId = window.setInterval(() => {
            if (popup.closed) resolveFail();
        }, pollIntervalMs);

        abortController?.signal.addEventListener("abort", resolveFail);

        // Navigate after listeners are ready
        popup.location.href = url;
    });
};


let _hwDisabled: boolean | undefined = undefined;

/**
 * Returns true if WebGL hardware acceleration is disabled or using a software renderer.
 */
export function isHardwareAccelerationDisabled(): boolean {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        // If we are not in a browser environment, we cannot determine hardware acceleration.
        return false;
    }

    if (_hwDisabled !== undefined) {
        return _hwDisabled;
    }

    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl');
    if (!gl) {
        _hwDisabled = true;
        return _hwDisabled;
    }

    interface DebugInfo {
        UNMASKED_RENDERER_WEBGL: number;
    }
    const ext = gl.getExtension('WEBGL_debug_renderer_info') as DebugInfo | null;
    if (ext) {
        const renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string | null;
        if (renderer?.toLowerCase().includes('swiftshader')) {
            _hwDisabled = true;
            return _hwDisabled;
        }
    }

    _hwDisabled = false;
    return _hwDisabled;
}
