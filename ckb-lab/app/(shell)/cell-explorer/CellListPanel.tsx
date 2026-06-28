"use client";

import { Card, Input, Button, Table, Spin, Empty } from "antd";
import type { TableColumnsType } from "antd";
import { SearchOutlined, LoadingOutlined } from "@ant-design/icons";
import { ccc } from "@ckb-ccc/core";
import { Badge } from "@/components/ui/Badge";
import { formatCapacity, truncateAddress } from "@/lib/format";
import { useNetworkStore } from "@/stores/network";
import {
  CellFilter,
  CellStats,
  CellType,
  CELL_FILTERS,
  classifyCell,
  outPointKey,
} from "@/features/wallet/useCellExplorer";

const CARD_STYLE = {
  borderRadius: 12,
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow)",
  height: "100%",
  display: "flex",
  flexDirection: "column" as const,
  overflow: "hidden",
};
const HEAD_STYLE = { padding: "16px 18px", borderBottom: "1px solid var(--border)" };

function buildSubtitle(
  stats: CellStats | null,
  hasMore: boolean,
  totalCapacity: bigint | null,
  hasSearched: boolean
): string {
  if (!stats) return hasSearched ? "No cells found" : "Enter a query to explore cells";
  const cellPart = `${stats.count}${hasMore ? "+" : ""} cells`;
  if (hasMore) {
    return totalCapacity !== null
      ? `${cellPart} · ${formatCapacity(stats.totalCkb)} / ${formatCapacity(totalCapacity)} CKB`
      : cellPart;
  }
  return `${cellPart} · ${formatCapacity(stats.totalCkb)} CKB`;
}

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
  hasMore: boolean;
  hasSearched: boolean;
  stats: CellStats | null;
  totalCapacity: bigint | null;
  selectedOutPoint: string | null;
  filter: CellFilter;
  textSearch: string;
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
  hasMore,
  hasSearched,
  stats,
  totalCapacity,
  selectedOutPoint,
  filter,
  textSearch,
  onFilterChange,
  onTextSearchChange,
  onLoadMore,
  onSelectCell,
}: CellListPanelProps) {
  const { lockLabelMap } = useNetworkStore();

  const filteredCells = cells.filter((cell) => {
    const matchesFilter = filter === CellFilter.All || classifyCell(cell) === filter;
    const key = outPointKey(cell);
    const lock =
      lockLabelMap[cell.cellOutput.lock.codeHash] ??
      `${cell.cellOutput.lock.codeHash.slice(0, 10)}…`;
    const q = textSearch.toLowerCase();
    const matchesSearch = !q || key.toLowerCase().includes(q) || lock.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  const showAddressPrompt = !hasSearched && !loading;
  const showNoCells = hasSearched && !loading && cells.length === 0;
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
              type === CellType.UdtCell ? "xudt" : type === CellType.ScriptCell ? "rust" : "generic"
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
            {buildSubtitle(stats, hasMore, totalCapacity, hasSearched)}
          </div>
        </div>
      }
      style={CARD_STYLE}
      styles={{
        header: HEAD_STYLE,
        body: { padding: 0, flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
      }}
    >
      {/* Top controls — not scrollable */}
      <div className="px-4.5 pt-4.5 pb-2.5 shrink-0">
        <div className="flex gap-1.5 flex-wrap mb-3">
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
        <Input
          prefix={<SearchOutlined className="text-text-3" />}
          placeholder="Filter by out-point or lock hash…"
          value={textSearch}
          onChange={(e) => onTextSearchChange(e.target.value)}
          style={{ height: 40 }}
        />
      </div>

      {/* Table — scrollable */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4.5">
        <Spin spinning={loading} indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />}>
          {showAddressPrompt && (
            <div className="py-10 px-6">
              <Empty description="Fill in Lock Script or Type Script on the left and click Query" />
            </div>
          )}
          {showNoCells && (
            <div className="py-10 px-6">
              <Empty description="No live cells found for this query" />
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
              sticky
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

      {/* Load More + error — sticky footer */}
      {(hasMore || error) && (
        <div
          className="px-4.5 pt-2.5 pb-3.5 shrink-0 flex flex-col gap-3"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          {error && <div className="text-rust text-hint">{error}</div>}
          {hasMore && (
            <Button block onClick={onLoadMore} loading={loadingMore} style={{ height: 40 }}>
              Load more
              {totalCapacity !== null && stats && totalCapacity > stats.totalCkb && (
                <em className="not-italic text-text-3 text-hint ml-1.5">
                  · ~{formatCapacity(totalCapacity - stats.totalCkb)} CKB remaining
                </em>
              )}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
