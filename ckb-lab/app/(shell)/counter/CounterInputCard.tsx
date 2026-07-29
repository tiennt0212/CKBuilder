"use client";

import { FormItem } from "@/components/ui/FormItem";
import { NoteBox } from "@/components/ui/NoteBox";
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

const CARD_STYLE = {
  borderRadius: 12,
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow)",
  height: "100%",
  display: "flex",
  flexDirection: "column" as const,
  minHeight: 0,
};
const HEAD_STYLE = { padding: "16px 18px", borderBottom: "1px solid var(--border)" };
const BODY_STYLE = { padding: "18px", flex: 1, overflowY: "auto" as const, minHeight: 0 };

interface CounterInputCardProps {
  form: FormInstance;
  deployedScripts: DeployedScript[];
  counterCells: CounterCell[];
  /** The tracked counter currently selected, under Increment or Destroy. */
  selected: CounterCell | null;
  isInProgress: boolean;
  isDisabled: boolean;
  onValuesChange: (changedValues: unknown, allValues: Record<string, unknown>) => void;
  onFinish: (values: Record<string, unknown>) => void;
}

export function CounterInputCard({
  form,
  deployedScripts,
  counterCells,
  selected,
  isInProgress,
  isDisabled,
  onValuesChange,
  onFinish,
}: CounterInputCardProps) {
  const mode = (Form.useWatch("mode", form) as CounterMode) ?? CounterMode.Create;
  const needsCounterCell = mode === CounterMode.Increment || mode === CounterMode.Destroy;

  // Increment and Destroy both act on a tracked counter cell and share this exact picker —
  // only the submit control below differs between the two.
  const counterCellFields = needsCounterCell && (
    <>
      {counterCells.length === 0 ? (
        <div className="mb-4">
          <NoteBox>
            No tracked counters on this network yet. Switch to <b>Create new</b> to mint one.
          </NoteBox>
        </div>
      ) : null}

      <FormItem
        name="counterCellId"
        label="Counter cell"
        hint="tracked on this browser"
        style={{ marginBottom: 14 }}
        rules={[{ required: true, message: "Select a counter cell" }]}
      >
        <Select
          placeholder="Select a counter cell"
          disabled={counterCells.length === 0}
          options={counterCells.map((c) => ({
            value: c.id,
            label: (
              <span className="flex items-center gap-2">
                <span className="text-body">{c.label || "Counter"}</span>
                <span className="font-mono text-hint text-text-3">
                  · count {c.count} · {c.outPoint.txHash.slice(0, 10)}…
                </span>
              </span>
            ),
          }))}
        />
      </FormItem>

      {/* code_hash/outpoint are properties of the tracked entry, not user input. */}
      <div className="flex gap-3" style={{ marginBottom: 18 }}>
        <FormItem label="code_hash" hint="from create" style={{ marginBottom: 0, flex: 1 }}>
          <div className="flex items-center gap-2 rounded-lg border border-app-border bg-panel-bg px-3 py-1.5">
            <span className="font-mono text-body text-text-1 truncate">
              {selected ? `${selected.script.codeHash.slice(0, 10)}…` : "—"}
            </span>
            <span className="text-2xs text-text-3">fixed</span>
          </div>
        </FormItem>
        <FormItem label="outpoint" hint="current cell" style={{ marginBottom: 0, flex: 1 }}>
          <div className="flex items-center gap-2 rounded-lg border border-app-border bg-panel-bg px-3 py-1.5">
            <span className="font-mono text-body text-text-1 truncate">
              {selected ? `${selected.outPoint.txHash.slice(0, 10)}…` : "—"}
            </span>
            <span className="text-2xs text-text-3">fixed</span>
          </div>
        </FormItem>
      </div>
    </>
  );

  return (
    <Card
      title={
        <div>
          <div className="text-subhead font-semibold text-text-1">Counter</div>
          <div className="text-hint text-text-3 font-normal">
            Create, increment, or destroy an on-chain counter cell
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
          name="mode"
          label="Action"
          style={{ marginBottom: 14 }}
          initialValue={CounterMode.Create}
        >
          <Segmented
            block
            options={[
              { value: CounterMode.Create, label: "Create new" },
              { value: CounterMode.Increment, label: "Increment" },
              { value: CounterMode.Destroy, label: "Destroy" },
            ]}
            style={{ background: "var(--seg-bg)" }}
          />
        </FormItem>

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
              hint="optional · to find it again under Increment/Destroy"
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

        {mode === CounterMode.Increment && (
          <>
            {counterCellFields}
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
          </>
        )}

        {mode === CounterMode.Destroy && (
          <>
            {counterCellFields}
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
          </>
        )}
      </Form>
    </Card>
  );
}
