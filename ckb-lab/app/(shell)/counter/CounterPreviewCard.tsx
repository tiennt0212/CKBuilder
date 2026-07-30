"use client";

import { CellFlow, type CellData } from "@/components/ui/CellFlow";
import { CopyText } from "@/components/ui/CopyText";
import { NoteBox } from "@/components/ui/NoteBox";
import { RawBlock } from "@/components/ui/RawBlock";
import { StatePanel } from "@/components/ui/StatePanel";
import { SummaryPanel, SummaryRow } from "@/components/ui/SummaryPanel";
import { formatCapacity, shannonToCKB } from "@/lib";
import { addressFromLock } from "@/lib/ckb/utils";
import { TxStatus } from "@/lib/ckb/tx-status";
import { Button, Card } from "antd";
import { CheckCircleOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import type { Bytes, ccc } from "@ckb-ccc/core";

const CARD_STYLE = {
  borderRadius: 12,
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow)",
  height: "100%",
  display: "flex",
  flexDirection: "column" as const,
};
const HEAD_STYLE = { padding: "16px 18px", borderBottom: "1px solid var(--border)" };
const BODY_STYLE = { padding: "18px", flex: 1, overflowY: "auto" as const, minHeight: 0 };

interface CounterPreviewCardProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  txJson: ccc.Transaction | null;
  txBytes: Bytes | null;
  fee: bigint | null;
  /** Decoded counter value before the tx. Null for a fresh create (no prior cell). */
  priorCount: bigint | null;
  /** Decoded counter value after the tx. Null for a destroy (no resulting cell). */
  newCount: bigint | null;
  outputCapacity: bigint | null;
  buildError?: string | null;
  /** True when buildError is the "already spent" case — offers a local-only cleanup action. */
  isSpentError: boolean;
  onForgetEntry: () => void;
  status: TxStatus;
  txHash: string | null;
  blockNumber: bigint | null;
  lockLabelMap: Record<string, string>;
  cccClient: ccc.Client | null;
}

export function CounterPreviewCard({
  activeTab,
  onTabChange,
  txJson,
  txBytes,
  fee,
  priorCount,
  newCount,
  outputCapacity,
  buildError,
  isSpentError,
  onForgetEntry,
  status,
  txHash,
  blockNumber,
  lockLabelMap,
  cccClient,
}: CounterPreviewCardProps) {
  const isCommitted = status === TxStatus.Committed;

  // Scenario is fully determined by which of priorCount/newCount are populated —
  // create has no prior cell, destroy has no resulting cell, increment has both.
  const isDestroy = priorCount != null && newCount == null;

  const cellData = (
    lock: ccc.Script | null | undefined,
    capacity: ccc.Num | null | undefined,
    addressLabel: string | undefined,
    accent: "primary" | "neutral"
  ): CellData => ({
    capacity: capacity != null ? formatCapacity(capacity) : "Unknown",
    lockLabel: lock?.codeHash ? (lockLabelMap[lock.codeHash] ?? "Unknown") : "Unknown",
    address:
      addressLabel ??
      (lock && cccClient
        ? truncateOrUndefined(addressFromLock(cccClient, lock)?.toString())
        : undefined),
    accent,
  });

  const inputs: CellData[] = (txJson?.inputs ?? [])
    .filter((i) => !!i.cellOutput)
    .map((i) =>
      cellData(
        i.cellOutput!.lock,
        i.cellOutput!.capacity,
        priorCount != null ? `count = ${priorCount}` : undefined,
        i.cellOutput!.type ? "primary" : "neutral"
      )
    );

  const outputs: CellData[] = (txJson?.outputs ?? []).map((o) =>
    cellData(
      o.lock,
      o.capacity,
      o.type ? (newCount != null ? `count = ${newCount}` : undefined) : "change",
      o.type ? "primary" : "neutral"
    )
  );

  const stateRows = isDestroy
    ? [
        { label: "before", value: String(priorCount) },
        { label: "after", value: "destroyed", isCurrent: true },
      ]
    : [
        { label: "before", value: priorCount != null ? String(priorCount) : "—" },
        { label: "after", value: newCount != null ? String(newCount) : "—", isCurrent: true },
      ];

  return (
    <Card
      title={
        <div>
          <div className="text-subhead font-semibold text-text-1">State Transition</div>
          <div className="text-hint text-text-3 font-normal">
            {isCommitted ? "Committed on-chain" : "Live preview"}
          </div>
        </div>
      }
      tabList={[
        { key: "summary", tab: "Summary" },
        { key: "raw", tab: "Raw" },
      ]}
      activeTabKey={activeTab}
      onTabChange={onTabChange}
      style={CARD_STYLE}
      styles={{ header: HEAD_STYLE, body: BODY_STYLE }}
    >
      {activeTab === "summary" ? (
        <div className="flex flex-col gap-4">
          {!!buildError && (
            <div
              className="flex flex-col gap-2 px-3.5 py-3 rounded-[10px] text-hint leading-[1.5]"
              style={{ background: "var(--rust-tint)", color: "var(--rust)" }}
            >
              <div className="flex items-start gap-2.5">
                <ExclamationCircleOutlined
                  className="flex-shrink-0"
                  style={{ marginTop: 1, fontSize: 14 }}
                />
                <span className="text-text-2">{buildError}</span>
              </div>
              {isSpentError && (
                <Button
                  size="small"
                  htmlType="button"
                  onClick={onForgetEntry}
                  className="self-start"
                >
                  Forget this entry
                </Button>
              )}
            </div>
          )}

          {isCommitted && txHash && (
            <div
              className="flex items-center gap-2.5 px-3.5 py-3 rounded-[10px]"
              style={{ background: "var(--primary-tint)" }}
            >
              <CheckCircleOutlined
                className="text-primary flex-shrink-0"
                style={{ fontSize: 14 }}
              />
              <span className="text-hint text-text-2">
                Transaction committed
                {blockNumber != null && (
                  <>
                    {" "}
                    in block{" "}
                    <span className="font-mono">#{Number(blockNumber).toLocaleString()}</span>
                  </>
                )}
              </span>
            </div>
          )}

          {txJson != null && (inputs.length > 0 || outputs.length > 0) && (
            <div className="rounded-[10px] bg-panel-bg p-4">
              <CellFlow inputs={inputs} outputs={outputs} />
            </div>
          )}

          {txJson != null && <StatePanel title="Counter · value" rows={stateRows} />}

          <SummaryPanel>
            {outputCapacity != null && (
              <SummaryRow
                label={isDestroy ? "Capacity reclaimed" : "Capacity used"}
                value={shannonToCKB(outputCapacity)}
                unit="CKB"
              />
            )}
            {fee != null && (
              <SummaryRow label="Network fee" value={shannonToCKB(fee)} unit="CKB" divider />
            )}
          </SummaryPanel>

          {txJson == null && !buildError && (
            <NoteBox>
              Pick a deployed script (or a tracked counter) to build a preview. The type script runs
              as a validator when the node verifies this transaction.
            </NoteBox>
          )}
        </div>
      ) : (
        <RawBlock
          items={[
            {
              key: "tx",
              label: `Raw transaction${txBytes ? ` · ${txBytes.length} bytes` : ""}`,
              data: (txJson ?? {}) as object,
              defaultOpen: true,
            },
          ]}
        />
      )}
    </Card>
  );
}

function truncateOrUndefined(s: string | undefined): string | undefined {
  if (!s) return undefined;
  return s.length > 16 ? `${s.slice(0, 10)}…${s.slice(-6)}` : s;
}
