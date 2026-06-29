"use client";

import { FormItem } from "@/components/ui/FormItem";
import { NoteBox } from "@/components/ui/NoteBox";
import { UploadZone } from "@/components/ui/UploadZone";
import { RocketOutlined } from "@ant-design/icons";
import { Button, Card, Form, Segmented } from "antd";
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

interface DeployInputCardProps {
  form: FormInstance;
  isInProgress: boolean;
  onValuesChange: (changedValues: unknown, allValues: Record<string, unknown>) => void;
  onFinish: (values: Record<string, unknown>) => void;
}

export function DeployInputCard({
  form,
  isInProgress,
  onValuesChange,
  onFinish,
}: DeployInputCardProps) {
  return (
    <Card
      title={
        <div>
          <div className="text-subhead font-semibold text-text-1">Deploy Script</div>
          <div className="text-hint text-text-3 font-normal">
            Upload a compiled RISC-V binary
          </div>
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
        <FormItem
          name="file"
          label="Script Binary"
          style={{ marginBottom: 14 }}
          rules={[{ required: true, message: "Please select a binary file to deploy" }]}
        >
          {/*
           * UploadZone already sets beforeUpload={() => false} internally so Ant Design
           * never POSTs the file to any server endpoint — the binary stays in-browser only.
           */}
          <UploadZone />
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

        <div className="mb-5">
          {/*
           * Capacity rule: minimum = (lock_script_bytes + 8 + binary_size) × 10^8 shannons.
           * The exact amount varies by wallet lock type (secp256k1 args = 20 bytes, others differ).
           * CCC's completeFeeBy computes this automatically from the signer's lock — never hardcode.
           */}
          <NoteBox>
            Required capacity ≈ binary size + 61 CKB overhead for lock script and cell metadata.
            The exact amount is computed automatically from your wallet&apos;s lock script.
          </NoteBox>
        </div>

        <Button
          type="primary"
          htmlType="submit"
          block
          icon={isInProgress ? undefined : <RocketOutlined />}
          iconPosition="end"
          loading={isInProgress}
          disabled={isInProgress}
          style={{ height: 44 }}
        >
          {isInProgress ? "Processing…" : "Deploy Script"}
        </Button>
      </Form>
    </Card>
  );
}
