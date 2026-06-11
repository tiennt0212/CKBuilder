---
title: Define NETWORKS array and NETWORK_DOT_COLORS once in ccc-client.ts
impact: LOW-MEDIUM
tags: network, ckb, constants, dry
---

## Define NETWORKS array and NETWORK_DOT_COLORS once in ccc-client.ts

**Impact: LOW-MEDIUM**

The list of supported networks and their indicator colors are defined **once** in `app/lib/ccc-client.ts`. The `Network` type is derived from the constant array — not declared independently. All consumers import from this file.

Without a single source, the network list and dot colors were duplicated in `Header.tsx` and `Header.stories.tsx`. Any new network (e.g. a staging environment) required updates in multiple places.

**Incorrect (network list and colors duplicated across files):**

```tsx
// Header.tsx
const DOT_COLORS = { devnet: "#f59e0b", testnet: "var(--dot)", mainnet: "#6366f1" };
const networkOptions = (["devnet", "testnet", "mainnet"] as Network[]).map(...)

// Header.stories.tsx — same literal again
const DOT_COLORS = { devnet: "#f59e0b", testnet: "var(--dot)", mainnet: "#6366f1" };
```

**Correct (single source — type derived from the array):**

```ts
// app/lib/ccc-client.ts
export const NETWORKS = ["devnet", "testnet", "mainnet"] as const;
export type Network = (typeof NETWORKS)[number]; // derived, not re-declared

export const NETWORK_DOT_COLORS: Record<Network, string> = {
  devnet:  "#f59e0b",
  testnet: "var(--dot)",  // CSS custom property — resolves at runtime
  mainnet: "#6366f1",
};
```

```tsx
// Header.tsx — import both and use
import { NETWORKS, NETWORK_DOT_COLORS, type Network } from "@/lib/ccc-client";

const networkOptions = (NETWORKS as readonly Network[]).map((n) => ({
  value: n,
  label: <span style={{ background: NETWORK_DOT_COLORS[n] }} />,
}));
```
