---
name: ckbuilder-exp
description: CKBuilder project-specific reminders for CKB network constants and file locations. Use when working with CKB network types (devnet/testnet/mainnet), the ccc-client, or when unsure where project constants are defined. For general React/Next.js principles, see frontend-exp. For Ant Design and Tailwind v4 specifics, see antd-exp and tailwind-v4-exp.
license: MIT
metadata:
  author: ckbuilder-team
  version: "4.0.0"
---

# CKBuilder Experience

CKBuilder project-specific knowledge. This skill is intentionally project-scoped — it holds reminders for where things live and how they're named in this codebase. For transferable principles, see the Related Skills below.

## When to Apply

- Working with CKB network types (`devnet`, `testnet`, `mainnet`)
- Looking up where network constants or CCC client are defined
- Unsure which file exports `Network`, `NETWORKS`, or `NETWORK_LABELS`
- Comparing network values (use `Network.Testnet`, not `"testnet"`)

## Reminders

| Reminder | Type |
|---|---|
| `network-constants` — `Network` object, `NETWORKS`, `NETWORK_LABELS`, `NETWORK_RPC_URLS` all live in `app/lib/ccc-client.ts`; compare with `Network.Testnet` not `"testnet"` | file-location |

## Creating New Content

For template formats and directory structure conventions, see `exp-blueprint`.
- New rule → `exp-blueprint/templates/best-practices-rule.md`
- New reminder → `exp-blueprint/templates/reminder.md`

## Related Skills

- `exp-blueprint` — Directory layout and template formats for all -exp skills
- `frontend-exp` — General React/Next.js principles (state, routing, Storybook, TypeScript)
- `antd-exp` — Ant Design v5 deprecated APIs and component override patterns
- `tailwind-v4-exp` — `@theme inline` tokens and `!` suffix modifier
