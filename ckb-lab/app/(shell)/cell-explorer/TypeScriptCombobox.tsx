"use client";

import { useState, useRef } from "react";
import { Select, Divider, Input, Button, Segmented } from "antd";
import { PlusOutlined, UploadOutlined, DownloadOutlined } from "@ant-design/icons";
import { useNetworkStore } from "@/stores/network";
import { HASH_TYPES_CREATE } from "@/lib/ckb/hash-type";
import {
  BUILTIN_DAO,
  BUILTIN_XUDT,
  BUILTIN_SPORE,
  SavedTypeScript,
  loadSavedTypeScripts,
  saveSavedTypeScripts,
  savedTypeScriptId,
} from "@/features/wallet/useCellExplorer";

interface TypeScriptComboboxProps {
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
}

const BUILTIN_OPTIONS = [
  { value: BUILTIN_DAO, label: "Nervos DAO", codeHashHint: "0x82d2…" },
  { value: BUILTIN_XUDT, label: "xUDT", codeHashHint: "getKnownScript" },
  { value: BUILTIN_SPORE, label: "Spore / DOB", codeHashHint: "hardcoded" },
];

const EMPTY_FORM: Omit<SavedTypeScript, "network"> = {
  label: "",
  codeHash: "",
  hashType: "type",
  args: "0x",
  memo: "",
};

export function TypeScriptCombobox({ value, onChange, disabled }: TypeScriptComboboxProps) {
  const { network } = useNetworkStore();
  const [savedScripts, setSavedScripts] = useState<SavedTypeScript[]>(() => loadSavedTypeScripts());
  const [showAddForm, setShowAddForm] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const importRef = useRef<HTMLInputElement>(null);

  const networkSaved = savedScripts.filter((s) => s.network === network);

  // ── Options list ────────────────────────────────────────────────────────────

  const options = [
    {
      label: (
        <span className="text-2xs font-semibold uppercase tracking-wider text-text-3">
          Built-in
        </span>
      ),
      title: "Built-in",
      options: BUILTIN_OPTIONS.map((p) => ({
        value: p.value,
        label: p.label,
        // WHY: filterProp searches this field — include codeHashHint so users can search by hash.
        title: `${p.label} ${p.codeHashHint}`,
      })),
    },
    ...(networkSaved.length > 0
      ? [
          {
            label: (
              <span className="text-2xs font-semibold uppercase tracking-wider text-text-3">
                Saved
              </span>
            ),
            title: "Saved",
            options: networkSaved.map((s) => ({
              value: savedTypeScriptId(s),
              label: s.label,
              title: `${s.label} ${s.codeHash} ${s.memo ?? ""}`,
            })),
          },
        ]
      : []),
  ];

  // ── Add form handlers ────────────────────────────────────────────────────────

  const handleSave = () => {
    if (!form.label.trim() || !form.codeHash.trim()) return;
    const entry: SavedTypeScript = { ...form, network };
    const updated = [
      ...savedScripts.filter((s) => savedTypeScriptId(s) !== savedTypeScriptId(entry)),
      entry,
    ];
    saveSavedTypeScripts(updated);
    setSavedScripts(updated);
    onChange(savedTypeScriptId(entry));
    setShowAddForm(false);
    setForm(EMPTY_FORM);
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(savedScripts, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ckbuilder-type-scripts.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target?.result as string) as SavedTypeScript[];
        // WHY: dedup by codeHash+network — existing entries win (import is additive).
        const existing = new Set(savedScripts.map(savedTypeScriptId));
        const merged = [
          ...savedScripts,
          ...imported.filter((s) => !existing.has(savedTypeScriptId(s))),
        ];
        saveSavedTypeScripts(merged);
        setSavedScripts(merged);
      } catch {
        // ignore malformed import
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-2">
      <Select
        allowClear
        showSearch
        placeholder="Select or search…"
        value={value ?? undefined}
        onChange={(v) => onChange(v ?? null)}
        options={options}
        optionFilterProp="title"
        disabled={disabled}
        open={dropdownOpen}
        onOpenChange={setDropdownOpen}
        style={{ width: "100%" }}
        popupRender={(menu) => (
          <>
            {menu}
            <Divider style={{ margin: "4px 0" }} />
            <div
              className="flex items-center gap-1.5 px-3 py-2 cursor-pointer hover:bg-bg-body text-text-2 text-body font-medium"
              onMouseDown={(e) => {
                // WHY: mouseDown instead of click to run before the dropdown closes.
                e.preventDefault();
                setDropdownOpen(false);
                setShowAddForm(true);
              }}
            >
              <PlusOutlined style={{ fontSize: 12 }} />
              Add type script…
            </div>
          </>
        )}
      />

      {/* Inline add form — shows below the combobox when triggered */}
      {showAddForm && (
        <div
          className="rounded-[11px] border border-app-border bg-bg-elev flex flex-col overflow-hidden"
          style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.09)" }}
        >
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-app-border">
            <span className="text-body font-semibold text-text-1">Add type script</span>
            <button
              className="text-text-3 hover:text-text-1 text-body bg-transparent border-none cursor-pointer leading-none"
              onClick={() => {
                setShowAddForm(false);
                setForm(EMPTY_FORM);
              }}
            >
              ✕
            </button>
          </div>

          <div className="flex flex-col gap-2.5 p-3">
            <label className="flex flex-col gap-1">
              <span className="text-hint font-semibold text-text-2">Label</span>
              <Input
                placeholder="e.g. My xUDT token"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                style={{ height: 34 }}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-hint font-semibold text-text-2">code_hash</span>
              <Input
                className="font-mono"
                placeholder="0x…"
                value={form.codeHash}
                onChange={(e) => setForm((f) => ({ ...f, codeHash: e.target.value }))}
                style={{ height: 34, fontSize: 12 }}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-hint font-semibold text-text-2">args</span>
              <Input
                className="font-mono"
                placeholder="0x"
                value={form.args}
                onChange={(e) => setForm((f) => ({ ...f, args: e.target.value }))}
                style={{ height: 34, fontSize: 12 }}
              />
            </label>

            <div className="flex flex-col gap-1">
              <span className="text-hint font-semibold text-text-2">hash_type</span>
              <Segmented
                value={form.hashType}
                onChange={(v) =>
                  setForm((f) => ({ ...f, hashType: v as SavedTypeScript["hashType"] }))
                }
                options={[...HASH_TYPES_CREATE]}
                block
              />
            </div>

            <label className="flex flex-col gap-1">
              <span className="text-hint font-semibold text-text-2">
                Memo <span className="font-normal text-text-3">· optional</span>
              </span>
              <Input
                placeholder="Short note about this type script…"
                value={form.memo}
                onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))}
                style={{ height: 34, fontSize: 12 }}
              />
            </label>

            <div className="flex gap-2 mt-1">
              <Button
                block
                style={{ height: 34 }}
                onClick={() => {
                  setShowAddForm(false);
                  setForm(EMPTY_FORM);
                }}
              >
                Cancel
              </Button>
              <Button
                type="primary"
                block
                style={{ height: 34 }}
                disabled={!form.label.trim() || !form.codeHash.trim()}
                onClick={handleSave}
              >
                Save
              </Button>
            </div>

            <div className="flex border-t border-app-border pt-2" style={{ marginTop: 2 }}>
              <button
                className="flex-1 flex items-center justify-center gap-1.5 h-8 text-hint font-medium text-text-3 hover:text-text-2 bg-transparent border-none cursor-pointer font-sans"
                onClick={handleExport}
              >
                <UploadOutlined style={{ fontSize: 11 }} />
                Export
              </button>
              <div className="w-px bg-app-border my-1" />
              <button
                className="flex-1 flex items-center justify-center gap-1.5 h-8 text-hint font-medium text-text-3 hover:text-text-2 bg-transparent border-none cursor-pointer font-sans"
                onClick={() => importRef.current?.click()}
              >
                <DownloadOutlined style={{ fontSize: 11 }} />
                Import
              </button>
              <input
                ref={importRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImport}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
