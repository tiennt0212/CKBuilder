---
title: Separate ccc.Address.fromString errors from network call errors
type: gotcha
applies-to: "@ckb-ccc/core ccc.Address"
---

## Separate `ccc.Address.fromString` errors from network call errors

`ccc.Address.fromString(addr, client)` is `async` and **throws** on invalid format or wrong-network address. If it shares a `catch` block with subsequent network calls, network errors will surface as "Invalid address" in the UI.

```typescript
// ✅ Two separate try/catch — address error shown under input, network error in footer
let lockScript: ccc.Script;
try {
  lockScript = (await ccc.Address.fromString(addr, cccClient)).script;
} catch (err) {
  setAddressError(err instanceof Error ? err.message : "Invalid address");
  return;
}

try {
  const response = await cccClient.findCellsPaged(...);
  // ...
} catch (err) {
  setError(err instanceof Error ? err.message : "Failed to fetch cells");
}

// ❌ Single catch — network errors incorrectly show as address errors
try {
  const lock = (await ccc.Address.fromString(addr, cccClient)).script;
  const response = await cccClient.findCellsPaged(...);
} catch (err) {
  setAddressError("Invalid address"); // wrong if findCellsPaged threw
}
```
