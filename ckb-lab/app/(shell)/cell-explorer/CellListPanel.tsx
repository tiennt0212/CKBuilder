"use client";

import { Card, Input, Button, Table, Spin, Empty } from "antd";
import type { TableColumnsType } from "antd";
import { SearchOutlined, LoadingOutlined } from "@ant-design/icons";
import { ccc } from "@ckb-ccc/core";
import { Badge } from "@/components/ui/Badge";
import { SummaryPanel, SummaryRow } from "@/components/ui/SummaryPanel";
import { formatCapacity, truncateAddress } from "@/lib/format";
import { useNetworkStore } from "@/stores/network";
import {
  CellFilter,
  CellType,
  CELL_FILTERS,
  classifyCell,
  outPointKey,
} from "./useCellExplorer";

const CARD_STYLE = {
  borderRadius: 12,
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow)",
};
const HEAD_STYLE = { padding: "16px 18px", borderBottom: "1px solid var(--border)" };

const COL_HEADER = (label: string) => (
  <span className="text-[10.5px] font-semibold uppercase tracking-widest2 text-text-3 whitespace-nowrap">
    {label}
  </span>
);

interface CellListPanelProps {
  cells: ccc.Cell[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  addressError: string | null;
  hasMore: boolean;
  balance: bigint | null;
  hasSearched: boolean;
  selectedOutPoint: string | null;
  filter: CellFilter;
  textSearch: string;
  address: string;
  onAddressChange: (v: string) => void;
  onSubmit: () => void;
  onFilterChange: (f: CellFilter) => void;
  onTextSearchChange: (v: string) => void;
  onLoadMore: () => void;
  onSelectCell: (key: string) => void;
}

export function CellListPanel({
  cells,
  loading,
  loadingMore,
  error,
  addressError,
  hasMore,
  balance,
  hasSearched,
  selectedOutPoint,
  filter,
  textSearch,
  address,
  onAddressChange,
  onSubmit,
  onFilterChange,
  onTextSearchChange,
  onLoadMore,
  onSelectCell,
}: CellListPanelProps) {
  const { lockLabelMap } = useNetworkStore();

  const filteredCells = cells.filter((cell) => {
    const matchesFilter =
      filter === CellFilter.All || classifyCell(cell) === filter;
    const key = outPointKey(cell);
    const lock =
      lockLabelMap[cell.cellOutput.lock.codeHash] ??
      `${cell.cellOutput.lock.codeHash.slice(0, 10)}…`;
    const q = textSearch.toLowerCase();
    const matchesSearch =
      !q || key.toLowerCase().includes(q) || lock.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  const showAddressPrompt = !hasSearched && !loading;
  const showNoCells = hasSearched && !loading && !addressError && cells.length === 0;
  const showNoFilterMatch = !loading && cells.length > 0 && filteredCells.length === 0;

  const columns: TableColumnsType<ccc.Cell> = [
    {
      title: COL_HEADER("Capacity"),
      render: (_, cell) => (
        <span className="font-semibold text-text-1 tabular-nums">
          {formatCapacity(cell.cellOutput.capacity)}{" "}
          <em className="not-italic text-2xs text-text-3 font-normal">CKB</em>
        </span>
      ),
    },
    {
      title: COL_HEADER("Lock"),
      render: (_, cell) => {
        const label =
          lockLabelMap[cell.cellOutput.lock.codeHash] ??
          `${cell.cellOutput.lock.codeHash.slice(0, 10)}…`;
        return <span className="text-text-2">{label}</span>;
      },
    },
    {
      title: COL_HEADER("Type"),
      render: (_, cell) => {
        const type = classifyCell(cell);
        return type === CellType.PlainCkb ? (
          <span className="text-text-3">—</span>
        ) : (
          <Badge
            variant={
              type === CellType.UdtCell
                ? "xudt"
                : type === CellType.ScriptCell
                  ? "rust"
                  : "generic"
            }
          >
            {type}
          </Badge>
        );
      },
    },
    {
      title: COL_HEADER("Out-point"),
      render: (_, cell) => (
        <span className="font-mono text-hint text-text-3 whitespace-nowrap">
          {truncateAddress(outPointKey(cell), 6)}
        </span>
      ),
    },
  ];

  return (
    <Card
      title={
        <div>
          <div className="text-subhead font-semibold text-text-1">Live Cells</div>
          <div className="text-hint text-text-3 font-normal">
            {cells.length > 0
              ? `${cells.length} cells loaded${
                  balance !== null ? ` · ${formatCapacity(balance)} CKB total` : ""
                }`
              : "Enter a CKB address to query live cells"}
          </div>
        </div>
      }
      extra={
        <div className="flex gap-1.5 flex-wrap">
          {CELL_FILTERS.map((f) => (
            <Button
              key={f}
              onClick={() => onFilterChange(f)}
              className={
                f === filter
                  ? "bg-primary-tint! border-transparent! text-primary! font-semibold!"
                  : "bg-bg-elev! border-input-border! text-text-2! hover:border-primary! hover:text-primary!"
              }
              style={{ fontSize: 12, height: "auto", padding: "7px 12px", borderRadius: 8 }}
            >
              {f}
            </Button>
          ))}
        </div>
      }
      style={CARD_STYLE}
      styles={{ header: HEAD_STYLE, body: { padding: "18px 18px 0" } }}
    >
      {/* Address input */}
      <div className="flex gap-2 mb-2">
        <Input
          placeholder="Enter CKB address (ckt1… or ckb1…)"
          value={address}
          onChange={(e) => onAddressChange(e.target.value)}
          onPressEnter={onSubmit}
          status={addressError ? "error" : undefined}
          style={{ height: 40 }}
          className="font-mono flex-1"
        />
        <Button type="primary" onClick={onSubmit} loading={loading} style={{ height: 40 }}>
          Query
        </Button>
      </div>
      {addressError && <div className="text-rust text-hint mb-3">{addressError}</div>}

      {/* Text search */}
      <Input
        prefix={<SearchOutlined className="text-text-3" />}
        placeholder="Filter by out-point or lock hash…"
        value={textSearch}
        onChange={(e) => onTextSearchChange(e.target.value)}
        style={{ height: 40 }}
        className="mb-[14px]"
      />

      {/* Table */}
      <div className="-mx-[18px]">
        <Spin spinning={loading} indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />}>
          {showAddressPrompt && (
            <div className="py-10 px-6">
              <Empty description="Enter a CKB address above to explore its live cells" />
            </div>
          )}
          {showNoCells && (
            <div className="py-10 px-6">
              <Empty description="No live cells found for this address" />
            </div>
          )}
          {showNoFilterMatch && (
            <div className="py-10 px-6">
              <Empty description={`No cells match the "${filter}" filter`} />
            </div>
          )}
          {filteredCells.length > 0 && (
            <Table
              columns={columns}
              dataSource={filteredCells}
              rowKey={(cell) => outPointKey(cell)}
              size="middle"
              pagination={false}
              onRow={(cell) => ({
                onClick: () => onSelectCell(outPointKey(cell)),
                style:
                  outPointKey(cell) === selectedOutPoint
                    ? { background: "var(--primary-tint)" }
                    : undefined,
                className: "cursor-pointer",
              })}
            />
          )}
        </Spin>
      </div>

      {/* Load More + error + balance footer */}
      {(hasMore || error || balance !== null) && (
        <div className="pt-3 pb-4 flex flex-col gap-3">
          {error && <div className="text-rust text-hint">{error}</div>}
          {hasMore && (
            <Button
              block
              onClick={onLoadMore}
              loading={loadingMore}
              style={{ height: 40 }}
            >
              Load More
            </Button>
          )}
          {balance !== null && (
            <SummaryPanel>
              <SummaryRow
                label="Total Balance"
                value={formatCapacity(balance)}
                unit="CKB"
                strong
              />
            </SummaryPanel>
          )}
        </div>
      )}
    </Card>
  );
}
