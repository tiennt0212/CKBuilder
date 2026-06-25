"use client";

import { CopyText } from "@/components/ui/CopyText";
import { FormItem } from "@/components/ui/FormItem";
import { ckbToShannons, shannonToCKB } from "@/lib";
import { ArrowRightOutlined, CopyOutlined } from "@ant-design/icons";
import { Button, Card, Form, Input, InputNumber, Segmented } from "antd";
import type { FormInstance } from "antd/es/form";

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

interface TransferInputCardProps {
  form: FormInstance;
  addressPlaceholder: string;
  address: string | null | undefined;
  balance: bigint | null | undefined;
  isInProgress: boolean;
  to: string | undefined;
  onValuesChange: (changedValues: unknown, allValues: Record<string, unknown>) => void;
  onFinish: (values: Record<string, unknown>) => void;
}

export function TransferInputCard({
  form,
  addressPlaceholder,
  address,
  balance,
  isInProgress,
  to,
  onValuesChange,
  onFinish,
}: TransferInputCardProps) {
  return (
    <Card
      title={
        <div>
          <div className="text-subhead font-semibold text-text-1">Transfer CKB</div>
          <div className="text-hint text-text-3 font-normal">Send capacity to another address</div>
        </div>
      }
      style={CARD_STYLE}
      styles={{ header: HEAD_STYLE, body: BODY_STYLE }}
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        colon={false}
        onValuesChange={onValuesChange}
        onFinish={onFinish}
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
              <CopyOutlined
                className="text-text-3 cursor-pointer hover:text-primary transition-colors"
                onClick={() => {
                  if (to) navigator.clipboard.writeText(to);
                }}
              />
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
                    new Error(
                      `Amount cannot exceed your balance of ${shannonToCKB(balance)} CKB`
                    )
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
          icon={isInProgress ? undefined : <ArrowRightOutlined />}
          iconPosition="end"
          loading={isInProgress}
          disabled={isInProgress}
          style={{ height: 44 }}
        >
          {isInProgress ? "Processing…" : "Send Transaction"}
        </Button>
      </Form>
    </Card>
  );
}
