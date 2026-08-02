"use client";

import { TxStatusBanner } from "@/components/ui/TxStatusBanner";
import { COUNTER_MODE_META, CounterMode } from "@/features/counter/counter-mode";
import type { CounterCell } from "@/lib/ckb/counter-cells";
import { useNetworkStore } from "@/stores/network";
import { useCcc } from "@ckb-ccc/connector-react";
import { Modal } from "antd";
import { CounterModalForm } from "./CounterModalForm";
import { CounterPreviewCard } from "./CounterPreviewCard";
import { useCounterActionModal } from "./useCounterActionModal";

interface CounterActionModalProps {
  mode: CounterMode;
  /** The target cell for Increment/Destroy; null for Create. */
  entry: CounterCell | null;
  onClose: () => void;
}

// Shares COUNTER_MODE_META with CounterModalForm's card heading so the modal's title bar and the
// form inside it never word the same mode differently.
function modalTitle(mode: CounterMode, entry: CounterCell | null): string {
  const { title } = COUNTER_MODE_META[mode];
  return entry ? `${title} · ${entry.label || "Counter"}` : title;
}

export function CounterActionModal({ mode, entry, onClose }: CounterActionModalProps) {
  const lockLabelMap = useNetworkStore((s) => s.lockLabelMap);
  const { client: cccClient } = useCcc();
  const {
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
    decoded,
    txHash,
    blockNumber,
    isSpentError,
    handleValuesChange,
    handleFinish,
    handleForgetEntry,
    handleReset,
  } = useCounterActionModal(mode, entry, onClose);

  return (
    <Modal
      open
      onCancel={onClose}
      // An accidental outside-click/Esc must not silently abandon an in-flight wallet
      // interaction — Signing/Sending can't be undone once the wallet prompt is open.
      maskClosable={!isInProgress}
      closable={!isInProgress}
      keyboard={!isInProgress}
      footer={null}
      width={960}
      title={modalTitle(mode, entry)}
      styles={{ body: { maxHeight: "80vh", overflowY: "auto" } }}
    >
      <TxStatusBanner
        status={status}
        txHash={txHash}
        blockNumber={blockNumber}
        error={error}
        decoded={decoded}
        onRetry={handleReset}
        retryLabel="Done"
      />
      <div className="grid grid-cols-2 gap-5" style={{ height: 560 }}>
        <CounterModalForm
          form={form}
          mode={mode}
          entry={entry}
          deployedScripts={deployedScripts}
          isInProgress={isInProgress}
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
    </Modal>
  );
}
