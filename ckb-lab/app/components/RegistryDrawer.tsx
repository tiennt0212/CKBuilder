"use client";

import { CopyText } from "@/components/ui/CopyText";
import { FormItem } from "@/components/ui/FormItem";
import { RawBlock } from "@/components/ui/RawBlock";
import { SummaryPanel, SummaryRow } from "@/components/ui/SummaryPanel";
import { SwitchRow } from "@/components/ui/SwitchRow";
import { DEP_TYPE_LABELS, DEP_TYPES, DepType } from "@/lib/ckb/dep-type";
import { deployedScriptId, type DeployedScript } from "@/lib/ckb/deployed-scripts";
import { HASH_TYPES, HashType } from "@/lib/ckb/hash-type";
import { useDeployedScriptsStore } from "@/stores/deployed-scripts";
import { EditOutlined } from "@ant-design/icons";
import type { ccc } from "@ckb-ccc/core";
import { Button, Drawer, Form, Input, InputNumber, Segmented } from "antd";
import { useForm } from "antd/es/form/Form";
import { useState } from "react";

export type RegistryDrawerMode = "view" | "create" | "edit";

interface RegistryDrawerProps {
  mode: RegistryDrawerMode;
  /** Full entry for view/edit; a partial prefill for create (e.g. from /invoke Manual). */
  initial?: Partial<DeployedScript> | null;
  /** Network stamped on a newly created entry. Ignored in edit (keeps the entry's own). */
  network: string;
  onClose: () => void;
}

const HASH_TYPE_OPTIONS = HASH_TYPES.map((h) => ({ value: h, label: h }));
const DEP_TYPE_OPTIONS = DEP_TYPES.map((d) => ({ value: d, label: DEP_TYPE_LABELS[d] }));

const DRAWER_STYLES = {
  header: { padding: "15px 18px", borderBottom: "1px solid var(--border)" },
  body: { padding: "16px 18px", display: "flex", flexDirection: "column" as const, gap: 16 },
  wrapper: { boxShadow: "-6px 0 24px rgba(0,0,0,0.09)", borderLeft: "1px solid var(--border)" },
};

export function RegistryDrawer({ mode, initial, network, onClose }: RegistryDrawerProps) {
  // View can switch to edit in place, so the active mode is local state seeded from the prop.
  const [currentMode, setCurrentMode] = useState<RegistryDrawerMode>(mode);
  const { add, update } = useDeployedScriptsStore();
  const [form] = useForm();

  const isView = currentMode === "view";

  const handleFinish = (v: Record<string, unknown>) => {
    const txHash = String(v.txHash ?? "").trim();
    const index = Number(v.index ?? 0);
    // Edit keeps the entry's original network; create stamps the active one.
    const net = initial?.network ?? network;
    const codeHash = String(v.codeHash ?? "").trim();
    const entry: DeployedScript = {
      id: deployedScriptId(txHash, index, net),
      label: (v.label as string)?.trim() || `${codeHash.slice(0, 10)}…`,
      txHash,
      index,
      codeHash,
      hashType: (v.hashType as ccc.HashType) ?? HashType.Data1,
      depType: (v.depType as ccc.DepType) ?? DepType.Code,
      network: net,
      deployedAt: initial?.deployedAt ?? new Date().toISOString(),
      hidden: !!v.hidden,
    };
    // Edit re-keys: update() drops the old id first when the outpoint/code_hash changed.
    if (currentMode === "edit" && initial?.id) update(initial.id, entry);
    else add(entry);
    onClose();
  };

  const title =
    currentMode === "create"
      ? "Add script"
      : currentMode === "edit"
        ? "Edit script"
        : (initial?.label ?? "Script");

  return (
    <Drawer
      open
      placement="right"
      width={420}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <span className="text-subhead font-semibold text-text-1">{title}</span>
          {isView && initial?.hidden && (
            <span className="text-2xs font-semibold text-text-3 bg-bg-elev border border-app-border rounded-full px-2 py-[2px]">
              Hidden
            </span>
          )}
        </div>
      }
      styles={DRAWER_STYLES}
    >
      {isView && initial ? (
        <>
          <SummaryPanel>
            <SummaryRow label="Label" value={initial.label ?? "—"} />
            <SummaryRow label="Network" value={initial.network ?? "—"} divider />
            <SummaryRow
              label="Deployed"
              value={initial.deployedAt ? new Date(initial.deployedAt).toLocaleString() : "—"}
            />
          </SummaryPanel>

          <RawBlock
            items={[
              {
                key: "script",
                label: "Script reference",
                data: {
                  code_hash: initial.codeHash,
                  hash_type: initial.hashType,
                  dep_type: initial.depType ?? DepType.Code,
                },
                defaultOpen: true,
              },
              {
                key: "outpoint",
                label: "Cell dep out-point",
                data: { tx_hash: initial.txHash, index: initial.index },
              },
            ]}
          />

          <Button icon={<EditOutlined />} onClick={() => setCurrentMode("edit")} block>
            Edit
          </Button>
        </>
      ) : (
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          colon={false}
          onFinish={handleFinish}
          initialValues={{
            label: initial?.label ?? "",
            codeHash: initial?.codeHash ?? "",
            hashType: initial?.hashType ?? HashType.Data1,
            depType: initial?.depType ?? DepType.Code,
            txHash: initial?.txHash ?? "",
            index: initial?.index ?? 0,
            hidden: initial?.hidden ?? false,
          }}
        >
          <FormItem
            name="label"
            label="Label"
            hint="shown in the picker"
            style={{ marginBottom: 14 }}
          >
            <Input placeholder="my-script" />
          </FormItem>

          <FormItem
            name="codeHash"
            label="code_hash"
            hint="hex · 32 bytes"
            style={{ marginBottom: 14 }}
            rules={[{ required: true, message: "Enter the code hash" }]}
          >
            <Input placeholder="0x…" className="font-mono" />
          </FormItem>

          <FormItem name="hashType" label="hash_type" style={{ marginBottom: 14 }}>
            <Segmented block options={HASH_TYPE_OPTIONS} style={{ background: "var(--seg-bg)" }} />
          </FormItem>

          <FormItem label="Cell dep out-point" style={{ marginBottom: 14 }}>
            <div className="flex gap-2">
              <Form.Item
                name="txHash"
                noStyle
                rules={[{ required: true, message: "Enter the tx hash" }]}
              >
                <Input placeholder="0x… tx hash" className="font-mono" />
              </Form.Item>
              <Form.Item name="index" noStyle>
                <InputNumber min={0} step={1} className="w-24" placeholder="index" />
              </Form.Item>
            </div>
          </FormItem>

          <FormItem name="depType" label="dep_type" style={{ marginBottom: 14 }}>
            <Segmented block options={DEP_TYPE_OPTIONS} style={{ background: "var(--seg-bg)" }} />
          </FormItem>

          <Form.Item name="hidden" valuePropName="checked" noStyle>
            <SwitchRow
              title="Hidden"
              subtitle="Keep in the registry but hide from the Invoke picker"
            />
          </Form.Item>

          <div className="flex gap-2 mt-5">
            <Button onClick={onClose} block>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" block>
              {currentMode === "edit" ? "Save changes" : "Add to registry"}
            </Button>
          </div>
        </Form>
      )}
    </Drawer>
  );
}
