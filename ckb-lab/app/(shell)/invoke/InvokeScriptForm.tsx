"use client";

import { TxStatusBanner } from "@/components/ui/TxStatusBanner";
import { useRawTx } from "@/features/common/useRawTx";
import { useInvoke } from "@/features/invoke/useInvoke";
import { ckbToShannons } from "@/lib";
import { loadDeployedScripts, type DeployedScript } from "@/lib/ckb/deployed-scripts";
import { actionsForScript } from "@/lib/ckb/script-actions";
import { useDebouncedCallback } from "@/lib/useDebouncedCallback";
import { useNetworkStore } from "@/stores/network";
import type { ccc } from "@ckb-ccc/core";
import { useForm } from "antd/es/form/Form";
import { useEffect, useMemo, useState } from "react";
import { InvokeInputCard } from "./InvokeInputCard";
import { InvokePreviewCard } from "./InvokePreviewCard";

const DEBOUNCE_MS = 400;

/** Normalises an optional hex field: empty or whitespace becomes undefined, not "0x". */
function hexOrUndefined(value: unknown): ccc.Hex | undefined {
  const s = typeof value === "string" ? value.trim() : "";
  return s && s !== "0x" ? (s as ccc.Hex) : undefined;
}

export function InvokeScriptForm() {
  const [activeTab, setActiveTab] = useState("summary");
  const [buildError, setBuildError] = useState<string | null>(null);
  const [scripts, setScripts] = useState<DeployedScript[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [outputData, setOutputData] = useState("0x");

  const network = useNetworkStore((s) => s.network);
  const {
    invoke,
    buildTx,
    fee,
    outputCapacity,
    status,
    isInProgress,
    error,
    txHash,
    blockNumber,
    reset,
  } = useInvoke();
  const [form] = useForm();
  const { rawTx, txJson, txBytes } = useRawTx();

  // localStorage is unavailable during SSR, so the registry can only be read after mount.
  // Re-reads on network change because entries are network-scoped.
  useEffect(() => {
    setScripts(loadDeployedScripts(network));
  }, [network]);

  const selected = useMemo(
    () => scripts.find((s) => s.id === selectedId) ?? null,
    [scripts, selectedId]
  );
  const actions = useMemo(() => (selected ? actionsForScript(selected.codeHash) : []), [selected]);

  const debouncedBuild = useDebouncedCallback(
    async (script: DeployedScript, values: Record<string, unknown>) => {
      try {
        await rawTx(() =>
          buildTx({
            script: {
              codeHash: script.codeHash,
              hashType: (values.hashType as ccc.HashType) ?? script.hashType,
              args: (hexOrUndefined(values.args) ?? "0x") as ccc.Hex,
            },
            cellDep: { txHash: script.txHash, index: script.index },
            outputData: hexOrUndefined(values.outputData) ?? "0x",
            witness: hexOrUndefined(values.witness),
            extraCapacity: ckbToShannons(String(values.extraCapacity ?? 0)),
          })
        );
        setBuildError(null);
      } catch (err: unknown) {
        setBuildError(err instanceof Error ? err.message : "Failed to build transaction");
      }
    },
    DEBOUNCE_MS
  );

  const handleValuesChange = (_: unknown, values: Record<string, unknown>) => {
    // Don't rebuild during an in-flight invoke — state updates would be ignored anyway.
    if (isInProgress) return;

    const id = values.scriptId as string | undefined;
    setSelectedId(id ?? null);
    setOutputData((hexOrUndefined(values.outputData) ?? "0x") as string);

    const script = scripts.find((s) => s.id === id);
    if (!script) {
      setBuildError(null);
      return;
    }

    // Selecting a script prefills hash_type from how it was actually deployed, so the
    // common case works without the user reasoning about it. It stays editable.
    if (values.hashType == null) {
      form.setFieldValue("hashType", script.hashType);
    }

    debouncedBuild(script, values);
  };

  const handleFinish = (values: Record<string, unknown>) => {
    const script = scripts.find((s) => s.id === values.scriptId);
    if (!script) return;
    invoke({
      script: {
        codeHash: script.codeHash,
        hashType: (values.hashType as ccc.HashType) ?? script.hashType,
        args: (hexOrUndefined(values.args) ?? "0x") as ccc.Hex,
      },
      cellDep: { txHash: script.txHash, index: script.index },
      outputData: hexOrUndefined(values.outputData) ?? "0x",
      witness: hexOrUndefined(values.witness),
      extraCapacity: ckbToShannons(String(values.extraCapacity ?? 0)),
    })
      .then((hash) => console.log("Script invoked:", hash))
      .catch((err) => console.error("Invoke failed:", err));
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
        onRetry={handleReset}
        retryLabel="New Invoke"
      />
      <div className="grid grid-cols-[1fr_1.07fr] gap-5 flex-1 min-h-0">
        <InvokeInputCard
          form={form}
          scripts={scripts}
          actions={actions}
          isInProgress={isInProgress}
          isDisabled={scripts.length === 0}
          onValuesChange={handleValuesChange}
          onFinish={handleFinish}
        />
        <InvokePreviewCard
          activeTab={activeTab}
          onTabChange={setActiveTab}
          txJson={txJson}
          txBytes={txBytes}
          fee={fee}
          outputCapacity={outputCapacity}
          scriptLabel={selected?.label ?? null}
          codeHash={selected?.codeHash ?? null}
          buildError={buildError}
          status={status}
          txHash={txHash}
          blockNumber={blockNumber}
          outputData={outputData}
        />
      </div>
    </div>
  );
}
