# CLAUDE.md

## Preferred Technologies

- **Language** — TypeScript
- **Framework** — Next.js (always App Router) for multi-page projects requiring SSR or prefetching; Vite + React for SPAs
- **Routing** — TanStack Router for non-Next.js projects
- **Server state** — TanStack Query (`useQuery`, `useMutation`)
- **Styling** — Tailwind CSS (CSS-only config, no JS config); clsx for conditional classes
- **Icons** — Lucide
- **Date/time** — moment.js
- **Headless UI** — Headless UI for accessible unstyled components (modals, dropdowns, etc.)

## Feature folder structure

```
feature/<name>/
  api/        # one file per API call (getItems.ts, deleteItem.ts, …)
  hooks/      # React Query hooks (useItemsQuery.ts, …)
  types/      # types.ts
  lib/        # pure utilities with no React dependency
  components/ # React components specific to this feature
```

Shared UI components live in `shared/components/`.

## Next.js — Images

Always use `next/image` instead of `<img>`.

## Next.js — Server vs Client components

Default to Server Components. Add `"use client"` only where necessary: interactivity, React hooks, or browser APIs.

## Routing

Use `next/link` and `next/navigation` for routing.

---

## Coding Conventions

### Naming
- Folders — kebab-case (`feature/payment-tool/`)
- Files — camelCase (`usePaymentsQuery.ts`, `apiClient.ts`)
- Components — PascalCase (`PaymentsTable.tsx`)
- One component or module per file. No exceptions.
- Feature-specific components live in `feature/<name>/components/`.
- Shared UI components live in `shared/components/`.

### Functions
- Declare **all** functions — including components — with `const`. Never use `function` declarations.

### Props types
- Every component with more than one prop must have a named type `<ComponentName>Props` defined immediately above the component.
  ```ts
  type SegBtnProps = { label: string; active: boolean; onClick: () => void }
  export const SegBtn = ({ label, active, onClick }: SegBtnProps) => …
  ```

### Multi-parameter functions
- Plain functions (non-components) with more than one parameter must group params into a typed object:
  ```ts
  type Params = { id: string; limit: number }
  export const fetchItems = ({ id, limit }: Params) => { … }
  ```

---

## Global CSS defaults

```css
button,
[role="button"] {
    cursor: pointer;
}

:disabled {
    cursor: default;
}
```

## Tailwind — custom variants

Define state variants via data attributes in CSS, not with JS conditionals in className.

```css
@custom-variant selected (&[data-selected="true"]);
@custom-variant active (&[data-active="true"]);
```

## Constants

Centralize magic values in `src/constants.ts`. No inline magic numbers.

## Git

- Never add a Claude co-author signature to commits.
