---
title: Always set `fallbacks` explicitly when overriding a CCC client's RPC URL for devnet
impact: HIGH
tags: ccc, devnet, ckb-client, rpc
---

## Always set `fallbacks` explicitly when overriding a CCC client's RPC URL for devnet

**Impact: HIGH**

`ClientPublicTestnet`'s constructor defaults `fallbacks` to testnet URLs
(`wss://testnet.ckb.dev/ws`, `https://testnet.ckb.dev/`, `https://testnet.ckbapp.dev/`) whenever
you don't pass your own. Internally, `TransportFallback` keeps a single retry index that only
ever increments — never resets — for the entire lifetime of that client instance. The first time
ANY request fails against your devnet URL (index 0), the index advances and every subsequent
request through that same client silently, permanently routes to testnet instead. One flaky RPC
call anywhere in the app's lifetime is enough to mis-route for good, with no error surfaced.

**Incorrect (silently inherits testnet fallbacks):**

```ts
return new ccc.ClientPublicTestnet({
  url: DEVNET_RPC_URL,
  scripts: DEVNET_SCRIPTS,
});
```

**Correct (pins the fallback to the same devnet URL):**

```ts
return new ccc.ClientPublicTestnet({
  url: DEVNET_RPC_URL,
  fallbacks: [DEVNET_RPC_URL],
  scripts: DEVNET_SCRIPTS,
});
```
