"use client";

import { useEffect, useRef, useState } from "react";
import { Form } from "antd";
import { useDebouncedCallback } from "@/lib/useDebouncedCallback";
import { CounterMode } from "@/features/counter/counter-mode";
import { useCounter, type CounterRunParams } from "@/features/counter/useCounter";
import { useRawTx } from "@/features/common/useRawTx";
import type { CounterCell } from "@/lib/ckb/counter-cells";
import { useCounterCellsStore } from "@/stores/counter-cells";
import { useDeployedScriptsStore } from "@/stores/deployed-scripts";
import { useNetworkStore } from "@/stores/network";

const DEBOUNCE_MS = 400;
const SPENT_MESSAGE = "Counter cell not found — it may already be spent";

/**
 * Owns everything CounterActionModal needs for one fixed (mode, entry) pair — the tx lifecycle,
 * the live preview build, and the Form instance. A fresh instance mounts per modal open (the
 * modal is conditionally rendered by CounterPage), so all of this is naturally discarded on close.
 */
export function useCounterActionModal(
  mode: CounterMode,
  entry: CounterCell | null,
  onClose: () => void
) {
  const [activeTab, setActiveTab] = useState("summary");
  const [buildError, setBuildError] = useState<string | null>(null);
  const [form] = Form.useForm();

  const network = useNetworkStore((s) => s.network);
  const { scripts: deployedScripts } = useDeployedScriptsStore();
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
  const { rawTx, txJson, txBytes } = useRawTx();

  const buildParams = (values: Record<string, unknown>): CounterRunParams | null => {
    const feeRate = values.feeRate as number | undefined;
    if (mode === CounterMode.Create) {
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
    if (!entry) return null;
    if (mode === CounterMode.Destroy) return { kind: "destroy", entry, feeRate };
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

  // Increment/Destroy already have a fixed target the instant the modal opens (there's no picker
  // left to wait on, unlike Create) — build the preview immediately instead of waiting for
  // onValuesChange. Calls buildTx directly rather than through debouncedBuild: routing this
  // through the debounce's setTimeout is vulnerable to React Strict Mode's dev-only double-invoke
  // (mount -> cleanup -> mount) cancelling the just-scheduled timer via useDebouncedCallback's
  // own unmount cleanup, before it ever fires — silently leaving the preview empty until the user
  // happens to trigger a real onValuesChange. Guarded by a ref (not an empty dep array) so this
  // stays exhaustive-deps clean; rawTx/buildTx aren't memoized upstream so they change identity
  // every render, but the ref makes every re-invocation past the first a harmless no-op.
  const hasAutoBuilt = useRef(false);
  useEffect(() => {
    if (hasAutoBuilt.current || mode === CounterMode.Create || !entry) return;
    hasAutoBuilt.current = true;
    const feeRate = form.getFieldValue("feeRate") as number | undefined;
    const params: CounterRunParams =
      mode === CounterMode.Destroy
        ? { kind: "destroy", entry, feeRate }
        : { kind: "increment", entry, feeRate };
    rawTx(() => buildTx(params))
      .then(() => setBuildError(null))
      .catch((err: unknown) =>
        setBuildError(err instanceof Error ? err.message : "Failed to build transaction")
      );
  }, [mode, entry, form, rawTx, buildTx]);

  const handleValuesChange = (_: unknown, values: Record<string, unknown>) => {
    // Don't rebuild during an in-flight tx — state updates would be ignored anyway.
    if (isInProgress) return;
    const params = buildParams(values);
    if (!params) {
      setBuildError(null);
      return;
    }
    debouncedBuild(params);
  };

  const handleFinish = (values: Record<string, unknown>) => {
    const params = buildParams(values);
    if (!params) return;
    run(params)
      .then((hash) => console.log("Counter tx sent:", hash))
      .catch((err) => console.error("Counter tx failed:", err));
  };

  const handleForgetEntry = () => {
    if (!entry) return;
    useCounterCellsStore.getState().remove(entry.id, network);
    setBuildError(null);
    onClose();
  };

  const handleReset = () => {
    setBuildError(null);
    reset();
    onClose();
  };

  const isSpentError = buildError === SPENT_MESSAGE || error === SPENT_MESSAGE;

  return {
    form,
    activeTab,
    setActiveTab,
    buildError,
    deployedScripts,
    fee,
    priorCount,
    newCount,
    outputCapacity,
    txJson,
    txBytes,
    status,
    isInProgress,
    error,
    txHash,
    blockNumber,
    isSpentError,
    handleValuesChange,
    handleFinish,
    handleForgetEntry,
    handleReset,
  };
}
