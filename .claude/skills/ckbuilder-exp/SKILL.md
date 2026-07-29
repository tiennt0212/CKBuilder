---
name: ckbuilder-exp
description: CKBuilder project-specific reminders for CKB network constants, CCC SDK gotchas, and file locations. Use when working with CKB network types (devnet/testnet/mainnet), querying cells via cccClient, calculating cell capacity, or handling CKB address parsing errors. For general React/Next.js principles, see frontend-exp. For Ant Design and Tailwind v4 specifics, see antd-exp and tailwind-v4-exp.
license: MIT
metadata:
  author: ckbuilder-team
  version: "4.1.0"
---

# CKBuilder Experience

CKBuilder project-specific knowledge. This skill is intentionally project-scoped — it holds reminders for where things live and how they're named in this codebase. For transferable principles, see the Related Skills below.

## When to Apply

- Working with CKB network types (`devnet`, `testnet`, `mainnet`)
- Looking up where network constants or CCC client are defined
- Unsure which file exports `Network`, `NETWORKS`, or `NETWORK_LABELS`
- Comparing network values (use `Network.Testnet`, not `"testnet"`)
- Displaying or calculating cell capacity (occupied / free)
- Choosing between `findCellsPaged` and async generator APIs
- Handling `ccc.Address.fromString` errors in a hook

## Best Practices

| Priority | Rule | Impact |
|----------|------|--------|
| 1 | `ccc-devnet-client-fallbacks` — always pass `fallbacks: [devnetUrl]` when overriding a CCC client's RPC URL for devnet, or one flaky request permanently mis-routes to testnet | HIGH |
| 2 | `ccc-devnet-scripts-spread-testnet` — build a devnet `KnownScript` map by spreading `TESTNET_SCRIPTS`, not listing entries from scratch, or `getKnownScript()` throws uncaught for any script you didn't list | HIGH |

## Reminders

| Reminder | Type |
|---|---|
| `network-constants` — `Network` object, `NETWORKS`, `NETWORK_LABELS`, `NETWORK_RPC_URLS` all live in `app/lib/ccc-client.ts`; compare with `Network.Testnet` not `"testnet"` | file-location |
| `ccc-cell-capacity-getters` — use `cell.occupiedSize` + `ccc.fixedPointFrom()` and `cell.capacityFree`; manual `lock.args.length` math misses code_hash, hash_type, type script, outputData | gotcha |
| `ccc-pagination-vs-generator` — `findCellsPaged` returns `{ cells, lastCursor }` for UI pagination; `findCellsByLock` / `findCells` return `AsyncGenerator<Cell>` for one-shot iteration — do not mix | gotcha |
| `ccc-address-fromstring-error` — `ccc.Address.fromString` throws on invalid/wrong-network address; use a separate `try/catch` from subsequent network calls so errors appear in the right UI location | gotcha |

## Creating New Content

For template formats and directory structure conventions, see `exp-blueprint`.
- New rule → `exp-blueprint/templates/best-practices-rule.md`
- New reminder → `exp-blueprint/templates/reminder.md`

## Related Skills

- `exp-blueprint` — Directory layout and template formats for all -exp skills
- `frontend-exp` — General React/Next.js principles (state, routing, Storybook, TypeScript)
- `antd-exp` — Ant Design v5 deprecated APIs and component override patterns
- `tailwind-v4-exp` — `@theme inline` tokens and `!` suffix modifier
