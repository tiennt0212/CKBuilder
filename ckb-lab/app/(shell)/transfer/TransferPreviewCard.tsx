"use client";

import { CellChip } from "@/components/ui/CellChip";
import { RawBlock } from "@/components/ui/RawBlock";
import { SummaryPanel, SummaryRow } from "@/components/ui/SummaryPanel";
import { ckbToShannons, formatCapacity, shannonToCKB, truncateAddress } from "@/lib";
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

interface TransferPreviewCardProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  txJson: ccc.Transaction | null;
  txBytes: Bytes | null;
  amountCkb: number | null | undefined;
  fee: bigint | null;
  balance: bigint | null | undefined;
  from: string | undefined;
  cccClient: ccc.Client;
  lockLabelMap: Record<string, string>;
  buildError?: string | null;
}

export function TransferPreviewCard({
  activeTab,
  onTabChange,
  txJson,
  txBytes,
  amountCkb,
  fee,
  balance,
  from,
  cccClient,
  lockLabelMap,
  buildError,
}: TransferPreviewCardProps) {
  return (
    <Card
      title={
        <div>
          <div className="text-subhead font-semibold text-text-1">Transaction Preview</div>
          <div className="text-hint text-text-3 font-normal">Live preview</div>
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
              <ExclamationCircleOutlined className="flex-shrink-0" style={{ marginTop: 1, fontSize: 14 }} />
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
                <div className="flex items-center justify-center" style={{ paddingTop: 34 }}>
                  <ArrowRightOutlined style={{ color: "var(--text-3)" }} />
                </div>
                <div>
                  <div className="text-2xs font-semibold text-text-3 uppercase tracking-widest2 mb-2">
                    OUTPUTS · {txJson.outputs.length} CELL(s)
                  </div>
                  <div className="flex flex-col gap-2">
                    {txJson.outputs.map((o) => {
                      const address = addressFromLock(cccClient, o.lock);
                      return (
                        <CellChip
                          key={o.lock.args}
                          capacity={formatCapacity(o.capacity)}
                          lockLabel={o.lock.codeHash ? lockLabelMap[o.lock.codeHash] : "Unknown"}
                          address={address ? truncateAddress(address.toString()) : "Unknown"}
                          // Set accent based on the owner of the output cell(s)
                          accent={address?.toString() === from ? "primary" : "neutral"}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          <SummaryPanel>
            {amountCkb != null && (
              <SummaryRow label="Amount" value={String(amountCkb)} unit="CKB" />
            )}
            {!!fee && <SummaryRow label="Fee" value={shannonToCKB(fee)} unit="CKB" />}
            {!!balance && !!fee && amountCkb != null && (
              <SummaryRow
                label="Balance after"
                value={shannonToCKB(balance - ckbToShannons(String(amountCkb)) - fee)}
                unit="CKB"
                strong
                divider
              />
            )}
          </SummaryPanel>
        </div>
      ) : (
        !!txJson && <RawBlock data={txJson} byteCount={txBytes?.length} />
      )}
    </Card>
  );
}
