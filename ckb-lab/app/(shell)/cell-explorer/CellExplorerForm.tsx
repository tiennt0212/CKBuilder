"use client";
// WHY: client directive required — uses React state and browser APIs.

import { useState } from "react";
import { CellFilter, outPointKey, useCellExplorer } from "@/features/wallet/useCellExplorer";
import { CellQuerySidebar } from "./CellQuerySidebar";
import { CellListPanel } from "./CellListPanel";
import { CellDetailDrawer } from "./CellDetailDrawer";

export function CellExplorerForm() {
  // ── Query form state (passed to sidebar + hook) ──────────────────────────
  const [lockAddress, setLockAddress] = useState("");
  const [typeScriptId, setTypeScriptId] = useState<string | null>(null);
  const [capacityMin, setCapacityMin] = useState("");
  const [capacityMax, setCapacityMax] = useState("");
  const [dataLenMin, setDataLenMin] = useState("");
  const [dataLenMax, setDataLenMax] = useState("");
  const [dataPattern, setDataPattern] = useState("");
  const [dataSearchMode, setDataSearchMode] = useState<"prefix" | "exact" | "partial">("prefix");

  // ── Client-side view state ────────────────────────────────────────────────
  const [filter, setFilter] = useState<CellFilter>(CellFilter.All);
  const [textSearch, setTextSearch] = useState("");

  // ── Server state from hook ────────────────────────────────────────────────
  const {
    cells,
    loading,
    loadingMore,
    error,
    addressError,
    hasMore,
    hasSearched,
    balance,
    stats,
    selectedOutPoint,
    search,
    loadMore,
    selectCell,
    deselectCell,
  } = useCellExplorer();

  const selectedCell = cells.find((c) => outPointKey(c) === selectedOutPoint) ?? null;

  const canQuery = !!lockAddress.trim() || !!typeScriptId;

  const handleQuery = () => {
    void search({
      lockAddress,
      typeScriptId,
      capacityMin,
      capacityMax,
      dataLenMin,
      dataLenMax,
      dataPattern,
      dataSearchMode,
    });
  };

  return (
    <div className="flex gap-5 h-full relative overflow-hidden">
      {/* Left: Query sidebar (fixed width) */}
      <div className="w-80 shrink-0 h-full">
        <CellQuerySidebar
          lockAddress={lockAddress}
          addressError={addressError}
          typeScriptId={typeScriptId}
          capacityMin={capacityMin}
          capacityMax={capacityMax}
          dataLenMin={dataLenMin}
          dataLenMax={dataLenMax}
          dataPattern={dataPattern}
          dataSearchMode={dataSearchMode}
          loading={loading}
          canQuery={canQuery}
          balance={balance}
          hasSearched={hasSearched}
          onLockAddressChange={setLockAddress}
          onTypeScriptChange={setTypeScriptId}
          onCapacityChange={(min, max) => {
            setCapacityMin(min);
            setCapacityMax(max);
          }}
          onDataLenChange={(min, max) => {
            setDataLenMin(min);
            setDataLenMax(max);
          }}
          onDataPatternChange={(pattern, mode) => {
            setDataPattern(pattern);
            setDataSearchMode(mode);
          }}
          onQuery={handleQuery}
        />
      </div>

      {/* Right: Main content + drawer overlay */}
      <div className="flex-1 min-w-0 relative h-full">
        <CellListPanel
          cells={cells}
          loading={loading}
          loadingMore={loadingMore}
          error={error}
          hasMore={hasMore}
          hasSearched={hasSearched}
          stats={stats}
          selectedOutPoint={selectedOutPoint}
          filter={filter}
          textSearch={textSearch}
          onFilterChange={setFilter}
          onTextSearchChange={setTextSearch}
          onLoadMore={() => void loadMore()}
          onSelectCell={selectCell}
        />

        {/* Cell detail drawer — absolute overlay from right edge */}
        {selectedCell && <CellDetailDrawer cell={selectedCell} onClose={deselectCell} />}
      </div>
    </div>
  );
}
