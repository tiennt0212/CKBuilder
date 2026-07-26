"use client";

import { FormItem } from "@/components/ui/FormItem";
import { NoteBox } from "@/components/ui/NoteBox";
import type { DeployedScript } from "@/lib/ckb/deployed-scripts";
import type { ScriptAction } from "@/lib/ckb/script-actions";
import { ROUTES } from "@/lib/routes";
import { ThunderboltOutlined } from "@ant-design/icons";
import { Button, Card, Form, Input, InputNumber, Segmented, Select } from "antd";
import type { FormInstance } from "antd/es/form";
import Link from "next/link";

const HASH_TYPES = ["type", "data1", "data2"] as const;

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

interface InvokeInputCardProps {
  form: FormInstance;
  scripts: DeployedScript[];
  /** Actions known for the currently selected script. Empty → raw witness fallback. */
  actions: ScriptAction[];
  isInProgress: boolean;
  isDisabled: boolean;
  onValuesChange: (changedValues: unknown, allValues: Record<string, unknown>) => void;
  onFinish: (values: Record<string, unknown>) => void;
}

export function InvokeInputCard({
  form,
  scripts,
  actions,
  isInProgress,
  isDisabled,
  onValuesChange,
  onFinish,
}: InvokeInputCardProps) {
  return (
    <Card
      title={
        <div>
          <div className="text-subhead font-semibold text-text-1">Invoke Script</div>
          <div className="text-hint text-text-3 font-normal">Call a deployed on-chain script</div>
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
        {scripts.length === 0 ? (
          <div className="mb-4">
            <NoteBox>
              No deployed scripts on this network yet. Deploy one on{" "}
              <Link href={ROUTES.DEPLOY} className="text-primary">
                Deploy Script
              </Link>{" "}
              and it will appear here automatically. Entries are scoped per network.
            </NoteBox>
          </div>
        ) : null}

        <FormItem
          name="scriptId"
          label="Script"
          hint="deployed cell"
          style={{ marginBottom: 14 }}
          rules={[{ required: true, message: "Select a deployed script" }]}
        >
          <Select
            placeholder="Select a deployed script"
            disabled={scripts.length === 0}
            options={scripts.map((s) => ({
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

        {/*
         * hash_type is prefilled from the deploy record but stays editable: choosing it is
         * the point of the lesson, and getting it wrong is a useful thing to see fail.
         */}
        <FormItem name="hashType" label="hash_type" style={{ marginBottom: 14 }}>
          <Segmented
            block
            options={HASH_TYPES.map((h) => ({
              value: h,
              label: (
                <div className="py-1.5">
                  <div className="text-body font-medium font-mono">{h}</div>
                </div>
              ),
            }))}
            style={{ background: "var(--seg-bg)" }}
          />
        </FormItem>

        <FormItem
          name="args"
          label="Script args"
          hint="hex"
          style={{ marginBottom: 14 }}
          initialValue="0x"
        >
          <Input placeholder="0x" className="font-mono" />
        </FormItem>

        {actions.length > 0 && (
          <FormItem name="action" label="Action" style={{ marginBottom: 14 }}>
            <Select
              options={actions.map((a) => ({ value: a.key, label: a.label }))}
              placeholder="Select an action"
            />
          </FormItem>
        )}

        {/*
         * CKB scripts publish no ABI, so unless the script is in the action registry there
         * is nothing to build a typed form from. A raw witness field is the only input that
         * works for an arbitrary script — see lib/ckb/script-actions.ts.
         */}
        <FormItem
          name="witness"
          label="Witness data"
          hint={actions.length > 0 ? "or encode via Action" : "hex · optional"}
          style={{ marginBottom: 14 }}
        >
          <Input placeholder="0x" className="font-mono" />
        </FormItem>

        <FormItem
          name="outputData"
          label="Cell data"
          hint="hex · optional"
          style={{ marginBottom: 14 }}
        >
          <Input placeholder="0x" className="font-mono" />
        </FormItem>

        <FormItem
          name="extraCapacity"
          label="Attach capacity"
          hint="added on top of the minimum"
          style={{ marginBottom: 18 }}
          initialValue={0}
        >
          <InputNumber min={0} step={1} addonAfter="CKB" className="w-full" placeholder="0" />
        </FormItem>

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
          {isInProgress ? "Processing…" : "Build & send transaction"}
        </Button>
      </Form>
    </Card>
  );
}
