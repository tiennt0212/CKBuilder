"use client";

import { TxStatusBanner } from "@/components/ui/TxStatusBanner";
import { CounterMode } from "@/features/counter/counter-mode";
import { useCounter, type CounterRunParams } from "@/features/counter/useCounter";
import { useRawTx } from "@/features/common/useRawTx";
import { useCounterCellsStore } from "@/stores/counter-cells";
import { useDeployedScriptsStore } from "@/stores/deployed-scripts";
import { useNetworkStore } from "@/stores/network";
import { useDebouncedCallback } from "@/lib/useDebouncedCallback";
import { useCcc } from "@ckb-ccc/connector-react";
import { Form } from "antd";
import { useEffect, useMemo, useState } from "react";
import { CounterInputCard } from "./CounterInputCard";
import { CounterPreviewCard } from "./CounterPreviewCard";

const DEBOUNCE_MS = 400;
const SPENT_MESSAGE = "Counter cell not found — it may already be spent";

export function CounterForm() {
  const [activeTab, setActiveTab] = useState("summary");
  const [buildError, setBuildError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { network, lockLabelMap } = useNetworkStore();
  const { client: cccClient } = useCcc();
  const { scripts: deployedScripts, refresh: refreshDeployedScripts } = useDeployedScriptsStore();
  const { cells: counterCells, refresh: refreshCounterCells } = useCounterCellsStore();
  const {
    run,
    buildTx,
    fee,
    priorCount,
    newCount,
    outputCapacity,
    status,
    isInProgress,
    error,
    txHash,
    blockNumber,
    reset,
  } = useCounter();
  const [form] = Form.useForm();
  const mode = (Form.useWatch("mode", form) as CounterMode) ?? CounterMode.Create;
  const { rawTx, txJson, txBytes } = useRawTx();

  // localStorage is unavailable during SSR, so both registries can only be filled after mount.
  // Re-read on network change since every entry is network-scoped.
  useEffect(() => {
    refreshDeployedScripts(network);
    refreshCounterCells(network);
  }, [network, refreshDeployedScripts, refreshCounterCells]);

  const visibleDeployedScripts = useMemo(
    () => deployedScripts.filter((s) => !s.hidden),
    [deployedScripts]
  );

  const selected = useMemo(
    () =>
      mode === CounterMode.Increment || mode === CounterMode.Destroy
        ? (counterCells.find((c) => c.id === selectedId) ?? null)
        : null,
    [mode, counterCells, selectedId]
  );

  const buildParams = (
    currentMode: CounterMode,
    values: Record<string, unknown>
  ): CounterRunParams | null => {
    const feeRate = values.feeRate as number | undefined;
    if (currentMode === CounterMode.Create) {
      const script = deployedScripts.find((s) => s.id === values.scriptId);
      if (!script) return null;
      return {
        kind: "create",
        script: {
          codeHash: script.codeHash,
          hashType: script.hashType,
          depType: script.depType,
          cellDep: { txHash: script.txHash, index: script.index },
        },
        label: (values.label as string | undefined)?.trim() || undefined,
        feeRate,
      };
    }
    const entry = counterCells.find((c) => c.id === values.counterCellId);
    if (!entry) return null;
    if (currentMode === CounterMode.Destroy) {
      return { kind: "destroy", entry, feeRate };
    }
    return { kind: "increment", entry, feeRate };
  };

  const debouncedBuild = useDebouncedCallback(async (params: CounterRunParams) => {
    try {
      await rawTx(() => buildTx(params));
      setBuildError(null);
    } catch (err: unknown) {
      setBuildError(err instanceof Error ? err.message : "Failed to build transaction");
    }
  }, DEBOUNCE_MS);

  const handleValuesChange = (_: unknown, values: Record<string, unknown>) => {
    // Don't rebuild during an in-flight tx — state updates would be ignored anyway.
    if (isInProgress) return;

    const currentMode = (values.mode as CounterMode) ?? CounterMode.Create;
    setSelectedId((values.counterCellId as string | undefined) ?? null);

    const params = buildParams(currentMode, values);
    if (!params) {
      setBuildError(null);
      return;
    }
    debouncedBuild(params);
  };

  const handleFinish = (values: Record<string, unknown>) => {
    const currentMode = (values.mode as CounterMode) ?? CounterMode.Create;
    const params = buildParams(currentMode, values);
    if (!params) return;
    run(params)
      .then((hash) => console.log("Counter tx sent:", hash))
      .catch((err) => console.error("Counter tx failed:", err));
  };

  const handleForgetEntry = () => {
    if (!selected) return;
    useCounterCellsStore.getState().remove(selected.id, network);
    setBuildError(null);
  };

  const handleReset = () => {
    setBuildError(null);
    reset();
  };

  const isDisabled =
    mode === CounterMode.Create ? visibleDeployedScripts.length === 0 : counterCells.length === 0;
  const isSpentError = buildError === SPENT_MESSAGE || error === SPENT_MESSAGE;

  return (
    <div className="flex flex-col h-[calc(100vh-var(--height-header)-44px)]">
      <TxStatusBanner
        status={status}
        txHash={txHash}
        blockNumber={blockNumber}
        error={error}
        onRetry={handleReset}
        retryLabel="New Action"
      />
      <div className="grid grid-cols-[1fr_1.07fr] gap-5 flex-1 min-h-0">
        <CounterInputCard
          form={form}
          deployedScripts={visibleDeployedScripts}
          counterCells={counterCells}
          selected={selected}
          isInProgress={isInProgress}
          isDisabled={isDisabled}
          onValuesChange={handleValuesChange}
          onFinish={handleFinish}
        />
        <CounterPreviewCard
          activeTab={activeTab}
          onTabChange={setActiveTab}
          txJson={txJson}
          txBytes={txBytes}
          fee={fee}
          priorCount={priorCount}
          newCount={newCount}
          outputCapacity={outputCapacity}
          buildError={buildError}
          isSpentError={isSpentError}
          onForgetEntry={handleForgetEntry}
          status={status}
          txHash={txHash}
          blockNumber={blockNumber}
          lockLabelMap={lockLabelMap}
          cccClient={cccClient}
        />
      </div>
    </div>
  );
}
