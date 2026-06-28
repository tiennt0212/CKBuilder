"use client";

import { Drawer } from "antd";
import { ccc } from "@ckb-ccc/core";
import { RawBlock, type RawBlockItem } from "@/components/ui/RawBlock";
import { SummaryPanel, SummaryRow } from "@/components/ui/SummaryPanel";
import { StatusChip } from "@/components/ui/StatusChip";
import { formatCapacity, truncateAddress } from "@/lib/format";
import { useNetworkStore } from "@/stores/network";
import { classifyCell, outPointKey } from "@/features/wallet/useCellExplorer";

function scriptToDisplayObj(script: ccc.Script): Record<string, string> {
  return {
    code_hash: script.codeHash,
    hash_type: script.hashType,
    args: script.args,
  };
}

interface CellDetailDrawerProps {
  cell: ccc.Cell;
  onClose: () => void;
}

export function CellDetailDrawer({ cell, onClose }: CellDetailDrawerProps) {
  const { lockLabelMap } = useNetworkStore();

  const op = outPointKey(cell);
  // WHY: occupiedSize is bytes; fixedPointFrom converts to shannons (× 100_000_000).
  const occupied = ccc.fixedPointFrom(cell.occupiedSize);
  const free = cell.capacityFree;
  const cellClass = classifyCell(cell);
  const lockLabel = lockLabelMap[cell.cellOutput.lock.codeHash] ?? "unknown";

  const hasData = cell.outputData !== undefined && cell.outputData !== "0x";
  const dataByteLength = hasData ? (cell.outputData.length - 2) / 2 : 0;

  const rawItems: RawBlockItem[] = [
    {
      key: "outpoint",
      label: "Out-point",
      data: { tx_hash: cell.outPoint.txHash, index: Number(cell.outPoint.index) },
      defaultOpen: false,
    },
    {
      key: "lock",
      label: `Lock script · ${lockLabel}`,
      data: scriptToDisplayObj(cell.cellOutput.lock),
    },
    ...(cell.cellOutput.type
      ? [
          {
            key: "type",
            label: "Type script",
            data: scriptToDisplayObj(cell.cellOutput.type),
            defaultOpen: false,
          },
        ]
      : []),
    ...(hasData
      ? [
          {
            key: "data",
            label: `Output data · ${dataByteLength} bytes`,
            data: { outputData: cell.outputData, bytes: dataByteLength },
            defaultOpen: false,
          },
        ]
      : []),
  ];

  return (
    <Drawer
      open
      placement="right"
      width={360}
      onClose={onClose}
      // WHY: getContainer={false} renders the drawer inside the current relative container
      // (the flex-1 panel), not as a body-level portal. mask={false} removes the backdrop.
      getContainer={false}
      mask={false}
      title={
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-subhead font-semibold text-text-1">Cell Detail</span>
            <StatusChip variant="ok" label="Live" />
          </div>
          <div className="font-mono text-hint text-text-3 truncate">{truncateAddress(op, 8)}</div>
        </div>
      }
      styles={{
        header: { padding: "15px 18px", borderBottom: "1px solid var(--border)" },
        body: { padding: "14px 18px", display: "flex", flexDirection: "column", gap: 14 },
        wrapper: {
          boxShadow: "-6px 0 24px rgba(0,0,0,0.09)",
          borderLeft: "1px solid var(--border)",
        },
      }}
    >
      <SummaryPanel>
        <SummaryRow
          label="Capacity"
          value={formatCapacity(cell.cellOutput.capacity)}
          unit="CKB"
          strong
        />
        <SummaryRow label="Occupied" value={formatCapacity(occupied)} unit="CKB" divider />
        <SummaryRow label="Free" value={formatCapacity(free)} unit="CKB" />
        <SummaryRow label="Class" value={cellClass} divider />
      </SummaryPanel>

      <RawBlock items={rawItems} />
    </Drawer>
  );
}
