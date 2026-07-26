"use client";

import { TxStatusBanner } from "@/components/ui/TxStatusBanner";
import { useRawTx } from "@/features/common/useRawTx";
import { useDeploy } from "@/features/deploy/useDeploy";
import { useWalletAccount } from "@/features/wallet/useWalletAccount";
import { HashType } from "@/lib/ckb/hash-type";
import { useDebouncedCallback } from "@/lib/useDebouncedCallback";
import type { ccc } from "@ckb-ccc/core";
import type { UploadFile } from "antd";
import { useForm } from "antd/es/form/Form";
import { useState } from "react";
import { DeployInputCard } from "./DeployInputCard";
import { DeployPreviewCard } from "./DeployPreviewCard";

const DEBOUNCE_MS = 400;

/**
 * hash_type "type" only resolves for a Type ID cell; a plain data cell must be referenced
 * by its data hash. Force the pair to agree so we never build or record an impossible
 * combination like { data hash, "type" }, which fails at invoke time with ScriptNotFound.
 */
function resolveHashType(hashType: string, enableTypeId: boolean): ccc.HashType {
  if (enableTypeId) return HashType.Type;
  return hashType === HashType.Data2 ? HashType.Data2 : HashType.Data1;
}

export function DeployScriptForm() {
  const [activeTab, setActiveTab] = useState("summary");
  const [buildError, setBuildError] = useState<string | null>(null);
  // enableTypeId is mirrored in local state so DeployPreviewCard re-renders on toggle.
  const [enableTypeId, setEnableTypeId] = useState(false);

  const {
    buildTx,
    deploy,
    fee,
    binarySize,
    status,
    isInProgress,
    error,
    txHash,
    blockNumber,
    reset,
    dataHash,
    typeIdArgs,
    typeIdCodeHash,
  } = useDeploy();
  const { balance } = useWalletAccount();
  const [form] = useForm();

  const { rawTx, txJson, txBytes } = useRawTx();

  // Compute total required (capacity + fee) so CapacityInfoPanel can show the balance chip.
  // Use String() to normalise ccc.Num (bigint or 0x-hex) before coercing to BigInt.
  const cellCapacity = txJson?.outputs?.[0]?.capacity;
  const required = cellCapacity != null && fee != null ? BigInt(String(cellCapacity)) + fee : null;
  const isBalanceInsufficient = balance != null && required != null && balance < required;

  // Build a preview tx whenever the user changes any form field.
  // Debounced to avoid firing on every keystroke / rapid selection change.
  const debouncedBuild = useDebouncedCallback(
    async (file: UploadFile, feeRate: number, hashType: string, enableTypeIdVal: boolean) => {
      try {
        await rawTx(() =>
          buildTx({
            file,
            feeRate,
            // Cast is safe: the form Segmented control only allows valid HashType values.
            hashType: hashType as ccc.HashType,
            enableTypeId: enableTypeIdVal,
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
    // Don't rebuild during an in-flight deploy — state updates would be ignored anyway.
    if (isInProgress) return;
    const files = values.file as UploadFile[] | undefined;
    const feeRate = (values.feeRate as number | undefined) ?? 1000;
    const enableTypeIdVal = (values.enableTypeId as boolean | undefined) ?? false;
    const hashType = resolveHashType(
      (values.hashType as string | undefined) ?? "data1",
      enableTypeIdVal
    );
    // Reflect the forced value back into the Segmented control when Type ID flips it,
    // so what the user sees always matches what will be deployed.
    if (hashType !== values.hashType) form.setFieldValue("hashType", hashType);
    setEnableTypeId(enableTypeIdVal);
    const currentFile = files?.[0];
    if (!currentFile) {
      setBuildError(null);
      return;
    }
    debouncedBuild(currentFile, feeRate, hashType, enableTypeIdVal);
  };

  const handleFinish = (values: Record<string, unknown>) => {
    const files = values.file as UploadFile[] | undefined;
    const feeRate = values.feeRate as number | undefined;
    const enableTypeIdVal = (values.enableTypeId as boolean | undefined) ?? false;
    const hashType = resolveHashType(
      (values.hashType as string | undefined) ?? "data1",
      enableTypeIdVal
    );
    const currentFile = files?.[0];
    if (!currentFile) return;
    deploy({
      file: currentFile,
      feeRate,
      hashType,
      enableTypeId: enableTypeIdVal,
    })
      .then((hash) => console.log("Script deployed:", hash))
      .catch((err) => console.error("Deploy failed:", err));
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
        retryLabel="New Deploy"
      />
      <div className="grid grid-cols-[1fr_1.07fr] gap-5 flex-1 min-h-0">
        <DeployInputCard
          form={form}
          isInProgress={isInProgress}
          isBalanceInsufficient={isBalanceInsufficient}
          required={required}
          balance={balance}
          onValuesChange={handleValuesChange}
          onFinish={handleFinish}
        />
        <DeployPreviewCard
          activeTab={activeTab}
          onTabChange={setActiveTab}
          txJson={txJson}
          txBytes={txBytes}
          fee={fee}
          binarySize={binarySize}
          balance={balance}
          buildError={buildError}
          status={status}
          txHash={txHash}
          blockNumber={blockNumber}
          dataHash={dataHash}
          typeIdArgs={typeIdArgs}
          typeIdCodeHash={typeIdCodeHash}
          enableTypeId={enableTypeId}
        />
      </div>
    </div>
  );
}
