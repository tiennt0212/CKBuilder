"use client";

import { Card, Input, Button, Select, Divider, Form } from "antd";
import { ArrowRightOutlined } from "@ant-design/icons";
import { FormItem } from "@/components/ui/FormItem";
import { useNetworkStore } from "@/stores/network";
import { NETWORK_LABELS } from "@/lib/ccc-client";
import { TypeScriptCombobox } from "./TypeScriptCombobox";

const CARD_STYLE = {
  borderRadius: 12,
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow)",
  height: "100%",
  display: "flex",
  flexDirection: "column" as const,
  overflow: "hidden",
};
const HEAD_STYLE = { padding: "16px 18px", borderBottom: "1px solid var(--border)" };
const BODY_STYLE = {
  padding: 0,
  flex: 1,
  display: "flex",
  flexDirection: "column" as const,
  overflow: "hidden",
};

interface CellQuerySidebarProps {
  lockAddress: string;
  addressError: string | null;
  typeScriptId: string | null;
  capacityMin: string;
  capacityMax: string;
  dataLenMin: string;
  dataLenMax: string;
  dataPattern: string;
  dataSearchMode: "prefix" | "exact" | "partial";
  loading: boolean;
  canQuery: boolean;
  onLockAddressChange: (v: string) => void;
  onTypeScriptChange: (id: string | null) => void;
  onCapacityChange: (min: string, max: string) => void;
  onDataLenChange: (min: string, max: string) => void;
  onDataPatternChange: (pattern: string, mode: "prefix" | "exact" | "partial") => void;
  onQuery: () => void;
}

export function CellQuerySidebar({
  lockAddress,
  addressError,
  typeScriptId,
  capacityMin,
  capacityMax,
  dataLenMin,
  dataLenMax,
  dataPattern,
  dataSearchMode,
  loading,
  canQuery,
  onLockAddressChange,
  onTypeScriptChange,
  onCapacityChange,
  onDataLenChange,
  onDataPatternChange,
  onQuery,
}: CellQuerySidebarProps) {
  const { network } = useNetworkStore();

  const subtitle = `CKB Indexer · ${NETWORK_LABELS[network]}`;

  return (
    <Card
      title={
        <div>
          <div className="text-subhead font-semibold text-text-1">Query</div>
          <div className="text-hint text-text-3 font-normal">{subtitle}</div>
        </div>
      }
      style={CARD_STYLE}
      styles={{ header: HEAD_STYLE, body: BODY_STYLE }}
    >
      {/* Scrollable form fields */}
      {/* WHY: Form context sets layout="vertical" so FormItem labels stack above inputs. */}
      <div className="flex-1 overflow-y-auto px-4.5 pt-4 pb-2.5">
        <Form layout="vertical" component={false}>
          <div className="flex flex-col gap-3.5">
            <FormItem label="Lock Script" hint="address · optional" style={{ marginBottom: 0 }}>
              <Input
                className="font-mono"
                placeholder="ckt1qz… or ckb1qz…"
                value={lockAddress}
                onChange={(e) => onLockAddressChange(e.target.value)}
                onPressEnter={canQuery ? onQuery : undefined}
                status={addressError ? "error" : undefined}
                style={{ height: 40 }}
              />
              {addressError && <div className="text-rust text-hint mt-1">{addressError}</div>}
            </FormItem>

            <FormItem label="Type Script" hint="optional" style={{ marginBottom: 0 }}>
              <TypeScriptCombobox
                value={typeScriptId}
                onChange={onTypeScriptChange}
                disabled={loading}
              />
            </FormItem>

            <Divider style={{ margin: "4px 0" }} />

            <FormItem label="Capacity range" hint="CKB" style={{ marginBottom: 0 }}>
              <div className="flex items-center gap-1.5">
                <Input
                  placeholder="min"
                  value={capacityMin}
                  onChange={(e) => onCapacityChange(e.target.value, capacityMax)}
                  style={{ height: 36, fontSize: 12.5 }}
                />
                <span className="text-text-3 text-hint shrink-0">–</span>
                <Input
                  placeholder="max"
                  value={capacityMax}
                  onChange={(e) => onCapacityChange(capacityMin, e.target.value)}
                  style={{ height: 36, fontSize: 12.5 }}
                />
              </div>
            </FormItem>

            <FormItem label="Data length" hint="bytes" style={{ marginBottom: 0 }}>
              <div className="flex items-center gap-1.5">
                <Input
                  placeholder="min"
                  value={dataLenMin}
                  onChange={(e) => onDataLenChange(e.target.value, dataLenMax)}
                  style={{ height: 36, fontSize: 12.5 }}
                />
                <span className="text-text-3 text-hint shrink-0">–</span>
                <Input
                  placeholder="max"
                  value={dataLenMax}
                  onChange={(e) => onDataLenChange(dataLenMin, e.target.value)}
                  style={{ height: 36, fontSize: 12.5 }}
                />
              </div>
            </FormItem>

            <FormItem label="Data pattern" style={{ marginBottom: 0 }}>
              <div className="flex gap-1.5">
                <Input
                  className="font-mono flex-1"
                  placeholder="0x…"
                  value={dataPattern}
                  onChange={(e) => onDataPatternChange(e.target.value, dataSearchMode)}
                  style={{ height: 36, fontSize: 12 }}
                />
                <Select
                  value={dataSearchMode}
                  onChange={(v) => onDataPatternChange(dataPattern, v)}
                  style={{ width: 80, height: 36, fontSize: 11.5 }}
                  options={[
                    { value: "prefix", label: "prefix" },
                    { value: "exact", label: "exact" },
                    { value: "partial", label: "partial" },
                  ]}
                />
              </div>
            </FormItem>
          </div>
        </Form>
      </div>

      {/* Sticky Query button */}
      <div
        className="px-4.5 pt-3 pb-4.5 shrink-0"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <Button
          type="primary"
          block
          loading={loading}
          disabled={!canQuery}
          onClick={onQuery}
          style={{ height: 44 }}
          icon={<ArrowRightOutlined />}
          iconPosition="end"
        >
          Query
        </Button>
      </div>
    </Card>
  );
}
