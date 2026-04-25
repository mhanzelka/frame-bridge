# frame-bridge

Send messages between browser windows, iframes, and tabs as easily as calling a function.

```
┌─────────────────────┐                    ┌─────────────────────┐
│   Parent window     │   ◄──── bridge ──► │   Child iframe/tab  │
│                     │                    │                     │
│  bridge.send(msg)   │ ───── request ───► │  bridge.onMessage() │
│  await response     │ ◄──── response ─── │  return reply       │
└─────────────────────┘                    └─────────────────────┘
```

## Packages

| Package | What it does |
|---------|-------------|
| [`@mhanzelka/frame-bridge`](./packages/frame-bridge) | Core library. Works in any JS/TS project. |
| [`@mhanzelka/react-frame-bridge`](./packages/react-frame-bridge) | React provider and hooks for frame-bridge. |
| [`@mhanzelka/react-frame-bridge-devtools`](./packages/react-frame-bridge-devtools) | In-browser debug panel — see live messages, state, and history. |

---

## What can it do?

### Send a request and get a response

```ts
// In the parent window
const response = await bridge.send({ type: "ping", value: 1 });
console.log(response); // { type: "pong", value: 2 }

// In the child iframe
bridge.onMessage(async (msg) => {
    if (msg.type === "ping") return { type: "pong", value: msg.value + 1 };
});
```

### Fire-and-forget events

```ts
bridge.sendEvent({ type: "user-clicked", id: 42 });
```

### Works across different communication channels

```
Same-origin tabs / iframes     →  BroadcastChannel  (easiest, no config)
Cross-origin iframes           →  postMessage        (requires targetOrigin)
High-throughput / dedicated    →  MessageChannel     (established via handshake)
```

---

## Quickstart (vanilla JS/TS)

```ts
// parent.ts
import { createBridge } from "@mhanzelka/frame-bridge";

const bridge = createBridge({ channelName: "my-channel", role: "parent", enabled: ["broadcast-channel"] });
await bridge.open();
const response = await bridge.send({ type: "hello" });
```

```ts
// child.ts
import { createBridge } from "@mhanzelka/frame-bridge";

const bridge = createBridge({ channelName: "my-channel", role: "child", enabled: ["broadcast-channel"] });
await bridge.open();
bridge.onMessage(async (msg) => ({ type: "hi-back" }));
```

## Quickstart (React)

```tsx
// Parent page
import { BridgeProvider, IframeBridgeHost, useBridge } from "@mhanzelka/react-frame-bridge";

function App() {
    return (
        <BridgeProvider channelName="my-channel" role="parent" open={true} enabledTransports={["broadcast-channel"]}>
            <IframeBridgeHost src="/child" targetOrigin={location.origin} />
            <Controls />
        </BridgeProvider>
    );
}

function Controls() {
    const bridge = useBridge();
    return <button onClick={() => bridge.send({ type: "hello" })}>Send</button>;
}
```

---

## Debug panel

Add `BridgeConsoleDevTool` to your React app to get a floating debug panel:

```tsx
import { BridgeConsoleDevTool } from "@mhanzelka/react-frame-bridge-devtools";
import "@mhanzelka/react-frame-bridge-devtools/styles.css";

// Anywhere in your component tree:
<BridgeConsoleDevTool buttonPosition="bottom-right" />
```

```
┌─────────────────────────────────────────────────┐
│  Bridge Console                         [State] [Messages] │
├─────────────────────────────────────────────────┤
│  my-channel          ● open                     │
│  broadcast-channel   ✓  42 messages             │
│  Pending requests    0                          │
├─────────────────────────────────────────────────┤
│  → ping  { value: 1 }          12:03:01.442     │
│  ← pong  { value: 2 }          12:03:01.451     │
│  → ping  { value: 3 }      ⏳  12:03:05.001     │
└─────────────────────────────────────────────────┘
```

---

## Development

```bash
npm install          # install all workspace dependencies
npm run build        # build all packages
npm test             # run tests
npm run release      # sync versions + build + test
```
