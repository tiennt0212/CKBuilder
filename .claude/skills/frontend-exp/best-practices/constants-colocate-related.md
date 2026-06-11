---
title: Group related domain constants in one module
impact: MEDIUM
tags: constants, dry, typescript, organization
---

## Group related domain constants in one module

**Impact: MEDIUM**

When a set of values (a list) and their associated metadata (a record keyed by those values) always change together, define them in the same module. Splitting related constants across files means two places to update when a value is added or removed.

This applies to any "list + metadata map" pattern: network environments + their colors, status codes + their labels, permission levels + their display names.

**Incorrect (related constants split across files — two updates required):**

```ts
// types.ts
export const NETWORKS = ["devnet", "testnet", "mainnet"] as const;
export type Network = (typeof NETWORKS)[number];

// config.ts (separate file — now two places to update when adding a network)
export const NETWORK_COLORS: Record<Network, string> = {
  devnet: "#f59e0b",
  testnet: "#6366f1",
  mainnet: "#10b981",
};
```

**Correct (co-located in one module — one update, always in sync):**

```ts
// lib/networks.ts
export const NETWORKS = ["devnet", "testnet", "mainnet"] as const;
export type Network = (typeof NETWORKS)[number]; // derived — see constants-derive-types

export const NETWORK_COLORS: Record<Network, string> = {
  devnet: "#f59e0b",
  testnet: "#6366f1",
  mainnet: "#10b981",
};
```

Rule of thumb: if adding a new value to the list requires updating a sibling `Record`, they belong in the same file.

> For deriving TypeScript types from the constant array itself, see `constants-derive-types`.
