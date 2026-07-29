import { ccc } from "@ckb-ccc/core";

/**
 * Registry of live counter cells this browser has created via /counter.
 *
 * Unlike /deploy's registry (which records a script *binary*), this records a specific
 * *cell instance* the user owns — its outpoint changes on every increment, so entries are
 * re-keyed rather than appended to, mirroring how /registry's edit flow already re-keys a
 * DeployedScript when txHash/index/network change.
 *
 * Mirrors deployed-scripts.ts's shape and functions 1:1 — same guards, same failure behaviour.
 */

export const LS_COUNTER_CELLS_KEY = "ckbuilder:counterCells";

/** Identifies a deployed counter script well enough to build a cell dep against it. */
export interface CounterScriptRef {
  codeHash: string;
  hashType: ccc.HashType;
  depType?: ccc.DepType;
  cellDep: { txHash: string; index: number };
}

export interface CounterCell {
  /** `${txHash}:${index}:${network}` */
  id: string;
  outPoint: { txHash: string; index: number };
  /**
   * Decimal-string bigint, not `bigint` — JSON.stringify throws on a raw bigint, and every
   * other localStorage entry in this app is plain-JSON-safe. Parse with BigInt(entry.count).
   */
  count: string;
  /**
   * Denormalized copy of the script identity, pinned at CREATE time. Deliberately not a live
   * join into the deployed-scripts registry by id: the on-chain type script this cell actually
   * carries is fixed forever once created, but a registry entry can later be edited, hidden, or
   * deleted. A live join would silently desync from what's actually on-chain, or break entirely
   * if the registry entry disappears — this store must survive both.
   */
  script: CounterScriptRef;
  /** Entries are network-scoped and filtered on read, same reasoning as deployed-scripts.ts. */
  network: string;
  label?: string;
  /** ISO8601, set once at creation. */
  createdAt: string;
  /** ISO8601, bumped on every increment. */
  updatedAt: string;
}

export function counterCellId(txHash: string, index: number, network: string): string {
  return `${txHash}:${index}:${network}`;
}

/** Every entry across all networks. The store needs this to mutate without losing other
 * networks' entries; UI should prefer loadCounterCells(network). */
export function readAllCounterCells(): CounterCell[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(LS_COUNTER_CELLS_KEY) ?? "[]") as CounterCell[];
  } catch {
    return [];
  }
}

export function loadCounterCells(network: string): CounterCell[] {
  return readAllCounterCells()
    .filter((c) => c.network === network)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function saveCounterCell(entry: CounterCell): void {
  if (typeof window === "undefined") return;
  const all = readAllCounterCells();
  // Replace rather than append: the id encodes the current outpoint, so a stale duplicate
  // under the same id would only happen from a re-render, not a genuine second cell.
  const next = [entry, ...all.filter((c) => c.id !== entry.id)];
  localStorage.setItem(LS_COUNTER_CELLS_KEY, JSON.stringify(next));
}

export function removeCounterCell(id: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    LS_COUNTER_CELLS_KEY,
    JSON.stringify(readAllCounterCells().filter((c) => c.id !== id))
  );
}
