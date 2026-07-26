import type { ccc } from "@ckb-ccc/core";

/**
 * Named CKB dep_type values.
 *
 * Mirrors the `ccc.DepType` type (which CCC ships without a runtime list). Note the value uses
 * CCC's camelCase spelling ("depGroup"); the on-chain / display spelling is "dep_group", kept
 * separately in DEP_TYPE_LABELS below so the two never drift.
 */
export const DepType = {
  Code: "code",
  DepGroup: "depGroup",
} as const satisfies Record<string, ccc.DepType>;

export const DEP_TYPES: ccc.DepType[] = Object.values(DepType);

/** Display label per dep_type — "dep_group" is the CKB on-chain spelling of "depGroup". */
export const DEP_TYPE_LABELS: Record<ccc.DepType, string> = {
  code: "code",
  depGroup: "dep_group",
};
