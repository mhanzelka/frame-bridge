# @mhanzelka/frame-bridge

Send messages between browser windows, iframes, and tabs with a simple request-response API. No server needed — everything runs in the browser.

## Install

```bash
npm install @mhanzelka/frame-bridge
```

No runtime dependencies. Works in any modern browser.

---

## How it works

```
Parent window / tab                   Child iframe / tab
─────────────────                     ──────────────────
bridge.send({ type: "ping" })  ──►   bridge.onMessage(async (msg) => {
                                           return { type: "pong" };
await response                 ◄──       })
```

The bridge handles message correlation (request ↔ response pairing), timeouts, retries, and transport selection automatically.

---

## Transports

Pick the right transport for your use case:

| Transport | When to use | Same-origin only |
|-----------|-------------|-----------------|
| `broadcast-channel` | Same-origin tabs, iframes, popups | Yes |
| `post-message-channel` | Cross-origin iframes | No |
| `message-channel` | High-throughput dedicated channel | No |

You can enable multiple transports — the bridge picks the first available open one per message.

---

## Usage

### Same-origin (tabs, iframes)

```ts
import { createBridge } from "@mhanzelka/frame-bridge";

// In the parent tab
const parent = createBridge({
    channelName: "my-channel",
    role: "parent",
    enabled: ["broadcast-channel"],
});

await parent.open();
const reply = await parent.send({ type: "ping", value: 1 });
// reply: { type: "pong", value: 2 }
```

```ts
// In the child tab / iframe (same origin)
const child = createBridge({
    channelName: "my-channel",
    role: "child",
    enabled: ["broadcast-channel"],
});

await child.open();
child.onMessage(async (msg) => {
    if (msg.type === "ping") return { type: "pong", value: msg.value + 1 };
});
```

### Cross-origin iframe (postMessage)

```ts
// In the parent page
const parent = createBridge({
    channelName: "iframe-channel",
    role: "parent",
    enabled: ["post-message-channel"],
    targetOrigin: "https://child.example.com",
    target: iframeElement.contentWindow,
});

await parent.open();
await parent.send({ type: "init" });
```

```ts
// In the child iframe at child.example.com
const child = createBridge({
    channelName: "iframe-channel",
    role: "child",
    enabled: ["post-message-channel"],
    targetOrigin: "https://parent.example.com",
    target: window.parent,
});

await child.open();
child.onMessage(async (msg) => ({ ...msg, received: true }));
```

### Fire-and-forget events

```ts
// Send without waiting for a reply
parent.sendEvent({ type: "user-activity", timestamp: Date.now() });
```

---

## TypeScript

Pass your message type as a generic — the bridge enforces it on both sides:

```ts
type AppMessage = 
    | { type: "ping"; value: number }
    | { type: "pong"; value: number }
    | { type: "reset" };

const bridge = createBridge<AppMessage>({
    channelName: "typed-channel",
    role: "parent",
    enabled: ["broadcast-channel"],
});

await bridge.send({ type: "ping", value: 1 }); // ✓
await bridge.send({ type: "unknown" });         // ✗ TypeScript error
```

---

## Send options

```ts
const reply = await bridge.send(data, {
    timeout: 5000,                        // ms — throws if no reply (default: 10 000)
    signal: abortController.signal,       // cancel the request
    transfer: [arrayBuffer],              // Transferable objects (postMessage/MessageChannel)
    preferredTransport: "message-channel", // hint which transport to use
});
```

---

## API

### `createBridge<T>(options)`

| Option | Type | Description |
|--------|------|-------------|
| `channelName` | `string` | Must match on both sides |
| `role` | `"parent" \| "child"` | Each side picks a role |
| `enabled` | `TransportType[]` | Which transports to use |
| `targetOrigin` | `string` | Required for `post-message-channel` |
| `target` | `Window` | Target window for `post-message-channel` |
| `prefix` | `string` | Optional prefix for the bridge ID |

### `Bridge<T>` methods

| Method | Description |
|--------|-------------|
| `open()` | Open all enabled transports |
| `close()` | Close everything, reject pending messages |
| `send(data, options?)` | Send a request, returns a Promise with the reply |
| `sendEvent(data)` | Fire-and-forget — no reply expected |
| `onMessage(handler)` | Register an incoming message handler (returns unsubscribe fn) |
| `isOpen()` | `true` if at least one transport is open |
| `active()` | Lists currently enabled and open transports |
| `enable(type)` | Enable a transport at runtime |
| `disable(type)` | Disable a transport at runtime |
| `setTarget(window, origin)` | Update postMessage target after creation |
| `addMessageObserver(fn)` | Subscribe to all sent/received messages (for debugging) |
| `state` | Reactive state store (compatible with `useSyncExternalStore`) |

---

## Debug logging

```ts
import { enableBridgeDebug, disableBridgeDebug } from "@mhanzelka/frame-bridge";

enableBridgeDebug();   // print all bridge activity to the console
disableBridgeDebug();  // silence (default)
```

---

## Open a popup with a bridge

```ts
import { openBridgeWindow } from "@mhanzelka/frame-bridge/bridge/BridgeUtils";

await openBridgeWindow({
    url: "/popup",
    name: "my-popup",
    onMessage: async (msg) => ({ ...msg, handled: true }),
    onBridgeReady: async (bridge) => {
        await bridge.send({ type: "init" });
    },
});
```
