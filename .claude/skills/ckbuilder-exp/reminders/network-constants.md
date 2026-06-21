---
title: Network constants and Network object live in ccc-client.ts
impact: LOW-MEDIUM
tags: network, ckb, constants, dry
---

## Network constants and Network object live in ccc-client.ts

**Impact: LOW-MEDIUM**

`Network` (both value and type), `NETWORKS`, and all network metadata (`NETWORK_LABELS`, `NETWORK_RPC_URLS`) are defined **once** in `app/lib/ccc-client.ts`. All consumers import from this file — never redeclare the list or type elsewhere.

**Correct pattern (object-as-namespace + derived type):**

```ts
// app/lib/ccc-client.ts
export const Network = {
  Devnet:  "devnet",
  Testnet: "testnet",
  Mainnet: "mainnet",
} as const;
export type Network = (typeof Network)[keyof typeof Network];
// → "devnet" | "testnet" | "mainnet"

export const NETWORKS = Object.values(Network) as Network[];

export const NETWORK_LABELS: Record<Network, string> = { ... };
```

**Comparisons use named keys — not string literals:**

```ts
// Correct
if (network === Network.Testnet) { ... }

// Incorrect — magic string
if (network === "testnet") { ... }
```

**Import patterns:**

```ts
// Need to compare against specific values → value import
import { Network, NETWORKS } from "@/lib/ccc-client";

// Only need the type annotation → type-only import (no .Devnet access)
import { type Network } from "@/lib/ccc-client";
```

For the transferable principle behind this pattern, see `frontend-exp/best-practices/constants-guide`.
