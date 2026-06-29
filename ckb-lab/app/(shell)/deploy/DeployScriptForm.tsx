"use client";

import { TxStatusBanner } from "@/components/ui/TxStatusBanner";
import { useRawTx } from "@/features/common/useRawTx";
import { useDeploy } from "@/features/deploy/useDeploy";
import { useWalletAccount } from "@/features/wallet/useWalletAccount";
import { useDebouncedCallback } from "@/lib/useDebouncedCallback";
import type { UploadFile } from "antd";
import { useForm } from "antd/es/form/Form";
import { useState } from "react";
import { DeployInputCard } from "./DeployInputCard";
import { DeployPreviewCard } from "./DeployPreviewCard";

const DEBOUNCE_MS = 400;

export function DeployScriptForm() {
  const [activeTab, setActiveTab] = useState("summary");
  const [buildError, setBuildError] = useState<string | null>(null);

  const { buildTx, deploy, fee, binarySize, status, isInProgress, error, txHash, blockNumber, reset } =
    useDeploy();
  const { balance } = useWalletAccount();
  const [form] = useForm();

  const { rawTx, txJson, txBytes } = useRawTx();

  // Build a preview tx whenever the user changes the file or fee rate selection.
  // Debounced to avoid firing on every keystroke / rapid selection change.
  const debouncedBuild = useDebouncedCallback(
    async (file: UploadFile, feeRate: number) => {
      try {
        await rawTx(() => buildTx({ file, feeRate }));
        setBuildError(null);
      } catch (err: unknown) {
        setBuildError(
          err instanceof Error ? err.message : "Failed to build transaction"
        );
      }
    },
    DEBOUNCE_MS
  );

  const handleValuesChange = (_: unknown, values: Record<string, unknown>) => {
    // Don't rebuild during an in-flight deploy — state updates would be ignored anyway.
    if (isInProgress) return;
    const files = values.file as UploadFile[] | undefined;
    const feeRate = (values.feeRate as number | undefined) ?? 1000;
    const currentFile = files?.[0];
    if (!currentFile) {
      setBuildError(null);
      return;
    }
    debouncedBuild(currentFile, feeRate);
  };

  const handleFinish = (values: Record<string, unknown>) => {
    const files = values.file as UploadFile[] | undefined;
    const feeRate = values.feeRate as number | undefined;
    const currentFile = files?.[0];
    if (!currentFile) return;
    deploy({ file: currentFile, feeRate })
      .then((hash) => console.log("Script deployed:", hash))
      .catch((err) => console.error("Deploy failed:", err));
  };

  const handleReset = () => {
    setBuildError(null);
    reset();
  };

  return (
    <div>
      <TxStatusBanner
        status={status}
        txHash={txHash}
        blockNumber={blockNumber}
        error={error}
        onRetry={handleReset}
      />
      <div className="grid grid-cols-[1fr_1.07fr] gap-5 items-start">
        <DeployInputCard
          form={form}
          isInProgress={isInProgress}
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
        />
      </div>
    </div>
  );
}
