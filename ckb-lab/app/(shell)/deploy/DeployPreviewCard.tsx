"use client";

import { CopyText } from "@/components/ui/CopyText";
import { RawBlock } from "@/components/ui/RawBlock";
import { SummaryPanel, SummaryRow } from "@/components/ui/SummaryPanel";
import { formatCapacity, shannonToCKB } from "@/lib";
import { TransferStatus } from "@/lib/ckb/transfer-status";
import { CheckCircleOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import type { Bytes, ccc } from "@ckb-ccc/core";
import { Card } from "antd";

const CARD_STYLE = {
  borderRadius: 12,
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow)",
};
const HEAD_STYLE = { padding: "16px 18px", borderBottom: "1px solid var(--border)" };
const BODY_STYLE = { padding: "18px" };

interface DeployPreviewCardProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  txJson: ccc.Transaction | null;
  txBytes: Bytes | null;
  fee: bigint | null;
  binarySize: number | null;
  balance: bigint | null | undefined;
  buildError?: string | null;
  status: TransferStatus;
  txHash: string | null;
  blockNumber: bigint | null;
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
}: DeployPreviewCardProps) {
  const isCommitted = status === TransferStatus.Committed;

  // buildDeployTx always places the script cell at outputs[0].
  // Reading it here drives both the capacity display and balance-after calculation.
  const cellCapacity = txJson?.outputs?.[0]?.capacity;

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
                      {" "}in block{" "}
                      <span className="font-mono">
                        #{Number(blockNumber).toLocaleString()}
                      </span>
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
                  <span className="font-mono text-text-2">
                    {binarySize.toLocaleString()} bytes
                  </span>
                </div>
              )}
            </div>
          ) : (
            // Idle / building state: show capacity and fee summary from the preview build.
            <SummaryPanel>
              {cellCapacity != null && (
                <SummaryRow
                  label="Cell Capacity"
                  value={formatCapacity(cellCapacity)}
                  unit="CKB"
                />
              )}
              {binarySize != null && (
                <SummaryRow
                  label="Binary Size"
                  value={binarySize.toLocaleString()}
                  unit="bytes"
                />
              )}
              {fee !== null && <SummaryRow label="Fee" value={shannonToCKB(fee)} unit="CKB" />}
              {balance != null && fee !== null && cellCapacity != null && (
                <SummaryRow
                  label="Balance after"
                  // Use String() to normalise ccc.Num (bigint or hex string) before BigInt().
                  // BigInt("0x...") and BigInt("decimal") both work in modern JS engines.
                  value={shannonToCKB(balance - BigInt(String(cellCapacity)) - fee)}
                  unit="CKB"
                  strong
                  divider
                />
              )}
            </SummaryPanel>
          )}
        </div>
      ) : (
        !!txJson && (
          <RawBlock
            items={[
              {
                key: "tx",
                label: txBytes?.length
                  ? `Raw Transaction · ~${txBytes.length} bytes`
                  : "Raw Transaction",
                data: txJson,
              },
            ]}
          />
        )
      )}
    </Card>
  );
}
