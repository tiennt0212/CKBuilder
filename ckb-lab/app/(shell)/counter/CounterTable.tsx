"use client";

import { CopyText } from "@/components/ui/CopyText";
import type { CounterCell } from "@/lib/ckb/counter-cells";
import { DeleteOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { Button, Table } from "antd";
import type { TableColumnsType } from "antd";

interface CounterTableProps {
  cells: CounterCell[];
  onIncrement: (entry: CounterCell) => void;
  onDestroy: (entry: CounterCell) => void;
}

export function CounterTable({ cells, onIncrement, onDestroy }: CounterTableProps) {
  const columns: TableColumnsType<CounterCell> = [
    {
      title: "Label",
      dataIndex: "label",
      render: (label: string | undefined) => (
        <span className="text-body text-text-1">{label || "Counter"}</span>
      ),
    },
    {
      title: "Count",
      dataIndex: "count",
      sorter: (a, b) => {
        const diff = BigInt(a.count) - BigInt(b.count);
        return diff < 0n ? -1 : diff > 0n ? 1 : 0;
      },
      render: (count: string) => (
        <span className="font-mono text-hint text-text-2 tabular-nums">{count}</span>
      ),
    },
    {
      title: "code_hash",
      key: "codeHash",
      render: (_, entry) => (
        // Stop propagation so copying doesn't also trigger the row's Increment click.
        <span onClick={(e) => e.stopPropagation()}>
          <CopyText
            text={entry.script.codeHash}
            display={`${entry.script.codeHash.slice(0, 10)}…${entry.script.codeHash.slice(-6)}`}
            textClassName="font-mono text-hint text-text-2"
          />
        </span>
      ),
    },
    {
      title: "Outpoint",
      key: "outpoint",
      render: (_, entry) => (
        <span onClick={(e) => e.stopPropagation()}>
          <CopyText
            text={`${entry.outPoint.txHash}:${entry.outPoint.index}`}
            display={`${entry.outPoint.txHash.slice(0, 10)}…:${entry.outPoint.index}`}
            textClassName="font-mono text-hint text-text-2"
          />
        </span>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 90,
      render: (_, entry) => (
        <span className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            type="text"
            size="small"
            icon={<ThunderboltOutlined />}
            onClick={() => onIncrement(entry)}
          />
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => onDestroy(entry)}
          />
        </span>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={cells}
      rowKey={(e) => e.id}
      size="middle"
      pagination={false}
      onRow={(entry) => ({
        onClick: () => onIncrement(entry),
        className: "cursor-pointer",
      })}
    />
  );
}
