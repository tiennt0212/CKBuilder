"use client";
// WHY: client directive required — uses React state and browser APIs (navigator.clipboard).

import { useState } from "react";
import { CellFilter, outPointKey, useCellExplorer } from "./useCellExplorer";
import { CellListPanel } from "./CellListPanel";
import { CellDetailPanel } from "./CellDetailPanel";

export function CellExplorerForm() {
  const [address, setAddress] = useState("");
  const [filter, setFilter] = useState<CellFilter>(CellFilter.All);
  const [textSearch, setTextSearch] = useState("");
  // WHY: tracks whether the user has ever submitted a search so we can distinguish
  //      "initial state" empty from "queried but no results" empty.
  const [hasSearched, setHasSearched] = useState(false);

  const {
    cells,
    loading,
    loadingMore,
    error,
    addressError,
    hasMore,
    balance,
    selectedOutPoint,
    search: runSearch,
    loadMore,
    selectCell,
  } = useCellExplorer();

  const selectedCell = cells.find((c) => outPointKey(c) === selectedOutPoint) ?? null;

  const handleSubmit = () => {
    setHasSearched(true);
    void runSearch(address);
  };

  return (
    <div className="grid grid-cols-[1.5fr_1fr] gap-5 items-start">
      <CellListPanel
        cells={cells}
        loading={loading}
        loadingMore={loadingMore}
        error={error}
        addressError={addressError}
        hasMore={hasMore}
        balance={balance}
        hasSearched={hasSearched}
        selectedOutPoint={selectedOutPoint}
        filter={filter}
        textSearch={textSearch}
        address={address}
        onAddressChange={setAddress}
        onSubmit={handleSubmit}
        onFilterChange={setFilter}
        onTextSearchChange={setTextSearch}
        onLoadMore={() => void loadMore()}
        onSelectCell={selectCell}
      />
      <CellDetailPanel selectedCell={selectedCell} selectedOutPoint={selectedOutPoint} />
    </div>
  );
}
