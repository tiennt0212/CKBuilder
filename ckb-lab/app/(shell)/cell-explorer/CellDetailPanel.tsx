"use client";

import { Card, Button, Empty, message } from "antd";
import { CopyOutlined, ArrowRightOutlined } from "@ant-design/icons";
import { ccc } from "@ckb-ccc/core";
import { SummaryPanel, SummaryRow } from "@/components/ui/SummaryPanel";
import { RawBlock } from "@/components/ui/RawBlock";
import { StatusChip } from "@/components/ui/StatusChip";
import { CopyText } from "@/components/ui/CopyText";
import { formatCapacity, truncateAddress } from "@/lib/format";
import { useNetworkStore } from "@/stores/network";
import { outPointKey } from "./useCellExplorer";

const CARD_STYLE = {
  borderRadius: 12,
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow)",
};
const HEAD_STYLE = { padding: "16px 18px", borderBottom: "1px solid var(--border)" };
const BODY_STYLE = { padding: "18px" };

/**
 * Convert a ccc.Script (camelCase) to snake_case for RawBlock display.
 * WHY: CKB JSON-RPC uses snake_case; showing the on-chain format helps developers
 *      cross-reference with explorer and RPC responses.
 */
function scriptToDisplayObj(script: ccc.Script): Record<string, string> {
  return {
    code_hash: script.codeHash,
    hash_type: script.hashType,
    args: script.args,
  };
}

interface CellDetailPanelProps {
  selectedCell: ccc.Cell | null;
  selectedOutPoint: string | null;
}

export function CellDetailPanel({ selectedCell, selectedOutPoint }: CellDetailPanelProps) {
  const { lockLabelMap } = useNetworkStore();

  const capacityBreakdown = selectedCell
    ? {
        total: selectedCell.cellOutput.capacity,
        // WHY: occupiedSize is bytes; fixedPointFrom converts to shannons (× 100_000_000).
        //      More accurate than manual lock.args math — includes code_hash, hash_type,
        //      type script, and outputData, not just lock args.
        occupied: ccc.fixedPointFrom(selectedCell.occupiedSize),
        free: selectedCell.capacityFree,
      }
    : null;

  const handleCopyOutPoint = () => {
    if (!selectedCell) return;
    navigator.clipboard.writeText(outPointKey(selectedCell)).catch(() => {});
  };

  const handleUseAsInput = () => {
    // TODO(user): implement — wire selected cell as an explicit input in a transaction builder
    void message.info("Coming soon — explicit cell input selection is not yet implemented.");
  };

  return (
    <Card
      title={
        <div>
          <div className="flex items-center gap-2">
            <span className="text-subhead font-semibold text-text-1">Cell Detail</span>
            {selectedCell && <StatusChip variant="ok" label="Live" />}
          </div>
          {selectedOutPoint ? (
            <div className="text-hint text-text-3 font-mono font-normal mt-0.5">
              {truncateAddress(selectedOutPoint, 8)}
            </div>
          ) : (
            <div className="text-hint text-text-3 font-normal">Select a row to inspect</div>
          )}
        </div>
      }
      style={CARD_STYLE}
      styles={{ header: HEAD_STYLE, body: BODY_STYLE }}
    >
      {selectedCell && capacityBreakdown ? (
        <div className="flex flex-col gap-4">
          <SummaryPanel>
            <SummaryRow
              label="Capacity"
              value={formatCapacity(capacityBreakdown.total)}
              unit="CKB"
              strong
            />
            <SummaryRow
              label="Occupied"
              value={formatCapacity(capacityBreakdown.occupied)}
              unit="CKB"
              divider
            />
            <SummaryRow
              label="Free"
              value={formatCapacity(capacityBreakdown.free)}
              unit="CKB"
            />
          </SummaryPanel>

          <RawBlock
            data={scriptToDisplayObj(selectedCell.cellOutput.lock)}
            label={`Lock script · ${
              lockLabelMap[selectedCell.cellOutput.lock.codeHash] ?? "unknown"
            }`}
            defaultOpen
          />

          {selectedCell.cellOutput.type ? (
            <RawBlock
              data={scriptToDisplayObj(selectedCell.cellOutput.type)}
              label="Type script"
              defaultOpen={false}
            />
          ) : (
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
                <pre className="text-hint text-code-text font-mono leading-[1.65] m-0">null</pre>
              </div>
            </details>
          )}

          <div className="flex flex-col gap-1.5">
            <CopyText
              text={outPointKey(selectedCell)}
              display={truncateAddress(outPointKey(selectedCell), 8)}
              textClassName="font-mono text-hint text-text-3"
            />
            <CopyText
              text={selectedCell.cellOutput.lock.codeHash}
              display={`lock · ${truncateAddress(selectedCell.cellOutput.lock.codeHash, 6)}`}
              textClassName="font-mono text-hint text-text-3"
            />
          </div>

          <div className="flex gap-2.5">
            <Button
              icon={<CopyOutlined />}
              block
              style={{ height: 44 }}
              onClick={handleCopyOutPoint}
            >
              Copy out-point
            </Button>
            <Button
              type="primary"
              icon={<ArrowRightOutlined />}
              iconPosition="end"
              block
              style={{ height: 44 }}
              onClick={handleUseAsInput}
            >
              Use as input
            </Button>
          </div>
        </div>
      ) : (
        <div className="py-10">
          <Empty description="Select a cell from the table to inspect its details" />
        </div>
      )}
    </Card>
  );
}
