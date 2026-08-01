"use client";

import { CellChip } from "@/components/ui/CellChip";
import { RawBlock } from "@/components/ui/RawBlock";
import { SummaryPanel, SummaryRow } from "@/components/ui/SummaryPanel";
import { TokenAction } from "@/features/tokens/token-action";
import { formatCapacity, shannonToCKB, truncateAddress } from "@/lib";
import { addressFromLock } from "@/lib/ckb/utils";
import { ArrowRightOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { Card } from "antd";
import { type Bytes, type ccc } from "@ckb-ccc/core";

const CARD_STYLE = {
  borderRadius: 12,
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow)",
};
const HEAD_STYLE = { padding: "16px 18px", borderBottom: "1px solid var(--border)" };
const BODY_STYLE = { padding: "18px" };

interface TokensPreviewCardProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  txJson: ccc.Transaction | null;
  txBytes: Bytes | null;
  action: TokenAction;
  amount: string | null | undefined;
  fee: bigint | null;
  recipientCellCapacity: bigint | null;
  changeCellCapacity: bigint | null;
  changeAmount: bigint | null;
  ckbBalance: bigint | null | undefined;
  ownerAddress: string | null | undefined;
  cccClient: ccc.Client;
  lockLabelMap: Record<string, string>;
  buildError?: string | null;
}

export function TokensPreviewCard({
  activeTab,
  onTabChange,
  txJson,
  txBytes,
  action,
  amount,
  fee,
  recipientCellCapacity,
  changeCellCapacity,
  changeAmount,
  ckbBalance,
  ownerAddress,
  cccClient,
  lockLabelMap,
  buildError,
}: TokensPreviewCardProps) {
  // Capacity the wallet gives up for good on this transaction: the recipient's token cell plus the
  // fee. The change cell's capacity comes back to the sender, so it is shown but not subtracted.
  const spentCapacity = (recipientCellCapacity ?? 0n) + (fee ?? 0n);

  return (
    <Card
      title={
        <div>
          <div className="text-subhead font-semibold text-text-1">Transaction Preview</div>
          <div className="text-hint text-text-3 font-normal">
            {action === TokenAction.Issue ? "xUDT issuance" : "xUDT transfer"}
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
          {!!txJson && (
            <div className="rounded-[10px] bg-panel-bg p-4">
              <div className="grid grid-cols-[1fr_20px_1fr] gap-3 items-start">
                <div>
                  <div className="text-2xs font-semibold text-text-3 uppercase tracking-widest2 mb-2">
                    INPUTS · {txJson.inputs.length} CELL(s)
                  </div>
                  <div className="flex flex-col gap-2">
                    {txJson.inputs.map((i) => {
                      const address = i.cellOutput?.lock.codeHash
                        ? addressFromLock(cccClient, i.cellOutput.lock)
                        : null;
                      return (
                        <CellChip
                          key={`${i.previousOutput.txHash}-${i.previousOutput.index}`}
                          capacity={
                            i.cellOutput?.capacity
                              ? formatCapacity(i.cellOutput.capacity)
                              : "Unknown"
                          }
                          lockLabel={
                            i.cellOutput?.lock.codeHash
                              ? lockLabelMap[i.cellOutput?.lock.codeHash]
                              : "Unknown"
                          }
                          address={address ? truncateAddress(address.toString()) : "Unknown"}
                          accent="primary"
                        />
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center justify-center" style={{ paddingTop: 34 }}>
                  <ArrowRightOutlined style={{ color: "var(--text-3)" }} />
                </div>
                <div>
                  <div className="text-2xs font-semibold text-text-3 uppercase tracking-widest2 mb-2">
                    OUTPUTS · {txJson.outputs.length} CELL(s)
                  </div>
                  <div className="flex flex-col gap-2">
                    {txJson.outputs.map((o, idx) => {
                      const address = addressFromLock(cccClient, o.lock);
                      return (
                        <CellChip
                          key={`${o.lock.args}-${idx}`}
                          capacity={formatCapacity(o.capacity)}
                          lockLabel={o.lock.codeHash ? lockLabelMap[o.lock.codeHash] : "Unknown"}
                          address={address ? truncateAddress(address.toString()) : "Unknown"}
                          // Highlight what stays with the sender — for a transfer that is the
                          // token change cell and the CKB change cell, not the recipient's.
                          accent={address?.toString() === ownerAddress ? "primary" : "neutral"}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          <SummaryPanel>
            {!!amount && (
              <SummaryRow
                label={action === TokenAction.Issue ? "You mint" : "You send"}
                value={BigInt(amount).toLocaleString()}
                unit="units"
              />
            )}
            {changeAmount != null && changeAmount > 0n && (
              <SummaryRow label="Token change" value={changeAmount.toLocaleString()} unit="units" />
            )}
            {recipientCellCapacity != null && (
              <SummaryRow
                label={action === TokenAction.Issue ? "New cell capacity" : "Recipient cell"}
                value={shannonToCKB(recipientCellCapacity)}
                unit="CKB"
              />
            )}
            {changeCellCapacity != null && changeCellCapacity > 0n && (
              <SummaryRow label="Change cell" value={shannonToCKB(changeCellCapacity)} unit="CKB" />
            )}
            {!!fee && <SummaryRow label="Network fee" value={shannonToCKB(fee)} unit="CKB" />}
            {ckbBalance != null && spentCapacity > 0n && (
              <SummaryRow
                label="CKB after"
                value={shannonToCKB(ckbBalance - spentCapacity)}
                unit="CKB"
                strong
                divider
              />
            )}
          </SummaryPanel>
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
