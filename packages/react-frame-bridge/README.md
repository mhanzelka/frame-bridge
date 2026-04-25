# @mhanzelka/react-frame-bridge

React integration for [`@mhanzelka/frame-bridge`](../frame-bridge). Manages bridge lifecycle inside React components — open on mount, close on unmount, reconnect automatically.

## Install

```bash
npm install @mhanzelka/react-frame-bridge @mhanzelka/frame-bridge
```

**Peer dependencies:** `react >= 19.0.0`, `react-dom >= 19.0.0`

---

## How it works

```
<BridgeProvider>          ← creates and owns the bridge instance
  <YourComponent>
    useBridge()           ← access the bridge anywhere in the tree
    useBridgeState()      ← subscribe to connection state changes
  </YourComponent>
  <IframeBridgeHost />    ← iframe that auto-connects to the bridge
</BridgeProvider>
```

---

## Iframe communication

### Parent page

```tsx
import { BridgeProvider, IframeBridgeHost, useBridge } from "@mhanzelka/react-frame-bridge";

type Messages = { type: "ping" | "pong"; value: number };

function Parent() {
    return (
        <BridgeProvider<Messages>
            open={true}
            channelName="my-channel"
            role="parent"
            targetOrigin="https://child.example.com"
            enabledTransports={["post-message-channel"]}
        >
            <IframeBridgeHost
                src="https://child.example.com/app"
                targetOrigin="https://child.example.com"
                style={{ width: "100%", height: 500 }}
            />
            <Controls />
        </BridgeProvider>
    );
}

function Controls() {
    const bridge = useBridge<Messages>();

    const ping = async () => {
        const reply = await bridge.send({ type: "ping", value: 1 });
        console.log(reply); // { type: "pong", value: 2 }
    };

    return <button onClick={ping}>Ping</button>;
}
```

### Child iframe

```tsx
import { BridgeProvider, useBridge } from "@mhanzelka/react-frame-bridge";

function Child() {
    return (
        <BridgeProvider<Messages>
            open={true}
            channelName="my-channel"
            role="child"
            targetOrigin="https://parent.example.com"
            enabledTransports={["post-message-channel"]}
        >
            <Handler />
        </BridgeProvider>
    );
}

function Handler() {
    const bridge = useBridge<Messages>();

    useEffect(() => {
        return bridge.onMessage(async (msg) => {
            if (msg.type === "ping") return { type: "pong", value: msg.value + 1 };
        });
    }, [bridge]);

    return null;
}
```

---

## Same-origin tabs or iframes

```tsx
<BridgeProvider
    open={true}
    channelName="shared-channel"
    role="parent"
    enabledTransports={["broadcast-channel"]}
>
    {children}
</BridgeProvider>
```

---

## Connection status

`useBridgeState` re-renders when the connection state changes — useful for showing connection indicators:

```tsx
function StatusBar() {
    const state = useBridgeState();

    return (
        <div>
            {state.state === "open" && <span style={{ color: "green" }}>● Connected</span>}
            {state.state === "closed" && <span style={{ color: "red" }}>● Disconnected</span>}
            <span>Pending: {state.pendingCount}</span>
        </div>
    );
}
```

```ts
// Full shape of BridgeStatus:
state.state          // "open" | "closed" | "partially-open"
state.pendingCount   // number of unanswered requests
state.transports     // { [type]: { state, messageCount } }
```

---

## Popup windows

```tsx
import { useBridgeWindow } from "@mhanzelka/react-frame-bridge";

function OpenPopupButton() {
    const { open } = useBridgeWindow<Messages>({
        onMessage: async (msg) => ({ ...msg, handled: true }),
    });

    return (
        <button onClick={() => open({ url: "/popup", name: "settings" })}>
            Open Settings
        </button>
    );
}
```

The hook opens a popup, establishes a bridge connection, and tears it down when the popup closes.

---

## API

### `<BridgeProvider>`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | — | Set to `false` to keep the bridge closed |
| `channelName` | `string` | — | Must match on both sides |
| `role` | `"parent" \| "child"` | — | Role of this side |
| `enabledTransports` | `TransportType[]` | `["post-message-channel"]` | Which transports to use |
| `targetOrigin` | `string` | — | Required for `post-message-channel` |
| `prefix` | `string` | — | Optional prefix for the bridge ID |
| `options.observer` | `(event) => void` | — | Called for every message sent/received |
| `bridgeOptions` | `CreateBridgeOptions` | — | Advanced options passed to `createBridge` |

> The bridge is created once on mount. Changes to `channelName`, `role`, or `enabledTransports` after mount are ignored — remount the provider to apply new configuration.

### `useBridge<T>()`

Returns the `Bridge<T>` instance from the nearest `BridgeProvider`. Throws if called outside a provider.

```tsx
const bridge = useBridge<Messages>();
await bridge.send({ type: "ping", value: 1 });
```

### `useBridgeState()`

Subscribes to bridge state. Re-renders on every state change.

```tsx
const state = useBridgeState();
// state.state: "open" | "closed" | "partially-open"
```

### `<IframeBridgeHost>`

Drop-in `<iframe>` that automatically sets `contentWindow` as the postMessage target on the parent bridge. Accepts all standard `<iframe>` props plus:

| Prop | Type | Description |
|------|------|-------------|
| `src` | `string` | iframe URL |
| `targetOrigin` | `string` | Origin to use for postMessage |

### `useBridgeWindow<T>(options)`

Hook for bridge-connected popup windows.

| Option | Type | Description |
|--------|------|-------------|
| `onMessage` | `async (msg) => reply` | Handles messages from the popup |
| `onBridgeReady` | `async (bridge) => void` | Called once the bridge is open |

Returns `{ open(options) }` — call `open({ url, name })` to open the popup.
