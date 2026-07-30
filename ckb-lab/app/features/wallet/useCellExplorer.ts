"use client";
// WHY: client directive required — uses React hooks (useState, useCallback).

import { useState, useCallback } from "react";
import { ccc, KnownScript } from "@ckb-ccc/core";
import { useCcc } from "@ckb-ccc/connector-react";
import { useNetworkStore } from "@/stores/network";
import { ckbToShannons } from "@/lib/format";

// ─── Cell classification ──────────────────────────────────────────────────────

export const CellType = {
  PlainCkb: "Plain CKB",
  DataCell: "Data Cell",
  UdtCell: "UDT Cell",
  ScriptCell: "Script Cell",
} as const;
export type CellType = (typeof CellType)[keyof typeof CellType];

export const CellFilter = { All: "All", ...CellType } as const;
export type CellFilter = (typeof CellFilter)[keyof typeof CellFilter];
export const CELL_FILTERS = Object.values(CellFilter) as CellFilter[];

/** Stable key for a cell out-point: `txHash#index` */
export function outPointKey(cell: ccc.Cell): string {
  return `${cell.outPoint.txHash}#${cell.outPoint.index}`;
}

/**
 * Classify a live cell into one of four display categories.
 * WHY: exported so sub-components can use it in column renders without re-implementing.
 */
export function classifyCell(cell: ccc.Cell): CellType {
  const hasType = !!cell.cellOutput.type;
  const hasData = cell.outputData !== undefined && cell.outputData !== "0x";
  // WHY: (len - 2) / 2 converts hex string length to byte count ("0x" prefix + 2 chars/byte).
  const dataByteLength = hasData ? (cell.outputData.length - 2) / 2 : 0;

  if (!hasType && !hasData) return CellType.PlainCkb;
  if (!hasType && hasData) return CellType.DataCell;
  // WHY: xUDT/sUDT token amounts are stored as 16-byte (128-bit LE) integers in output data.
  if (hasType && hasData && dataByteLength === 16) return CellType.UdtCell;
  return CellType.ScriptCell;
}

// ─── Type script presets ──────────────────────────────────────────────────────

export const BUILTIN_DAO = "__builtin__nervos-dao";
export const BUILTIN_XUDT = "__builtin__xudt";
export const BUILTIN_SPORE = "__builtin__spore";

// WHY: Spore is not in KnownScript enum — code hashes hardcoded per network.
const SPORE_SCRIPTS: Partial<
  Record<string, { codeHash: string; hashType: "type" | "data1" | "data2" }>
> = {
  testnet: {
    codeHash: "0x685a60219309029d01310311dba953d67029170ca4848a4ff638e57002130a0",
    hashType: "data1",
  },
  mainnet: {
    codeHash: "0x4a4dce1df3dffff7f8c8cd1f3152768af81fbc62b9a9ef7c7c672c9d52cbbed6",
    hashType: "data1",
  },
};

// ─── Saved type scripts (localStorage) ───────────────────────────────────────

export const LS_PRESETS_KEY = "ckbuilder:typeScriptPresets";

export interface SavedTypeScript {
  label: string;
  codeHash: string;
  hashType: "type" | "data1" | "data2";
  args: string;
  memo?: string;
  network: string;
}

/** Key format: `__saved__<codeHash>__<network>` */
export function savedTypeScriptId(entry: SavedTypeScript): string {
  return `__saved__${entry.codeHash}__${entry.network}`;
}

export function loadSavedTypeScripts(): SavedTypeScript[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(LS_PRESETS_KEY) ?? "[]") as SavedTypeScript[];
  } catch {
    return [];
  }
}

export function saveSavedTypeScripts(scripts: SavedTypeScript[]): void {
  localStorage.setItem(LS_PRESETS_KEY, JSON.stringify(scripts));
}

// ─── Query params ─────────────────────────────────────────────────────────────

export interface QueryParams {
  /** CKB address string; "" = no lock filter */
  lockAddress: string;
  /** BUILTIN_DAO | BUILTIN_XUDT | BUILTIN_SPORE | savedTypeScriptId(...) | null */
  typeScriptId: string | null;
  /** CKB strings; "" = no bound */
  capacityMin: string;
  capacityMax: string;
  /** Byte counts as strings; "" = no bound */
  dataLenMin: string;
  dataLenMax: string;
  /** Hex pattern; "" = no filter */
  dataPattern: string;
  dataSearchMode: "prefix" | "exact" | "partial";
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export interface CellStats {
  count: number;
  totalCkb: bigint;
}

function computeStats(cells: ccc.Cell[]): CellStats {
  const count = cells.length;
  const totalCkb = cells.reduce((s, c) => s + BigInt(c.cellOutput.capacity.toString()), 0n);
  return { count, totalCkb };
}

// ─── Type resolution helper ───────────────────────────────────────────────────

async function resolveTypeScript(
  id: string,
  cccClient: ccc.Client,
  network: string
): Promise<{ codeHash: string; hashType: string; args: string } | null> {
  if (id === BUILTIN_DAO) {
    const info = await cccClient.getKnownScript(KnownScript.NervosDao);
    return { codeHash: info.codeHash, hashType: info.hashType, args: "0x" };
  }
  if (id === BUILTIN_XUDT) {
    const info = await cccClient.getKnownScript(KnownScript.XUdt);
    return { codeHash: info.codeHash, hashType: info.hashType, args: "0x" };
  }
  if (id === BUILTIN_SPORE) {
    const spore = SPORE_SCRIPTS[network];
    if (!spore) return null;
    return { ...spore, args: "0x" };
  }
  if (id.startsWith("__saved__")) {
    // Key format: "__saved__<codeHash>__<network>"
    // WHY: lastIndexOf("__") handles codeHash values that might start with "0x" (no "__" there)
    //      but if someone creates a label with "__" it won't affect the key.
    const keyBody = id.slice("__saved__".length);
    const sep = keyBody.lastIndexOf("__");
    if (sep === -1) return null;
    const codeHash = keyBody.slice(0, sep);
    const savedNetwork = keyBody.slice(sep + 2);
    const entry = loadSavedTypeScripts().find(
      (e) => e.codeHash === codeHash && e.network === savedNetwork
    );
    if (!entry) return null;
    return { codeHash: entry.codeHash, hashType: entry.hashType, args: entry.args };
  }
  return null;
}

// ─── Hook interface ───────────────────────────────────────────────────────────

export interface CellExplorerHookReturn {
  cells: ccc.Cell[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  addressError: string | null;
  hasMore: boolean;
  hasSearched: boolean;
  balance: bigint | null;
  stats: CellStats | null;
  totalCapacity: bigint | null;
  selectedOutPoint: string | null;
  search: (params: QueryParams) => Promise<void>;
  loadMore: () => Promise<void>;
  selectCell: (key: string) => void;
  deselectCell: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

export function useCellExplorer(): CellExplorerHookReturn {
  const network = useNetworkStore((s) => s.network);
  const { client: cccClient } = useCcc();

  const [cells, setCells] = useState<ccc.Cell[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [lastCursor, setLastCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [stats, setStats] = useState<CellStats | null>(null);
  const [totalCapacity, setTotalCapacity] = useState<bigint | null>(null);
  const [selectedOutPoint, setSelectedOutPoint] = useState<string | null>(null);
  // WHY: cache the full searchKey so loadMore can reuse it without re-parsing params.
  const [lastSearchKey, setLastSearchKey] = useState<
    Parameters<typeof cccClient.findCellsPaged>[0] | null
  >(null);

  const search = useCallback(
    async (params: QueryParams) => {
      setAddressError(null);
      setError(null);
      setCells([]);
      setHasMore(false);
      setBalance(null);
      setStats(null);
      setTotalCapacity(null);
      setLastCursor(undefined);
      setSelectedOutPoint(null);
      setLastSearchKey(null);

      const hasLock = !!params.lockAddress.trim();
      const hasType = !!params.typeScriptId;
      if (!hasLock && !hasType) return;

      setLoading(true);
      setHasSearched(true);

      try {
        // Resolve lock script from address
        let lockScript: { codeHash: string; hashType: string; args: string } | null = null;
        if (hasLock) {
          try {
            const parsed = await ccc.Address.fromString(params.lockAddress.trim(), cccClient);
            lockScript = {
              codeHash: parsed.script.codeHash,
              hashType: parsed.script.hashType,
              args: parsed.script.args,
            };
          } catch (err: unknown) {
            setAddressError(err instanceof Error ? err.message : "Invalid address");
            setLoading(false);
            return;
          }
        }

        // Resolve type script from preset/saved ID
        let typeScript: { codeHash: string; hashType: string; args: string } | null = null;
        if (hasType) {
          try {
            typeScript = await resolveTypeScript(params.typeScriptId!, cccClient, network);
          } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to resolve type script");
            setLoading(false);
            return;
          }
          if (!typeScript) {
            setError(`Type script "${params.typeScriptId}" not available on ${network}`);
            setLoading(false);
            return;
          }
        }

        // Build filter object for server-side filtering
        const filter: Record<string, unknown> = {};
        // WHY: when querying by lock AND type, the type script goes in filter.script.
        if (lockScript && typeScript) filter.script = typeScript;
        if (params.capacityMin || params.capacityMax) {
          const min = params.capacityMin ? ckbToShannons(params.capacityMin) : 0n;
          // WHY: indexer range is [min, max) exclusive — add 1 shannon for inclusive upper bound.
          const max = params.capacityMax
            ? ckbToShannons(params.capacityMax) + 1n
            : 0xffffffffffffffffn;
          filter.outputCapacityRange = [min, max];
        }
        if (params.dataLenMin || params.dataLenMax) {
          const min = params.dataLenMin ? BigInt(params.dataLenMin) : 0n;
          const max = params.dataLenMax ? BigInt(params.dataLenMax) + 1n : 0xffffffffffffffffn;
          filter.outputDataLenRange = [min, max];
        }
        if (params.dataPattern) {
          filter.outputData = params.dataPattern;
          filter.outputDataSearchMode = params.dataSearchMode;
        }

        // Primary script: lock if present, type otherwise
        const primaryScript = lockScript ?? typeScript!;
        const scriptType = lockScript ? ("lock" as const) : ("type" as const);

        const searchKey = {
          script: primaryScript,
          scriptType,
          scriptSearchMode: "exact" as const,
          withData: true,
          ...(Object.keys(filter).length > 0 ? { filter } : {}),
        };
        setLastSearchKey(searchKey);

        // WHY: run in parallel — getCellsCapacity gives total across all pages without fetching them.
        const [response, totalCap] = await Promise.all([
          cccClient.findCellsPaged(searchKey, "desc", PAGE_SIZE, undefined),
          cccClient.getCellsCapacity(searchKey),
        ]);

        setCells(response.cells);
        setLastCursor(response.lastCursor);
        setHasMore(response.cells.length >= PAGE_SIZE);
        setStats(computeStats(response.cells));
        setTotalCapacity(BigInt(totalCap.toString()));

        // Balance only meaningful when querying by lock (owner)
        if (lockScript) {
          const bal = await cccClient.getBalanceSingle(lockScript as ccc.Script);
          setBalance(bal);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to fetch cells");
      } finally {
        setLoading(false);
      }
    },
    [cccClient, network]
  );

  const loadMore = useCallback(async () => {
    if (!lastSearchKey || !hasMore || loadingMore) return;

    setLoadingMore(true);
    setError(null);
    try {
      const response = await cccClient.findCellsPaged(lastSearchKey, "desc", PAGE_SIZE, lastCursor);
      // WHY: use functional update to read current cells without adding them to dependency array.
      setCells((prev) => {
        const updated = [...prev, ...response.cells];
        setStats(computeStats(updated));
        return updated;
      });
      setLastCursor(response.lastCursor);
      setHasMore(response.cells.length >= PAGE_SIZE);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load more cells");
    } finally {
      setLoadingMore(false);
    }
  }, [lastSearchKey, hasMore, loadingMore, lastCursor, cccClient]);

  const selectCell = useCallback((key: string) => setSelectedOutPoint(key), []);
  const deselectCell = useCallback(() => setSelectedOutPoint(null), []);

  return {
    cells,
    loading,
    loadingMore,
    error,
    addressError,
    hasMore,
    hasSearched,
    balance,
    stats,
    totalCapacity,
    selectedOutPoint,
    search,
    loadMore,
    selectCell,
    deselectCell,
  };
}
