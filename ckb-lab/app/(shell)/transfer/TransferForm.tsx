"use client";

import { Card, Form, Input, Button, Segmented } from "antd";
import { ArrowRightOutlined, CopyOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { FormItem } from "@/components/ui/FormItem";
import { CellChip } from "@/components/ui/CellChip";
import { SummaryPanel, SummaryRow } from "@/components/ui/SummaryPanel";
import { RawBlock } from "@/components/ui/RawBlock";
import { useTransfer } from "@/features/transfer/useTransfer";
import { useNetworkStore } from "@/stores/network";
import { ckbToShannons, Network } from "@/lib";
import { useWalletAccount } from "@/features/wallet/useWalletAccount";
import { useForm } from "antd/es/form/Form";
import { CopyText } from "@/components/ui/CopyText";

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
  inputs: [
    { previous_output: { tx_hash: "0xabc123def456…", index: "0x0" }, since: "0x0" },
  ],
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
  const [feeRate, setFeeRate] = useState(2000);
  const [activeTab, setActiveTab] = useState("summary");
  const { transfer, status } = useTransfer();
  const { network } = useNetworkStore();
  const addressPlaceholder = network === Network.Testnet ? "ckt…" : "ckb…";
  const { address, balance } = useWalletAccount();
  const [form] = useForm();


  useEffect(() => {
    if (address) {
      form.setFieldValue("from", address);
    }
  }, [address])

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
          onFinish={(values) => {
            const { to, amount } = values;
            transfer(to, ckbToShannons(amount)).then(txhash => console.log("Transaction sent:", txhash)).catch(err => console.error(err));
          }}>
          <FormItem name="from" label="From Address" style={{ marginBottom: 14 }} >
            <Input
              placeholder={addressPlaceholder}
              suffix={
                address && <CopyText text={address} />
              }
              className="font-mono"
              style={{ height: 42 }}
              disabled
            />
          </FormItem>

          <FormItem name="to" label="To Address" style={{ marginBottom: 14 }}>
            <Input
              placeholder={addressPlaceholder}
              suffix={
                <CopyOutlined className="text-text-3 cursor-pointer hover:text-primary transition-colors" />
              }
              className="font-mono"
              style={{ height: 42 }}
            />
          </FormItem>

          <FormItem name="amount" label="Amount" hint="Min: 61 CKB" style={{ marginBottom: 14 }}>
            <Input
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
              className="tabular-nums"
            />
          </FormItem>

          <FormItem name="feeRate" label="Fee Rate" style={{ marginBottom: 20 }}>
            <Segmented
              block
              value={feeRate}
              onChange={(v) => setFeeRate(v as number)}
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
            <div className="rounded-[10px] bg-panel-bg p-4">
              <div className="grid grid-cols-[1fr_20px_1fr] gap-3 items-start">
                <div>
                  <div className="text-2xs font-semibold text-text-3 uppercase tracking-widest2 mb-2">
                    INPUTS · 1 CELL
                  </div>
                  <CellChip
                    capacity="990.001"
                    lockLabel="secp256k1_blake160"
                    address="ckt1qy…feed1a"
                  />
                </div>
                <div className="flex items-center justify-center" style={{ paddingTop: 34 }}>
                  <ArrowRightOutlined style={{ color: "var(--text-3)" }} />
                </div>
                <div>
                  <div className="text-2xs font-semibold text-text-3 uppercase tracking-widest2 mb-2">
                    OUTPUTS · 2 CELLS
                  </div>
                  <div className="flex flex-col gap-2">
                    <CellChip
                      capacity="100"
                      lockLabel="secp256k1_blake160"
                      address="ckt1qy…m3f9a"
                      accent="primary"
                    />
                    <CellChip
                      capacity="889.999"
                      lockLabel="secp256k1_blake160 (change)"
                      address="ckt1qy…feed1a"
                      accent="neutral"
                    />
                  </div>
                </div>
              </div>
            </div>

            <SummaryPanel>
              <SummaryRow label="Amount" value="100" unit="CKB" />
              <SummaryRow label="Fee" value="0.001" unit="CKB" />
              <SummaryRow label="Balance after" value="889.999" unit="CKB" strong divider />
            </SummaryPanel>
          </div>
        ) : (
          <RawBlock data={MOCK_TX} byteCount={320} />
        )}
      </Card>
    </div>
  );
}
