"use client";

import { CopyText } from "@/components/ui/CopyText";
import { DEP_TYPE_LABELS } from "@/lib/ckb/dep-type";
import type { DeployedScript } from "@/lib/ckb/deployed-scripts";
import { DepType } from "@/lib/ckb/dep-type";
import { DeleteOutlined, EditOutlined, EyeOutlined } from "@ant-design/icons";
import { Button, Popconfirm, Switch, Table } from "antd";
import type { TableColumnsType } from "antd";

interface RegistryTableProps {
  scripts: DeployedScript[];
  onView: (entry: DeployedScript) => void;
  onEdit: (entry: DeployedScript) => void;
  onDelete: (id: string) => void;
  onToggleHidden: (id: string) => void;
}

export function RegistryTable({
  scripts,
  onView,
  onEdit,
  onDelete,
  onToggleHidden,
}: RegistryTableProps) {
  const columns: TableColumnsType<DeployedScript> = [
    {
      title: "Label",
      dataIndex: "label",
      render: (label: string) => <span className="text-body text-text-1">{label}</span>,
    },
    {
      title: "code_hash",
      dataIndex: "codeHash",
      render: (codeHash: string) => (
        // Stop propagation so copying doesn't also trigger the row's View click.
        <span onClick={(e) => e.stopPropagation()}>
          <CopyText
            text={codeHash}
            display={`${codeHash.slice(0, 10)}…${codeHash.slice(-6)}`}
            textClassName="font-mono text-hint text-text-2"
          />
        </span>
      ),
    },
    {
      title: "hash_type",
      dataIndex: "hashType",
      render: (h: string) => <span className="font-mono text-hint text-text-2">{h}</span>,
    },
    {
      title: "dep_type",
      dataIndex: "depType",
      render: (d: DeployedScript["depType"]) => (
        <span className="font-mono text-hint text-text-2">{DEP_TYPE_LABELS[d ?? DepType.Code]}</span>
      ),
    },
    {
      title: "Hidden",
      dataIndex: "hidden",
      width: 90,
      render: (hidden: boolean, entry) => (
        <span onClick={(e) => e.stopPropagation()}>
          <Switch size="small" checked={!!hidden} onChange={() => onToggleHidden(entry.id)} />
        </span>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 130,
      render: (_, entry) => (
        <span className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => onView(entry)} />
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => onEdit(entry)} />
          <Popconfirm
            title="Delete this entry?"
            description="Removes it from the registry only — the on-chain cell is untouched."
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={() => onDelete(entry.id)}
          >
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </span>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={scripts}
      rowKey={(e) => e.id}
      size="middle"
      pagination={false}
      // Hidden entries stay listed but dimmed so they read as "parked, not active".
      onRow={(entry) => ({
        onClick: () => onView(entry),
        className: "cursor-pointer",
        style: entry.hidden ? { opacity: 0.5 } : undefined,
      })}
    />
  );
}
