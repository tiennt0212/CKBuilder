"use client";

import { TxStatusBanner } from "@/components/ui/TxStatusBanner";
import { useRawTx } from "@/features/common/useRawTx";
import { useTransfer } from "@/features/transfer/useTransfer";
import { useWalletAccount } from "@/features/wallet/useWalletAccount";
import { Network } from "@/lib";
import { useDebouncedCallback } from "@/lib/useDebouncedCallback";
import { useNetworkStore } from "@/stores/network";
import { useCcc } from "@ckb-ccc/connector-react";
import { Form } from "antd";
import { useForm } from "antd/es/form/Form";
import { useEffect, useState } from "react";
import { TransferInputCard } from "./TransferInputCard";
import { TransferPreviewCard } from "./TransferPreviewCard";

const DEBOUNCE_MS = 400;

export function TransferForm() {
  const [activeTab, setActiveTab] = useState("summary");
  const [buildError, setBuildError] = useState<string | null>(null);

  const { buildTx, fee, transfer, status, isInProgress, error, txHash, blockNumber, reset } =
    useTransfer();
  const { network, lockLabelMap } = useNetworkStore();
  const { client: cccClient } = useCcc();
  const addressPlaceholder = network === Network.Testnet ? "ckt…" : "ckb…";
  const { address, balance } = useWalletAccount();
  const [form] = useForm();
  const amountCkb = Form.useWatch("amount", form);
  const from = Form.useWatch("from", form);
  const to = Form.useWatch("to", form);

  const { rawTx, txJson, txBytes } = useRawTx();

  useEffect(() => {
    if (address) {
      form.setFieldValue("from", address);
    }
  }, [address]);

  const debouncedBuild = useDebouncedCallback(
    async (to: string, amount: number, feeRate: number) => {
      try {
        await form.validateFields();
      } catch (err: any) {
        if (err?.errorFields?.length > 0) {
          setBuildError(null);
          return;
        }
      }
      try {
        await rawTx(() => buildTx({ to, amountCkb: amount.toString(), feeRate }));
        setBuildError(null);
      } catch (err: any) {
        setBuildError(err?.message ?? "Failed to build transaction");
      }
    },
    DEBOUNCE_MS
  );

  const handleValuesChange = (_: unknown, values: Record<string, unknown>) => {
    if (isInProgress) return;
    const { to, amount, feeRate } = values as { to: string; amount: number; feeRate: number };
    if (!to || !amount) {
      setBuildError(null);
      return;
    }
    debouncedBuild(to, amount, feeRate);
  };

  const handleFinish = (values: Record<string, unknown>) => {
    const { to, amount, feeRate } = values as { to: string; amount: number; feeRate: number };
    transfer({ to, amountCkb: amount.toString(), feeRate })
      .then((txhash) => console.log("Transaction sent:", txhash))
      .catch((err) => console.error(err));
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
        retryLabel="New Transfer"
      />
      <div className="grid grid-cols-[1fr_1.07fr] gap-5 items-start">
        <TransferInputCard
          form={form}
          addressPlaceholder={addressPlaceholder}
          address={address}
          balance={balance}
          isInProgress={isInProgress}
          to={to}
          onValuesChange={handleValuesChange}
          onFinish={handleFinish}
        />
        <TransferPreviewCard
          activeTab={activeTab}
          onTabChange={setActiveTab}
          txJson={txJson}
          txBytes={txBytes}
          amountCkb={amountCkb}
          fee={fee}
          balance={balance}
          from={from}
          cccClient={cccClient}
          lockLabelMap={lockLabelMap}
          buildError={buildError}
        />
      </div>
    </div>
  );
}
