---
title: Build a devnet KnownScript map by spreading TESTNET_SCRIPTS, not listing from scratch
impact: HIGH
tags: ccc, devnet, known-script, wallet-connector
---

## Build a devnet KnownScript map by spreading TESTNET_SCRIPTS, not listing from scratch

**Impact: HIGH**

`client.getKnownScript()` is a synchronous, local-only map lookup (`this.scripts[script]`) — no
RPC call — and throws if the key is missing. A hand-curated partial map (e.g. 5 of ~19
`KnownScript` entries) throws uncaught the moment any code path asks for a script outside that
list. The most dangerous caller is third-party wallet-connector logic (e.g. MetaMask/eip6963
probing both OmniLock and PWLock during its own connect/address-resolution flow) — the uncaught
error can abort the connector's signer refresh mid-flight, leaving the wallet bound to a stale
client indefinitely with no visible error.

**Incorrect (throws for any KnownScript not explicitly listed):**

```ts
export const DEVNET_SCRIPTS: Record<string, ScriptInfo> = {
  [KnownScript.Secp256k1Blake160]: { ... },
  [KnownScript.OmniLock]: { ... },
  // PWLock, JoyId, COTA, NervosDao, ... all missing -> throw on lookup
};
```

**Correct (unlisted scripts still resolve, to the testnet default, instead of throwing):**

```ts
import { TESTNET_SCRIPTS } from "@ckb-ccc/core/advanced";

export const DEVNET_SCRIPTS: Record<string, ScriptInfo> = {
  ...(TESTNET_SCRIPTS as unknown as Record<string, ScriptInfo>),
  [KnownScript.Secp256k1Blake160]: { ... }, // offCKB's actual devnet deployment
  [KnownScript.OmniLock]: { ... },
};
```
