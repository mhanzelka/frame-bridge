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

/**
 * Detects the implicit "host" window from a child context: the iframe parent
 * (`window.parent`) or popup opener (`window.opener`). Returns null on a
 * top-level page with no opener, or in non-browser environments (SSR).
 * Property access is wrapped in try/catch as a defensive measure against
 * exotic cross-origin environments.
 */
export const detectChildTarget = (win: Window | null = typeof window !== `undefined` ? window : null): Window | null => {
    if (!win) return null;
    try {
        if (win.parent && win.parent !== win) return win.parent;
        if (win.opener) return win.opener as Window;
    } catch {
        return null;
    }
    return null;
}
