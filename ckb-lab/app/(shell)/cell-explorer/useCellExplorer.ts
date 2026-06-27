"use client";
// WHY: client directive required — useState and useCallback are React client-only hooks.

import { useState, useCallback } from "react";
import { ccc } from "@ckb-ccc/core";
import { useNetworkStore } from "@/stores/network";

// ─── Cell classification constants ───────────────────────────────────────────

export const CellType = {
  PlainCkb:   "Plain CKB",
  DataCell:   "Data Cell",
  UdtCell:    "UDT Cell",
  ScriptCell: "Script Cell",
} as const;
export type CellType = (typeof CellType)[keyof typeof CellType];

// WHY: spread CellType so CellFilter values are derived — no manual duplication.
export const CellFilter = { All: "All", ...CellType } as const;
export type CellFilter = (typeof CellFilter)[keyof typeof CellFilter];

export const CELL_FILTERS = Object.values(CellFilter) as CellFilter[];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

/** Stable key for a cell out-point: `txHash#index` */
export function outPointKey(cell: ccc.Cell): string {
  return `${cell.outPoint.txHash}#${cell.outPoint.index}`;
}

/**
 * Classify a live cell into one of four display categories.
 *
 * WHY: pure function exported so sub-components can call it in column render
 *      without re-implementing the logic.
 *
 * "Typed Data Cell" (NFT / Spore — hasType + data ≠ 16 bytes) maps to ScriptCell because
 * no separate filter pill is defined for it; this keeps the filter set to 4 values.
 */
export function classifyCell(cell: ccc.Cell): CellType {
  const hasType = !!cell.cellOutput.type;
  // WHY: CKB canonical empty-data sentinel is "0x"; undefined also means no data attached.
  const hasData = cell.outputData !== undefined && cell.outputData !== "0x";
  // WHY: hex string = "0x" prefix + 2 hex chars per byte → byte count = (len − 2) / 2.
  const dataByteLength = hasData ? (cell.outputData.length - 2) / 2 : 0;

  if (!hasType && !hasData) return CellType.PlainCkb;
  if (!hasType && hasData)  return CellType.DataCell;
  // WHY: xUDT token amounts are stored as a 16-byte little-endian u128 in output data.
  //      Checking byte length is a heuristic, not a definitive proof of xUDT type.
  if (hasType && hasData && dataByteLength === 16) return CellType.UdtCell;
  // Covers: hasType + no data (bare Script Cell) AND hasType + data ≠ 16 bytes (NFT/Spore).
  return CellType.ScriptCell;
}

// ─── Hook interface ───────────────────────────────────────────────────────────

export interface CellExplorerHookReturn {
  cells: ccc.Cell[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  addressError: string | null;
  hasMore: boolean;
  balance: bigint | null;
  selectedOutPoint: string | null;
  search: (addr: string) => Promise<void>;
  loadMore: () => Promise<void>;
  selectCell: (outPointKey: string) => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCellExplorer(): CellExplorerHookReturn {
  const { cccClient } = useNetworkStore();

  const [cells, setCells] = useState<ccc.Cell[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
  // WHY: cursor persists across filter-pill changes because filtering is entirely client-side;
  //      the cursor is only reset when the user submits a new address query.
  const [lastCursor, setLastCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [selectedOutPoint, setSelectedOutPoint] = useState<string | null>(null);
  // WHY: storing the decoded lock script lets loadMore re-use it without the caller
  //      re-supplying the raw address string on every "Load More" click.
  const [currentLockScript, setCurrentLockScript] = useState<ccc.Script | null>(null);

  const search = useCallback(
    async (addr: string) => {
      // Full reset before each new address search.
      setAddressError(null);
      setError(null);
      setCells([]);
      setHasMore(false);
      setBalance(null);
      setLastCursor(undefined);
      setSelectedOutPoint(null);
      setCurrentLockScript(null);

      if (!addr.trim()) return;

      setLoading(true);

      // WHY: two separate try/catch blocks so address-format errors (shown under the input)
      //      are never confused with network errors (shown in the footer error area).
      let lockScript: ccc.Script;
      try {
        const parsed = await ccc.Address.fromString(addr, cccClient);
        lockScript = parsed.script;
        setCurrentLockScript(lockScript);
      } catch (err: unknown) {
        // ccc.Address.fromString throws with a descriptive message on invalid / wrong-network input.
        const msg = err instanceof Error ? err.message : "Invalid address";
        setAddressError(msg);
        setLoading(false);
        return;
      }

      try {
        const searchKey = {
          script: lockScript,
          scriptType: "lock" as const,
          scriptSearchMode: "exact" as const,
          withData: true,
        };
        const response = await cccClient.findCellsPaged(searchKey, "desc", PAGE_SIZE, undefined);
        setCells(response.cells);
        setLastCursor(response.lastCursor);
        // WHY: fewer results than PAGE_SIZE means the indexer has no more pages — hide Load More.
        setHasMore(response.cells.length >= PAGE_SIZE);

        const bal = await cccClient.getBalanceSingle(lockScript);
        setBalance(bal);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to fetch cells";
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [cccClient],
  );

  const loadMore = useCallback(async () => {
    if (!currentLockScript || !hasMore || loadingMore) return;

    setLoadingMore(true);
    setError(null);
    try {
      const searchKey = {
        script: currentLockScript,
        scriptType: "lock" as const,
        scriptSearchMode: "exact" as const,
        withData: true,
      };
      const response = await cccClient.findCellsPaged(searchKey, "desc", PAGE_SIZE, lastCursor);
      // WHY: append to existing list — Load More is additive, not a full page-replace.
      setCells((prev) => [...prev, ...response.cells]);
      setLastCursor(response.lastCursor);
      // WHY: updating cursor here does NOT reset filter state — filter is purely client-side
      //      and must not trigger a re-fetch; only a new address search resets everything.
      setHasMore(response.cells.length >= PAGE_SIZE);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load more cells";
      setError(msg);
    } finally {
      setLoadingMore(false);
    }
  }, [currentLockScript, hasMore, loadingMore, lastCursor, cccClient]);

  const selectCell = useCallback((key: string) => {
    setSelectedOutPoint(key);
  }, []);

  return {
    cells,
    loading,
    loadingMore,
    error,
    addressError,
    hasMore,
    balance,
    selectedOutPoint,
    search,
    loadMore,
    selectCell,
  };
}
