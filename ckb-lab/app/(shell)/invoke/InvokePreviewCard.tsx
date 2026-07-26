"use client";

import { CopyText } from "@/components/ui/CopyText";
import { NoteBox } from "@/components/ui/NoteBox";
import { RawBlock } from "@/components/ui/RawBlock";
import { StatePanel } from "@/components/ui/StatePanel";
import { SummaryPanel, SummaryRow } from "@/components/ui/SummaryPanel";
import { shannonToCKB } from "@/lib";
import { TxStatus } from "@/lib/ckb/tx-status";
import { CheckCircleOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import type { Bytes, ccc } from "@ckb-ccc/core";
import { Card } from "antd";

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

interface InvokePreviewCardProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  txJson: ccc.Transaction | null;
  txBytes: Bytes | null;
  fee: bigint | null;
  outputCapacity: bigint | null;
  scriptLabel: string | null;
  codeHash: string | null;
  buildError?: string | null;
  status: TxStatus;
  txHash: string | null;
  blockNumber: bigint | null;
  /** Cell data the output carries, for the before/after panel. */
  outputData: string;
}

export function InvokePreviewCard({
  activeTab,
  onTabChange,
  txJson,
  txBytes,
  fee,
  outputCapacity,
  scriptLabel,
  codeHash,
  buildError,
  status,
  txHash,
  blockNumber,
  outputData,
}: InvokePreviewCardProps) {
  const isCommitted = status === TxStatus.Committed;

  // buildTypeInvokeTx always places the cell carrying the script under test at outputs[0].
  const typeScript = txJson?.outputs?.[0]?.type ?? null;

  return (
    <Card
      title={
        <div>
          <div className="text-subhead font-semibold text-text-1">Execution Preview</div>
          <div className="text-hint text-text-3 font-normal">
            {isCommitted ? "Script accepted the transaction" : "Type script + state cell"}
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
              className="flex items-start gap-2.5 px-3.5 py-3 rounded-[10px] text-hint leading-[1.5]"
              style={{ background: "var(--rust-tint)", color: "var(--rust)" }}
            >
              <ExclamationCircleOutlined
                className="flex-shrink-0"
                style={{ marginTop: 1, fontSize: 14 }}
              />
              <span className="text-text-2">{buildError}</span>
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
                Script returned 0 — transaction committed
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

          {/* Rows are hidden individually until the preview build supplies their data. */}
          <SummaryPanel>
            {scriptLabel != null && <SummaryRow label="Script" value={scriptLabel} />}
            {codeHash != null && (
              <div className="flex items-baseline justify-between py-[6px]">
                <span className="text-body text-text-2">code_hash</span>
                <CopyText
                  text={codeHash}
                  display={`${codeHash.slice(0, 10)}…${codeHash.slice(-6)}`}
                  textClassName="font-mono text-hint text-text-1"
                />
              </div>
            )}
            {outputCapacity != null && (
              <SummaryRow label="Capacity used" value={shannonToCKB(outputCapacity)} unit="CKB" />
            )}
            {fee != null && (
              <SummaryRow label="Network fee" value={shannonToCKB(fee)} unit="CKB" divider />
            )}
          </SummaryPanel>

          {/*
           * Output cell data. A type script validating a state transition reads both the
           * input and output data, so showing what the cell will carry is the closest thing
           * to a "result" this page can offer before the node runs the script.
           * Course 10 (issue #8) decodes this into a counter value.
           */}
          {txJson != null && (
            <StatePanel
              title="Output cell · data"
              rows={[
                { label: "before", value: "0x" },
                { label: "after", value: outputData || "0x", isCurrent: true },
              ]}
            />
          )}

          {txJson == null && !buildError && (
            <NoteBox>
              Pick a deployed script to build a preview. The script runs as a validator when the
              node verifies this transaction — it never executes on its own.
            </NoteBox>
          )}
        </div>
      ) : (
        <RawBlock
          items={[
            {
              key: "type-script",
              label: "type_script + cell_deps",
              data: {
                type: typeScript,
                cell_deps: txJson?.cellDeps ?? [],
                witnesses: txJson?.witnesses ?? [],
              },
              defaultOpen: true,
            },
            {
              key: "tx",
              label: `Raw transaction${txBytes ? ` · ${txBytes.length} bytes` : ""}`,
              data: (txJson ?? {}) as object,
            },
          ]}
        />
      )}
    </Card>
  );
}
