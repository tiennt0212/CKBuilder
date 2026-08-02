"use client";

import { RegistryDrawer } from "@/components/RegistryDrawer";
import { TxStatusBanner } from "@/components/ui/TxStatusBanner";
import { useRawTx } from "@/features/common/useRawTx";
import { useInvoke, type InvokeParams } from "@/features/invoke/useInvoke";
import { ckbToShannons } from "@/lib";
import { type DeployedScript } from "@/lib/ckb/deployed-scripts";
import { DepType } from "@/lib/ckb/dep-type";
import { HashType } from "@/lib/ckb/hash-type";
import { actionsForScript } from "@/lib/ckb/script-actions";
import { ScriptSource } from "@/features/invoke/script-source";
import { useDebouncedCallback } from "@/lib/useDebouncedCallback";
import { useDeployedScriptsStore } from "@/stores/deployed-scripts";
import { useNetworkStore } from "@/stores/network";
import type { ccc } from "@ckb-ccc/core";
import { Form } from "antd";
import { useEffect, useMemo, useState } from "react";
import { InvokeInputCard } from "./InvokeInputCard";
import { InvokePreviewCard } from "./InvokePreviewCard";

const DEBOUNCE_MS = 400;

/** Normalises an optional hex field: empty or whitespace becomes undefined, not "0x". */
function hexOrUndefined(value: unknown): ccc.Hex | undefined {
  const s = typeof value === "string" ? value.trim() : "";
  return s && s !== "0x" ? (s as ccc.Hex) : undefined;
}

/**
 * Assemble the invoke params from whichever source the form is in.
 * Returns null when the required fields for that mode are not filled yet, so the caller can
 * skip building a preview without treating it as an error.
 */
function buildInvokeParams(
  mode: ScriptSource,
  values: Record<string, unknown>,
  scripts: DeployedScript[]
): InvokeParams | null {
  const args = (hexOrUndefined(values.args) ?? "0x") as ccc.Hex;
  const common = {
    outputData: hexOrUndefined(values.outputData) ?? "0x",
    witness: hexOrUndefined(values.witness),
    extraCapacity: ckbToShannons(String(values.extraCapacity ?? 0)),
  };

  if (mode === ScriptSource.Manual) {
    const codeHash = hexOrUndefined(values.manualCodeHash);
    const txHash = hexOrUndefined(values.manualDepTxHash);
    if (!codeHash || !txHash) return null;
    return {
      script: {
        codeHash,
        hashType: (values.manualHashType as ccc.HashType) ?? HashType.Data1,
        args,
      },
      cellDep: { txHash, index: Number(values.manualDepIndex ?? 0) },
      depType: (values.manualDepType as ccc.DepType) ?? DepType.Code,
      ...common,
    };
  }

  const script = scripts.find((s) => s.id === values.scriptId);
  if (!script) return null;
  return {
    // hash_type comes from the registry, not the form: in Deployed mode it is read-only.
    script: { codeHash: script.codeHash, hashType: script.hashType, args },
    cellDep: { txHash: script.txHash, index: script.index },
    depType: script.depType ?? DepType.Code,
    ...common,
  };
}

export function InvokeScriptForm() {
  const [activeTab, setActiveTab] = useState("summary");
  const [buildError, setBuildError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [outputData, setOutputData] = useState("0x");
  // Prefill for the "Save to registry" drawer, opened from Manual mode. null = closed.
  const [saveDraft, setSaveDraft] = useState<Partial<DeployedScript> | null>(null);

  const network = useNetworkStore((s) => s.network);
  const { scripts, refresh } = useDeployedScriptsStore();
  const {
    invoke,
    buildTx,
    fee,
    outputCapacity,
    status,
    isInProgress,
    error,
    decoded,
    txHash,
    blockNumber,
    reset,
  } = useInvoke();
  const [form] = Form.useForm();
  const mode = (Form.useWatch("mode", form) as ScriptSource) ?? ScriptSource.Deployed;
  const { rawTx, txJson, txBytes } = useRawTx();

  // localStorage is unavailable during SSR, so the store can only be filled after mount.
  // Re-reads on network change because entries are network-scoped.
  useEffect(() => {
    refresh(network);
  }, [network, refresh]);

  // Hidden entries stay in the registry but are kept out of the picker.
  const visibleScripts = useMemo(() => scripts.filter((s) => !s.hidden), [scripts]);

  // In Manual mode there is no registry entry; only Deployed mode has a "selected" script,
  // which drives the read-only hash_type chip and the preview labels.
  const selected = useMemo(
    () =>
      mode === ScriptSource.Deployed ? (scripts.find((s) => s.id === selectedId) ?? null) : null,
    [mode, scripts, selectedId]
  );
  const actions = useMemo(() => (selected ? actionsForScript(selected.codeHash) : []), [selected]);

  const debouncedBuild = useDebouncedCallback(async (params: InvokeParams) => {
    try {
      await rawTx(() => buildTx(params));
      setBuildError(null);
    } catch (err: unknown) {
      setBuildError(err instanceof Error ? err.message : "Failed to build transaction");
    }
  }, DEBOUNCE_MS);

  const handleValuesChange = (_: unknown, values: Record<string, unknown>) => {
    // Don't rebuild during an in-flight invoke — state updates would be ignored anyway.
    if (isInProgress) return;

    const currentMode = (values.mode as ScriptSource) ?? ScriptSource.Deployed;
    setSelectedId((values.scriptId as string | undefined) ?? null);
    setOutputData((hexOrUndefined(values.outputData) ?? "0x") as string);

    const params = buildInvokeParams(currentMode, values, scripts);
    if (!params) {
      setBuildError(null);
      return;
    }
    debouncedBuild(params);
  };

  const handleFinish = (values: Record<string, unknown>) => {
    const currentMode = (values.mode as ScriptSource) ?? ScriptSource.Deployed;
    const params = buildInvokeParams(currentMode, values, scripts);
    if (!params) return;
    invoke(params)
      .then((hash) => console.log("Script invoked:", hash))
      .catch((err) => console.error("Invoke failed:", err));
  };

  // Open the registry drawer (Create) prefilled from the Manual fields, rather than saving
  // straight away — the drawer is the single place entries are created/edited (label, hidden…).
  const handleSaveToRegistry = () => {
    const v = form.getFieldsValue();
    const codeHash = hexOrUndefined(v.manualCodeHash);
    const txHashValue = hexOrUndefined(v.manualDepTxHash);
    if (!codeHash || !txHashValue) {
      setBuildError("Enter a code hash and cell dep tx hash before saving.");
      return;
    }
    setBuildError(null);
    setSaveDraft({
      codeHash,
      txHash: txHashValue,
      index: Number(v.manualDepIndex ?? 0),
      hashType: (v.manualHashType as ccc.HashType) ?? HashType.Data1,
      depType: (v.manualDepType as ccc.DepType) ?? DepType.Code,
    });
  };

  const handleReset = () => {
    setBuildError(null);
    reset();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-var(--height-header)-44px)]">
      <TxStatusBanner
        status={status}
        txHash={txHash}
        blockNumber={blockNumber}
        error={error}
        decoded={decoded}
        onRetry={handleReset}
        retryLabel="New Invoke"
      />
      <div className="grid grid-cols-[1fr_1.07fr] gap-5 flex-1 min-h-0">
        <InvokeInputCard
          form={form}
          scripts={visibleScripts}
          selected={selected}
          actions={actions}
          isInProgress={isInProgress}
          isDisabled={mode === ScriptSource.Deployed && visibleScripts.length === 0}
          onValuesChange={handleValuesChange}
          onFinish={handleFinish}
          onSaveToRegistry={handleSaveToRegistry}
        />
        <InvokePreviewCard
          activeTab={activeTab}
          onTabChange={setActiveTab}
          txJson={txJson}
          txBytes={txBytes}
          fee={fee}
          outputCapacity={outputCapacity}
          scriptLabel={selected?.label ?? (mode === ScriptSource.Manual ? "Manual script" : null)}
          // Prefer the code_hash from the built tx so Manual mode (no registry entry) still
          // shows it; fall back to the selected registry entry before a preview exists.
          codeHash={txJson?.outputs?.[0]?.type?.codeHash ?? selected?.codeHash ?? null}
          buildError={buildError}
          status={status}
          txHash={txHash}
          blockNumber={blockNumber}
          outputData={outputData}
        />
      </div>

      {saveDraft && (
        <RegistryDrawer
          mode="create"
          initial={saveDraft}
          network={network}
          onClose={() => setSaveDraft(null)}
        />
      )}
    </div>
  );
}
