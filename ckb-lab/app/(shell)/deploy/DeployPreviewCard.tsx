"use client";

import { CopyText } from "@/components/ui/CopyText";
import { NoteBox } from "@/components/ui/NoteBox";
import { RawBlock } from "@/components/ui/RawBlock";
import { SummaryPanel, SummaryRow } from "@/components/ui/SummaryPanel";
import { formatCapacity, shannonToCKB } from "@/lib";
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

interface DeployPreviewCardProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  txJson: ccc.Transaction | null;
  txBytes: Bytes | null;
  fee: bigint | null;
  binarySize: number | null;
  balance: bigint | null | undefined;
  buildError?: string | null;
  status: TxStatus;
  txHash: string | null;
  blockNumber: bigint | null;
  /** Blake2b-256 hash of the deployed binary. Populated after preview build. */
  dataHash: string | null;
  /** Type ID args — identifies the cell. Only populated when enableTypeId = true. */
  typeIdArgs: string | null;
  /** Hash of the Type ID type script — the stable code_hash for "type" references. */
  typeIdCodeHash: string | null;
  /** Whether the user enabled Type ID for this deploy. */
  enableTypeId: boolean;
}

export function DeployPreviewCard({
  activeTab,
  onTabChange,
  txJson,
  txBytes,
  fee,
  binarySize,
  balance,
  buildError,
  status,
  txHash,
  blockNumber,
  dataHash,
  typeIdArgs,
  typeIdCodeHash,
  enableTypeId,
}: DeployPreviewCardProps) {
  const isCommitted = status === TxStatus.Committed;

  // buildDeployTx always places the script cell at outputs[0].
  const cellCapacity = txJson?.outputs?.[0]?.capacity;

  // For the Raw tab, show only the output cell (not the full transaction).
  // This is the data that gets stored on-chain and is the primary artifact of a deploy.
  const outputCell =
    txJson != null
      ? {
          capacity: txJson.outputs?.[0]?.capacity,
          lock: txJson.outputs?.[0]?.lock,
          type: txJson.outputs?.[0]?.type ?? null,
          data: txJson.outputsData?.[0] ?? "0x",
        }
      : null;

  return (
    <Card
      title={
        <div>
          <div className="text-subhead font-semibold text-text-1">Deployment Preview</div>
          <div className="text-hint text-text-3 font-normal">
            {isCommitted ? "Deployment confirmed" : "Live preview"}
          </div>
        </div>
      }
      tabList={[
        { key: "summary", tab: isCommitted ? "Outpoint" : "Summary" },
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

          {isCommitted && txHash ? (
            // Committed state: show the deployed outpoint for use as a cell dep.
            // The stable outpoint is txHash:0x0 because buildDeployTx always places
            // the script cell at output index 0.
            <div className="flex flex-col gap-3">
              <div
                className="flex items-center gap-2.5 px-3.5 py-3 rounded-[10px]"
                style={{ background: "var(--primary-tint)" }}
              >
                <CheckCircleOutlined
                  className="text-primary flex-shrink-0"
                  style={{ fontSize: 14 }}
                />
                <span className="text-hint text-text-2">
                  Script deployed successfully
                  {blockNumber != null && (
                    <>
                      {" "}
                      in block{" "}
                      <span className="font-mono">#{Number(blockNumber).toLocaleString()}</span>
                    </>
                  )}
                </span>
              </div>

              <div className="rounded-[11px] border border-app-border bg-panel-bg px-4 py-3 flex flex-col gap-2.5">
                <div>
                  <div className="text-2xs font-semibold text-text-3 uppercase tracking-widest2 mb-1.5">
                    TX HASH
                  </div>
                  <CopyText
                    text={txHash}
                    display={`${txHash.slice(0, 14)}…${txHash.slice(-6)}`}
                    textClassName="font-mono text-hint text-text-1"
                  />
                </div>
                <div className="h-px bg-app-border" />
                <div>
                  <div className="text-2xs font-semibold text-text-3 uppercase tracking-widest2 mb-1.5">
                    DEPLOYED OUTPOINT (cell dep)
                  </div>
                  <CopyText
                    text={`${txHash}:0x0`}
                    display={`${txHash.slice(0, 10)}…:0x0`}
                    textClassName="font-mono text-hint text-text-1"
                  />
                </div>
              </div>

              {binarySize != null && (
                <div className="text-hint text-text-3">
                  Script size:{" "}
                  <span className="font-mono text-text-2">{binarySize.toLocaleString()} bytes</span>
                </div>
              )}
            </div>
          ) : (
            // Idle / building state: show the deployment summary rows.
            // Rows are hidden individually until their data is available from the preview build.
            <div className="flex flex-col gap-4">
              <SummaryPanel>
                {dataHash != null && (
                  <div className="flex items-baseline justify-between py-[6px]">
                    <span className="text-body text-text-2">Data Hash</span>
                    <CopyText
                      text={dataHash}
                      display={`${dataHash.slice(0, 10)}…${dataHash.slice(-6)}`}
                      textClassName="font-mono text-hint text-text-1"
                    />
                  </div>
                )}
                {enableTypeId && typeIdArgs != null && (
                  <div className="flex items-baseline justify-between py-[6px]">
                    <span className="text-body text-text-2">Type ID args</span>
                    <CopyText
                      text={typeIdArgs}
                      display={`${typeIdArgs.slice(0, 10)}…${typeIdArgs.slice(-6)}`}
                      textClassName="font-mono text-hint text-text-1"
                    />
                  </div>
                )}
                {/*
                 * The code_hash for a hash_type "type" reference is the hash of the whole
                 * Type ID type script, not its args — a script is identified by
                 * blake2b(code_hash ‖ hash_type ‖ args). Showing the bare args here would
                 * hand the user a value that references a script that does not exist.
                 */}
                {enableTypeId && typeIdCodeHash != null && (
                  <div className="flex items-baseline justify-between py-[6px]">
                    <span className="text-body text-text-2">Code Hash (Type ID)</span>
                    <CopyText
                      text={typeIdCodeHash}
                      display={`${typeIdCodeHash.slice(0, 10)}…${typeIdCodeHash.slice(-6)}`}
                      textClassName="font-mono text-hint text-primary font-semibold"
                    />
                  </div>
                )}
                {cellCapacity != null && (
                  <SummaryRow label="Capacity" value={formatCapacity(cellCapacity)} unit="CKB" />
                )}
                {fee !== null && (
                  <SummaryRow label="Network Fee" value={shannonToCKB(fee)} unit="CKB" />
                )}
                {/* Balance-after row retained only when all values are present for context */}
                {balance != null && fee !== null && cellCapacity != null && (
                  <SummaryRow
                    label="Balance after"
                    // Use String() to normalise ccc.Num (bigint or hex) before BigInt().
                    value={shannonToCKB(balance - BigInt(String(cellCapacity)) - fee)}
                    unit="CKB"
                    strong
                    divider
                  />
                )}
              </SummaryPanel>
              <NoteBox>
                Reference via out_point in cell_deps and code_hash in lock/type script.
              </NoteBox>
            </div>
          )}
        </div>
      ) : (
        !!outputCell && (
          <RawBlock
            items={[
              {
                key: "output-cell",
                label: txBytes?.length
                  ? `Output Cell · ~${txBytes.length} bytes tx`
                  : "Output Cell",
                data: outputCell,
              },
            ]}
          />
        )
      )}
    </Card>
  );
}
