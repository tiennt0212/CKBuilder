---
title: Use ccc.Cell capacity getters instead of manual calculation
type: gotcha
applies-to: "@ckb-ccc/core ccc.Cell"
---

## Use `ccc.Cell` capacity getters instead of manual calculation

`ccc.Cell` (extends `CellAny`) exposes two getters that calculate capacity correctly:

| Getter | Returns | What it includes |
|---|---|---|
| `cell.occupiedSize` | `number` (bytes) | capacity field (8) + lock code_hash + hash_type + lock args + type script (if any) + outputData |
| `cell.capacityFree` | `bigint` (shannons) | `capacity − fixedPointFrom(occupiedSize)` |

- ✅ `ccc.fixedPointFrom(cell.occupiedSize)` → occupied shannons
- ✅ `cell.capacityFree` → free shannons
- ❌ `BigInt((lock.args.length - 2) / 2) * 100_000_000n` → only counts lock args bytes, misses code_hash, hash_type, type script, and outputData
