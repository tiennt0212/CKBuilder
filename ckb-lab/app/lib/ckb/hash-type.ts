import type { ccc } from "@ckb-ccc/core";

/**
 * Named CKB hash_type values.
 *
 * CCC exports the `ccc.HashType` *type* and codec helpers, but no runtime list of the values —
 * so this object is the single source of the strings, and comparisons use named keys
 * (`HashType.Type`) instead of magic strings scattered across call sites. The type stays
 * `ccc.HashType`; `satisfies` just checks these values are valid members of it.
 */
export const HashType = {
  Type: "type",
  Data: "data",
  Data1: "data1",
  Data2: "data2",
} as const satisfies Record<string, ccc.HashType>;

/**
 * All four values, in UI order. Use when *referencing* an existing script (e.g. /invoke manual
 * mode), where any value the cell was deployed with is fair game — including legacy "data" (VM0).
 */
export const HASH_TYPES: ccc.HashType[] = Object.values(HashType);

/**
 * Values valid when *creating* a new script reference (Deploy, type-script presets).
 * "data" (VM0) is omitted: there is no reason to publish a new VM0 script. Referencing an
 * already-deployed VM0 cell still needs it, which is why HASH_TYPES above keeps it.
 */
export const HASH_TYPES_CREATE: ccc.HashType[] = [HashType.Type, HashType.Data1, HashType.Data2];
