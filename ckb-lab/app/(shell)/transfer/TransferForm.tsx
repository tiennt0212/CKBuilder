"use client";

import { CellChip } from "@/components/ui/CellChip";
import { CopyText } from "@/components/ui/CopyText";
import { FormItem } from "@/components/ui/FormItem";
import { RawBlock } from "@/components/ui/RawBlock";
import { SummaryPanel, SummaryRow } from "@/components/ui/SummaryPanel";
import { useRawTx } from "@/features/common/useRawTx";
import { useTransfer } from "@/features/transfer/useTransfer";
import { useWalletAccount } from "@/features/wallet/useWalletAccount";
import { ckbToShannons, formatCapacity, Network, shannonToCKB, truncateAddress } from "@/lib";
import { addressFromLock } from "@/lib/ckb/utils";
import { useNetworkStore } from "@/stores/network";
import { ArrowRightOutlined, CopyOutlined } from "@ant-design/icons";
import { Button, Card, Form, Input, InputNumber, Segmented } from "antd";
import { useForm } from "antd/es/form/Form";
import { useEffect, useState } from "react";

const FEE_RATES = [
  { value: 1000, name: "Slow", sub: "1,000 sh/KB" },
  { value: 2000, name: "Standard", sub: "2,000 sh/KB" },
  { value: 5000, name: "Fast", sub: "5,000 sh/KB" },
];

const CARD_STYLE = {
  borderRadius: 12,
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow)",
};
const HEAD_STYLE = { padding: "16px 18px", borderBottom: "1px solid var(--border)" };
const BODY_STYLE = { padding: "18px" };

const MOCK_TX = {
  version: "0x0",
  cell_deps: [
    {
      out_point: {
        tx_hash: "0x71a7ba8fc96349fea0ed3a5c47992e3b4084b031a42264a018e0072e8172e46c",
        index: "0x0",
      },
      dep_type: "dep_group",
    },
  ],
  inputs: [{ previous_output: { tx_hash: "0xabc123def456…", index: "0x0" }, since: "0x0" }],
  outputs: [
    {
      capacity: "0x174876e800",
      lock: { code_hash: "0x9bd7e06f…", hash_type: "type", args: "0xdeadbeef…" },
      type: null,
    },
    {
      capacity: "0x1f2c0b2c00",
      lock: { code_hash: "0x9bd7e06f…", hash_type: "type", args: "0xfeedface…" },
      type: null,
    },
  ],
  outputs_data: ["0x", "0x"],
  witnesses: ["0x5500000010000000550000005500000041000000…"],
};

export function TransferForm() {
  const [activeTab, setActiveTab] = useState("summary");
  const { buildTx, fee, transfer, status } = useTransfer();
  const { network, lockLabelMap, cccClient } = useNetworkStore();
  const addressPlaceholder = network === Network.Testnet ? "ckt…" : "ckb…";
  const { address, balance } = useWalletAccount();
  const [form] = useForm();
  const amountCkb = Form.useWatch("amount", form);
  const from = Form.useWatch("from", form);

  const { rawTx, txJson, txBytes, isBuilding } = useRawTx();

  useEffect(() => {
    if (address) {
      form.setFieldValue("from", address);
    }
  }, [address]);

  return (
    <div className="grid grid-cols-[1fr_1.07fr] gap-5 items-start">
      {/* Form card */}
      <Card
        title={
          <div>
            <div className="text-subhead font-semibold text-text-1">Transfer CKB</div>
            <div className="text-hint text-text-3 font-normal">
              Send capacity to another address
            </div>
          </div>
        }
        style={CARD_STYLE}
        styles={{ header: HEAD_STYLE, body: BODY_STYLE }}
      >
        Status: {status}
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          colon={false}
          onValuesChange={async (_, values) => {
            const { to, amount, feeRate } = values;
            if (!to || !amount) return;
            try {
              await form.validateFields();
            } catch (error: any) {
              if (error?.errorFields?.length > 0) return;
            }
            await rawTx(() => buildTx({ to, amountCkb: amount.toString(), feeRate }));
            console.group("Transaction Preview");
            console.log("Form Values:", values);
            console.log("Tx JSON:", txJson);
            console.log("Tx Bytes:", txBytes);
            console.groupEnd();
          }}
          onFinish={(values) => {
            const { to, amount, feeRate } = values;
            transfer({ to, amountCkb: amount.toString(), feeRate })
              .then((txhash) => console.log("Transaction sent:", txhash))
              .catch((err) => console.error(err));
          }}
        >
          <FormItem name="from" label="From Address" style={{ marginBottom: 14 }}>
            <Input
              placeholder={addressPlaceholder}
              suffix={address && <CopyText text={address} />}
              className="font-mono"
              style={{ height: 42 }}
              disabled
            />
          </FormItem>

          <FormItem
            name="to"
            label="To Address"
            style={{ marginBottom: 14 }}
            rules={[{ required: true, message: "Please enter the recipient address" }]}
          >
            <Input
              placeholder={addressPlaceholder}
              suffix={
                <CopyOutlined className="text-text-3 cursor-pointer hover:text-primary transition-colors" />
              }
              className="font-mono"
              style={{ height: 42 }}
            />
          </FormItem>

          <FormItem
            name="amount"
            label="Amount"
            hint="Min: 61 CKB"
            style={{ marginBottom: 14 }}
            rules={[
              { required: true, message: "Please enter the amount to send" },
              {
                validator: (_, value) => {
                  if (!value) {
                    return Promise.resolve();
                  } else if (value < 61) {
                    return Promise.reject(new Error("Amount must be at least 61 CKB"));
                  } else if (balance && ckbToShannons(String(value)) > balance) {
                    return Promise.reject(
                      new Error(`Amount cannot exceed your balance of ${shannonToCKB(balance)} CKB`)
                    );
                  } else {
                    return Promise.resolve();
                  }
                },
              },
            ]}
          >
            <InputNumber
              placeholder="0.00000000"
              suffix={
                <span className="flex items-center gap-2">
                  <span className="text-2xs font-semibold px-[5px] py-px rounded bg-primary-tint text-primary cursor-pointer select-none">
                    MAX
                  </span>
                  <span className="text-body text-text-2 font-medium">CKB</span>
                </span>
              }
              style={{ height: 42, fontSize: 20, fontWeight: 600 }}
              className="tabular-nums w-full!"
            />
          </FormItem>

          <FormItem
            name="feeRate"
            label="Fee Rate"
            style={{ marginBottom: 20 }}
            initialValue={FEE_RATES[0].value}
          >
            <Segmented
              block
              options={FEE_RATES.map((r) => ({
                value: r.value,
                label: (
                  <div className="py-1.5">
                    <div className="text-body font-medium">{r.name}</div>
                    <div className="text-2xs text-text-3 tabular-nums">{r.sub}</div>
                  </div>
                ),
              }))}
              style={{ background: "var(--seg-bg)" }}
            />
          </FormItem>

          <Button
            type="primary"
            htmlType="submit"
            block
            icon={<ArrowRightOutlined />}
            iconPosition="end"
            style={{ height: 44 }}
          >
            Send Transaction
          </Button>
        </Form>
      </Card>

      {/* Preview card */}
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
        onTabChange={setActiveTab}
        style={CARD_STYLE}
        styles={{ header: HEAD_STYLE, body: BODY_STYLE }}
      >
        {activeTab === "summary" ? (
          <div className="flex flex-col gap-4">
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
    </div>
  );
}
