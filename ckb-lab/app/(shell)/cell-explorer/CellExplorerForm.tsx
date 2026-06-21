"use client";

import { useState } from "react";
import { Card, Input, Button, Table } from "antd";
import type { TableColumnsType } from "antd";
import { CopyOutlined, ArrowRightOutlined, SearchOutlined } from "@ant-design/icons";
import { SummaryPanel, SummaryRow } from "@/components/ui/SummaryPanel";
import { RawBlock } from "@/components/ui/RawBlock";
import { Badge } from "@/components/ui/Badge";

interface CellRow {
  key: string;
  cap: string;
  lock: string;
  type: string | null;
  op: string;
}

const CELLS: CellRow[] = [
  { key: "0x8f3a…#0", cap: "1,000.00", lock: "secp256k1", type: null, op: "0x8f3a…#0" },
  { key: "0x8f3a…#1", cap: "480.35", lock: "secp256k1", type: null, op: "0x8f3a…#1" },
  { key: "0x21bc…#0", cap: "142.00", lock: "secp256k1", type: "xUDT", op: "0x21bc…#0" },
  { key: "0x21bc…#3", cap: "142.00", lock: "secp256k1", type: "xUDT", op: "0x21bc…#3" },
  { key: "0x77de…#2", cap: "10,061.00", lock: "secp256k1", type: "DAO", op: "0x77de…#2" },
  { key: "0x55a1…#0", cap: "61.00", lock: "JoyID", type: null, op: "0x55a1…#0" },
  { key: "0x9c0d…#1", cap: "604.00", lock: "secp256k1", type: null, op: "0x9c0d…#1" },
];

const LOCK_SCRIPT = {
  code_hash: "0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8",
  hash_type: "type",
  args: "0x…m3f9a",
};

const CARD_STYLE = {
  borderRadius: 12,
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow)",
};
const HEAD_STYLE = { padding: "16px 18px", borderBottom: "1px solid var(--border)" };
const BODY_STYLE = { padding: "18px" };

type Filter = "All" | "CKB" | "xUDT" | "DAO";
const FILTERS: Filter[] = ["All", "CKB", "xUDT", "DAO"];

const COL_HEADER = (label: string) => (
  <span className="text-[10.5px] font-semibold uppercase tracking-widest2 text-text-3 whitespace-nowrap">
    {label}
  </span>
);

export function CellExplorerForm() {
  const [filter, setFilter] = useState<Filter>("All");
  const [search, setSearch] = useState("");
  const [selectedKey, setSelectedKey] = useState<string>(CELLS[0].key);

  const filtered = CELLS.filter((c) => {
    const matchesFilter =
      filter === "All" || (filter === "CKB" && !c.type) || c.type === filter;
    const q = search.toLowerCase();
    const matchesSearch =
      !q || c.op.toLowerCase().includes(q) || c.lock.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  const selectedCell = CELLS.find((c) => c.key === selectedKey) ?? CELLS[0];

  const columns: TableColumnsType<CellRow> = [
    {
      title: COL_HEADER("Capacity"),
      dataIndex: "cap",
      render: (v: string) => (
        <span className="font-semibold text-text-1 tabular-nums">
          {v} <em className="not-italic text-2xs text-text-3 font-normal">CKB</em>
        </span>
      ),
    },
    {
      title: COL_HEADER("Lock"),
      dataIndex: "lock",
      render: (v: string) => <span className="text-text-2">{v}</span>,
    },
    {
      title: COL_HEADER("Type"),
      dataIndex: "type",
      render: (v: string | null) =>
        v ? <Badge>{v}</Badge> : <span className="text-text-3">—</span>,
    },
    {
      title: COL_HEADER("Out-point"),
      dataIndex: "op",
      render: (v: string) => (
        <span className="font-mono text-hint text-text-3 whitespace-nowrap">{v}</span>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-[1.5fr_1fr] gap-5 items-start">
      {/* ── Left: Live Cells ── */}
      <Card
        title={
          <div>
            <div className="text-subhead font-semibold text-text-1">Live Cells</div>
            <div className="text-hint text-text-3 font-normal">
              142 cells · 12,480.35 CKB total capacity
            </div>
          </div>
        }
        extra={
          <div className="flex gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{ fontSize: 12 }}
                className={`px-3 py-[7px] rounded-lg border font-medium cursor-pointer font-sans transition-colors ${
                  f === filter
                    ? "bg-primary-tint border-transparent text-primary font-semibold"
                    : "bg-bg-elev border-input-border text-text-2 hover:border-primary hover:text-primary"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        }
        style={CARD_STYLE}
        styles={{ header: HEAD_STYLE, body: { padding: "18px 18px 0" } }}
      >
        <Input
          prefix={<SearchOutlined className="text-text-3" />}
          placeholder="Search by out-point, lock or type hash…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ height: 40 }}
          className="mb-[14px]"
        />
        <div className="-mx-[18px]">
          <Table
            columns={columns}
            dataSource={filtered}
            size="middle"
            pagination={false}
            onRow={(r) => ({
              onClick: () => setSelectedKey(r.key),
              style:
                r.key === selectedKey ? { background: "var(--primary-tint)" } : undefined,
              className: "cursor-pointer",
            })}
          />
        </div>
      </Card>

      {/* ── Right: Cell detail ── */}
      <Card
        title={
          <div>
            <div className="text-subhead font-semibold text-text-1">Cell detail</div>
            <div className="text-hint text-text-3 font-normal">
              Live cell · {selectedCell.op}
            </div>
          </div>
        }
        style={CARD_STYLE}
        styles={{ header: HEAD_STYLE, body: BODY_STYLE }}
      >
        <div className="flex flex-col gap-4">
          <SummaryPanel>
            <SummaryRow label="Capacity" value="1,000.00" unit="CKB" strong />
            <SummaryRow label="Occupied" value="61.00" unit="CKB" divider />
            <SummaryRow label="Free" value="939.00" unit="CKB" />
          </SummaryPanel>

          <RawBlock
            data={LOCK_SCRIPT}
            label="Lock script · secp256k1_blake160"
            defaultOpen
          />

          <details>
            <summary
              className="cursor-pointer select-none pb-3 list-none flex items-center gap-1.5"
              style={{ fontSize: 12.5, fontWeight: 550, color: "var(--text-2)" }}
            >
              <span className="inline-block text-[10px]">▶</span>
              Type script{" "}
              <span className="font-normal" style={{ color: "var(--text-3)" }}>
                · none
              </span>
            </summary>
            <div className="rounded-[10px] bg-code-bg border border-app-border p-4">
              <pre className="text-hint text-code-text font-mono leading-[1.65] m-0">
                null
              </pre>
            </div>
          </details>

          <div className="flex gap-2.5">
            <Button icon={<CopyOutlined />} block style={{ height: 44 }}>
              Copy out-point
            </Button>
            <Button
              type="primary"
              icon={<ArrowRightOutlined />}
              iconPosition="end"
              block
              style={{ height: 44 }}
            >
              Use as input
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
