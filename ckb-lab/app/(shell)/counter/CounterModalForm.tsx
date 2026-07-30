"use client";

import { CopyText } from "@/components/ui/CopyText";
import { FormItem } from "@/components/ui/FormItem";
import { NoteBox } from "@/components/ui/NoteBox";
import { SummaryPanel, SummaryRow } from "@/components/ui/SummaryPanel";
import { CounterMode } from "@/features/counter/counter-mode";
import type { CounterCell } from "@/lib/ckb/counter-cells";
import type { DeployedScript } from "@/lib/ckb/deployed-scripts";
import { ROUTES } from "@/lib/routes";
import { DeleteOutlined, PlusCircleOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { Button, Card, Form, Input, Popconfirm, Segmented, Select } from "antd";
import type { FormInstance } from "antd/es/form";
import Link from "next/link";

const FEE_RATES = [
  { value: 1000, name: "Slow", sub: "1,000 sh/KB" },
  { value: 2000, name: "Standard", sub: "2,000 sh/KB" },
  { value: 5000, name: "Fast", sub: "5,000 sh/KB" },
];

const CARD_STYLE = { borderRadius: 12, border: "1px solid var(--border)", height: "100%" };
const HEAD_STYLE = { padding: "16px 18px", borderBottom: "1px solid var(--border)" };
const BODY_STYLE = { padding: "18px", overflowY: "auto" as const };

const MODE_HEADINGS: Record<CounterMode, { title: string; subtitle: string }> = {
  [CounterMode.Create]: {
    title: "Create counter",
    subtitle: "Mint a new on-chain counter cell",
  },
  [CounterMode.Increment]: {
    title: "Increment counter",
    subtitle: "Increment this counter's on-chain value by 1",
  },
  [CounterMode.Destroy]: {
    title: "Destroy counter",
    subtitle: "Consume this cell and reclaim its capacity",
  },
};

interface CounterModalFormProps {
  form: FormInstance;
  /** Fixed for the lifetime of the modal — this is which action opened it, not user-editable. */
  mode: CounterMode;
  /** The target cell for Increment/Destroy. Always null for Create (there's no row yet). */
  entry: CounterCell | null;
  deployedScripts: DeployedScript[];
  isInProgress: boolean;
  onValuesChange: (changedValues: unknown, allValues: Record<string, unknown>) => void;
  onFinish: (values: Record<string, unknown>) => void;
}

export function CounterModalForm({
  form,
  mode,
  entry,
  deployedScripts,
  isInProgress,
  onValuesChange,
  onFinish,
}: CounterModalFormProps) {
  const isDisabled = mode === CounterMode.Create ? deployedScripts.length === 0 : !entry;
  const heading = MODE_HEADINGS[mode];

  return (
    <Card
      title={
        <div>
          <div className="text-subhead font-semibold text-text-1">{heading.title}</div>
          <div className="text-hint text-text-3 font-normal">{heading.subtitle}</div>
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
          name="feeRate"
          label="Fee Rate"
          style={{ marginBottom: 14 }}
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

        {mode === CounterMode.Create && (
          <>
            {deployedScripts.length === 0 ? (
              <div className="mb-4">
                <NoteBox>
                  No deployed scripts on this network yet. Deploy the compiled counter binary on{" "}
                  <Link href={ROUTES.DEPLOY} className="text-primary">
                    Deploy Script
                  </Link>{" "}
                  first. Entries are scoped per network.
                </NoteBox>
              </div>
            ) : null}

            <FormItem
              name="scriptId"
              label="Counter script"
              hint="deployed cell"
              style={{ marginBottom: 14 }}
              rules={[{ required: true, message: "Select the deployed counter script" }]}
            >
              <Select
                placeholder="Select a deployed script"
                disabled={deployedScripts.length === 0}
                options={deployedScripts.map((s) => ({
                  value: s.id,
                  label: (
                    <span className="flex items-center gap-2">
                      <span className="text-body">{s.label}</span>
                      <span className="font-mono text-hint text-text-3">
                        · {s.codeHash.slice(0, 10)}…
                      </span>
                    </span>
                  ),
                }))}
              />
            </FormItem>

            <FormItem
              name="label"
              label="Label"
              hint="optional · to find it again later"
              style={{ marginBottom: 18 }}
            >
              <Input placeholder="e.g. my first counter" />
            </FormItem>

            <Button
              type="primary"
              htmlType="submit"
              block
              icon={isInProgress ? undefined : <PlusCircleOutlined />}
              iconPosition="end"
              loading={isInProgress}
              disabled={isDisabled || isInProgress}
              style={{ height: 44 }}
            >
              {isInProgress ? "Processing…" : "Create counter (count = 0)"}
            </Button>
          </>
        )}

        {mode !== CounterMode.Create && entry && (
          <div style={{ marginBottom: 18 }}>
            <SummaryPanel>
              <SummaryRow label="Label" value={entry.label || "Counter"} />
              <SummaryRow label="Count" value={entry.count} divider />
            </SummaryPanel>
            <div className="flex gap-3 mt-3">
              <FormItem label="code_hash" hint="fixed" style={{ marginBottom: 0, flex: 1 }}>
                <div className="rounded-lg border border-app-border bg-panel-bg px-3 py-1.5">
                  <CopyText
                    text={entry.script.codeHash}
                    display={`${entry.script.codeHash.slice(0, 10)}…`}
                    textClassName="font-mono text-body text-text-1"
                  />
                </div>
              </FormItem>
              <FormItem label="outpoint" hint="current cell" style={{ marginBottom: 0, flex: 1 }}>
                <div className="rounded-lg border border-app-border bg-panel-bg px-3 py-1.5">
                  <CopyText
                    text={`${entry.outPoint.txHash}:${entry.outPoint.index}`}
                    display={`${entry.outPoint.txHash.slice(0, 10)}…`}
                    textClassName="font-mono text-body text-text-1"
                  />
                </div>
              </FormItem>
            </div>
          </div>
        )}

        {mode === CounterMode.Increment && (
          <Button
            type="primary"
            htmlType="submit"
            block
            icon={isInProgress ? undefined : <ThunderboltOutlined />}
            iconPosition="end"
            loading={isInProgress}
            disabled={isDisabled || isInProgress}
            style={{ height: 44 }}
          >
            {isInProgress ? "Processing…" : "Increment (+1)"}
          </Button>
        )}

        {mode === CounterMode.Destroy && (
          <Popconfirm
            title="Destroy this counter?"
            description="Consumes the cell and reclaims its capacity. This cannot be undone."
            okText="Destroy"
            okButtonProps={{ danger: true }}
            disabled={isDisabled || isInProgress}
            onConfirm={() => form.submit()}
          >
            <Button
              htmlType="button"
              danger
              block
              icon={isInProgress ? undefined : <DeleteOutlined />}
              iconPosition="end"
              loading={isInProgress}
              disabled={isDisabled || isInProgress}
              style={{ height: 44 }}
            >
              {isInProgress ? "Processing…" : "Destroy"}
            </Button>
          </Popconfirm>
        )}
      </Form>
    </Card>
  );
}
