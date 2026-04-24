let enabled = false;

export const enableBridgeDebug = () => { enabled = true; };
export const disableBridgeDebug = () => { enabled = false; };
export const isBridgeDebugEnabled = () => enabled;

export const log = (...args: any[]) => { if (enabled) console.log(...args); };
export const warn = (...args: any[]) => { if (enabled) console.warn(...args); };
export const error = (...args: any[]) => { console.error(...args); };
