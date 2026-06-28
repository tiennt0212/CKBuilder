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
            {stats
              ? `${stats.count} cells loaded`
              : hasSearched
                ? "No cells found"
                : "Enter a query to explore cells"}
          </div>
        </div>
      }
      style={CARD_STYLE}
      styles={{
        header: HEAD_STYLE,
        body: { padding: "18px 18px 0", flex: 1, overflowY: "auto", overflowX: "hidden" },
      }}
    >
      {/* Filter pills */}
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

      {/* Text search */}
      <Input
        prefix={<SearchOutlined className="text-text-3" />}
        placeholder="Filter by out-point or lock hash…"
        value={textSearch}
        onChange={(e) => onTextSearchChange(e.target.value)}
        style={{ height: 40 }}
        className="mb-3"
      />

      {/* Stats bar */}
      {stats && (
        <div
          className="flex mb-3 rounded-[10px] border border-app-border overflow-hidden"
          style={{ background: "var(--panel-bg)" }}
        >
          {[
            ["Cells", stats.count.toString()],
            ["Total", `${formatCapacity(stats.totalCkb)} CKB`],
            ["Avg", `${formatCapacity(stats.avgCkb)} CKB`],
            ["Has type", stats.hasTypeCount.toString()],
            ["Has data", stats.hasDataCount.toString()],
          ].map(([k, v], i) => (
            <div
              key={k}
              className="flex flex-col gap-0.5 px-2.5 py-2 flex-1 min-w-0"
              style={{ borderLeft: i > 0 ? "1px solid var(--border)" : "none" }}
            >
              <span className="text-2xs font-semibold uppercase tracking-wider text-text-3 truncate">
                {k}
              </span>
              <span className="text-[12px] font-semibold text-text-1 tabular-nums truncate">
                {v}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
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

      {/* Load More + error footer */}
      {(hasMore || error) && (
        <div className="pt-3 pb-4 flex flex-col gap-3">
          {error && <div className="text-rust text-hint">{error}</div>}
          {hasMore && (
            <Button block onClick={onLoadMore} loading={loadingMore} style={{ height: 40 }}>
              Load more
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
