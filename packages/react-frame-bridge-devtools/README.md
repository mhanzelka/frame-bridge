# @mhanzelka/react-frame-bridge-devtools

A floating debug panel for React apps using [`@mhanzelka/react-frame-bridge`](../react-frame-bridge). See all active bridges, connection state, and a live message log — without touching your production code.

## Install

```bash
npm install @mhanzelka/react-frame-bridge-devtools
```

**Peer dependencies:** `react >= 19.0.0`, `react-dom >= 19.0.0`, `@headlessui/react >= 2.0.0`, `@heroicons/react >= 2.0.0`, `clsx >= 2.0.0`

---

## Setup

**1. Import the styles once** in your app entry point:

```ts
import "@mhanzelka/react-frame-bridge-devtools/styles.css";
```

**2. Add the panel** anywhere in your component tree (outside of `BridgeProvider` is fine):

```tsx
import { BridgeConsoleDevTool } from "@mhanzelka/react-frame-bridge-devtools";

function App() {
    return (
        <>
            {/* your app */}
            {process.env.NODE_ENV === "development" && (
                <BridgeConsoleDevTool buttonPosition="bottom-right" />
            )}
        </>
    );
}
```

That's it — the panel auto-discovers all bridges registered via `BridgeProvider`. No extra wiring needed.

---

## What you can see

```
┌──────────────────────────────────────────────────────────┐
│  Bridge Console                         [State] [Messages] │
├──────────────────────────────────────────────────────────┤
│  STATE TAB                                               │
│                                                          │
│  my-channel                    ● open                    │
│    broadcast-channel     ✓  open   128 messages          │
│    post-message-channel  –  disabled                     │
│  Pending requests: 0                                     │
├──────────────────────────────────────────────────────────┤
│  MESSAGES TAB                                            │
│                                                          │
│  ▶ ping  { value: 1 }              12:03:01.442  blue    │
│  ◀ pong  { value: 2 }              12:03:01.451  green   │
│  ★ user-activity  { id: 42 }       12:03:04.001  purple  │
│  ▶ ping  { value: 3 }       ⏳     12:03:08.220  blue    │
└──────────────────────────────────────────────────────────┘
  ▶ request (blue)   ◀ response (green)   ★ event (purple)
  ⏳ waiting for response
```

### State tab

- Transport status per bridge: `open` / `closed` / `disabled` / `standby`
- Message count per transport
- Pending (unresolved) request count

### Messages tab

- Live message history — up to 1 000 entries per bridge
- Request and response messages paired by message ID
- Color-coded: request (blue), response (green), event (purple)
- Pending requests show a spinner until a response arrives or the request times out
- Toggle pretty-print JSON to inspect payloads

---

## API

### `<BridgeConsoleDevTool>`

| Prop | Type | Description |
|------|------|-------------|
| `buttonPosition` | `"top-left" \| "top-right" \| "bottom-left" \| "bottom-right"` | Where to place the toggle button |
| `offset` | `number \| string \| [x, y]` | Distance from the edge (px or CSS value) |

### `useBridgeRegistry()`

Returns `{ registerBridge }` — used internally by `BridgeProvider`. Call it if you create a bridge manually and want it to appear in the debug panel.

```ts
const { registerBridge } = useBridgeRegistry();

const unregister = registerBridge(bridge);
// call unregister() when done
```

### `useBridgeRegistryState()`

Returns reactive registry state. Re-renders when any registered bridge changes.

```ts
const { bridges, clear } = useBridgeRegistryState();

// bridges: BridgeRegistrySnapshot[]
// clear(bridgeId): clears the message history for one bridge
```

Each `BridgeRegistrySnapshot` contains:

| Field | Description |
|-------|-------------|
| `id` | Bridge instance ID |
| `channelName` | Channel name |
| `state` | Current `BridgeStatus` |
| `eventHistory` | Array of observer events (messages, timeouts) |
