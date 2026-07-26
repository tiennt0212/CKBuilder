"use client";

import { FormItem } from "@/components/ui/FormItem";
import { NoteBox } from "@/components/ui/NoteBox";
import { DEP_TYPE_LABELS, DEP_TYPES, DepType } from "@/lib/ckb/dep-type";
import type { DeployedScript } from "@/lib/ckb/deployed-scripts";
import { HASH_TYPES, HashType } from "@/lib/ckb/hash-type";
import type { ScriptAction } from "@/lib/ckb/script-actions";
import { ScriptSource } from "@/features/invoke/script-source";
import { ROUTES } from "@/lib/routes";
import { SaveOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { Button, Card, Form, Input, InputNumber, Segmented, Select } from "antd";
import type { FormInstance } from "antd/es/form";
import Link from "next/link";

const DEP_TYPE_OPTIONS = DEP_TYPES.map((d) => ({ value: d, label: DEP_TYPE_LABELS[d] }));

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
  /** The registry entry currently selected in Deployed mode; drives the read-only hash_type. */
  selected: DeployedScript | null;
  /** Actions known for the currently selected script. Empty → raw witness fallback. */
  actions: ScriptAction[];
  isInProgress: boolean;
  isDisabled: boolean;
  onValuesChange: (changedValues: unknown, allValues: Record<string, unknown>) => void;
  onFinish: (values: Record<string, unknown>) => void;
  /** Persist the manually entered script into the registry so it can be picked next time. */
  onSaveToRegistry: () => void;
}

export function InvokeInputCard({
  form,
  scripts,
  selected,
  actions,
  isInProgress,
  isDisabled,
  onValuesChange,
  onFinish,
  onSaveToRegistry,
}: InvokeInputCardProps) {
  // Drives which source-specific fields render. Kept in the form so the parent sees it too.
  const mode = (Form.useWatch("mode", form) as ScriptSource) ?? ScriptSource.Deployed;

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
        <FormItem
          name="mode"
          label="Script source"
          style={{ marginBottom: 14 }}
          initialValue={ScriptSource.Deployed}
        >
          <Segmented
            block
            options={[
              { value: ScriptSource.Deployed, label: "Deployed" },
              { value: ScriptSource.Manual, label: "Manual" },
            ]}
            style={{ background: "var(--seg-bg)" }}
          />
        </FormItem>

        {mode === ScriptSource.Deployed ? (
          <>
            {scripts.length === 0 ? (
              <div className="mb-4">
                <NoteBox>
                  No deployed scripts on this network yet. Deploy one on{" "}
                  <Link href={ROUTES.DEPLOY} className="text-primary">
                    Deploy Script
                  </Link>
                  , or switch to <b>Manual</b> to enter a code hash and outpoint by hand. Entries
                  are scoped per network.
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
             * hash_type is a property of the deployed script, not a user choice: the registry
             * already holds the (code_hash, hash_type) pair that resolves. Showing it read-only
             * removes the trap of picking a value that yields ScriptNotFound. Use Manual mode to
             * reference a script with an arbitrary hash_type.
             */}
            <div className="flex gap-3" style={{ marginBottom: 14 }}>
              <FormItem
                label="hash_type"
                hint="from deploy record"
                style={{ marginBottom: 0, flex: 1 }}
              >
                <div className="flex items-center gap-2 rounded-lg border border-app-border bg-panel-bg px-3 py-1.5">
                  <span className="font-mono text-body text-text-1">
                    {selected?.hashType ?? "—"}
                  </span>
                  <span className="text-2xs text-text-3">fixed</span>
                </div>
              </FormItem>
              {/* dep_type shown read-only here for parity with Manual mode; /deploy always
                  writes a plain code cell, so a registry entry is "code" unless saved otherwise. */}
              <FormItem
                label="dep_type"
                hint="from deploy record"
                style={{ marginBottom: 0, flex: 1 }}
              >
                <div className="flex items-center gap-2 rounded-lg border border-app-border bg-panel-bg px-3 py-1.5">
                  <span className="font-mono text-body text-text-1">
                    {selected ? DEP_TYPE_LABELS[selected.depType ?? DepType.Code] : "—"}
                  </span>
                  <span className="text-2xs text-text-3">fixed</span>
                </div>
              </FormItem>
            </div>
          </>
        ) : (
          <>
            <FormItem
              name="manualCodeHash"
              label="code_hash"
              hint="hex · 32 bytes"
              style={{ marginBottom: 14 }}
              rules={[{ required: true, message: "Enter the script code hash" }]}
            >
              <Input placeholder="0x…" className="font-mono" />
            </FormItem>

            {/* Manual mode allows any hash_type, including legacy "data" (VM0). */}
            <FormItem
              name="manualHashType"
              label="hash_type"
              style={{ marginBottom: 14 }}
              initialValue={HashType.Data1}
            >
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
              label="Cell dep"
              hint="outpoint of the code cell"
              style={{ marginBottom: 14 }}
            >
              <div className="flex gap-2">
                <Form.Item
                  name="manualDepTxHash"
                  noStyle
                  rules={[{ required: true, message: "Enter the cell dep tx hash" }]}
                >
                  <Input placeholder="0x… tx hash" className="font-mono" />
                </Form.Item>
                <Form.Item name="manualDepIndex" noStyle initialValue={0}>
                  <InputNumber min={0} step={1} className="w-24" placeholder="index" />
                </Form.Item>
              </div>
            </FormItem>

            <FormItem
              name="manualDepType"
              label="dep_type"
              hint="how the node reads the dep"
              style={{ marginBottom: 14 }}
              initialValue={DepType.Code}
            >
              <Segmented block options={DEP_TYPE_OPTIONS} style={{ background: "var(--seg-bg)" }} />
            </FormItem>

            <FormItem
              name="manualLabel"
              label="Label"
              hint="for the registry"
              style={{ marginBottom: 10 }}
            >
              <Input placeholder="my-script" />
            </FormItem>

            <Button
              htmlType="button"
              icon={<SaveOutlined />}
              onClick={onSaveToRegistry}
              className="mb-4"
              block
            >
              Save to registry
            </Button>
          </>
        )}

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
