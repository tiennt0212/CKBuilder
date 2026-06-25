"use client";

import { TxStatusBanner } from "@/components/ui/TxStatusBanner";
import { useRawTx } from "@/features/common/useRawTx";
import { useTransfer } from "@/features/transfer/useTransfer";
import { useWalletAccount } from "@/features/wallet/useWalletAccount";
import { Network } from "@/lib";
import { useNetworkStore } from "@/stores/network";
import { Form } from "antd";
import { useForm } from "antd/es/form/Form";
import { useEffect, useState } from "react";
import { TransferInputCard } from "./TransferInputCard";
import { TransferPreviewCard } from "./TransferPreviewCard";

export function TransferForm() {
  const [activeTab, setActiveTab] = useState("summary");
  const { buildTx, fee, transfer, status, isInProgress, error, txHash, blockNumber, reset } =
    useTransfer();
  const { network, lockLabelMap, cccClient } = useNetworkStore();
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

  const handleValuesChange = async (_: unknown, values: Record<string, unknown>) => {
    if (isInProgress) return;
    const { to, amount, feeRate } = values as { to: string; amount: number; feeRate: number };
    if (!to || !amount) return;
    try {
      await form.validateFields();
    } catch (error: any) {
      if (error?.errorFields?.length > 0) return;
    }
    try {
      await rawTx(() => buildTx({ to, amountCkb: amount.toString(), feeRate }));
    } catch {
      // build errors are display-only; suppress unhandled rejection
    }
  };

  const handleFinish = (values: Record<string, unknown>) => {
    const { to, amount, feeRate } = values as { to: string; amount: number; feeRate: number };
    transfer({ to, amountCkb: amount.toString(), feeRate })
      .then((txhash) => console.log("Transaction sent:", txhash))
      .catch((err) => console.error(err));
  };

  return (
    <div>
      <TxStatusBanner
        status={status}
        txHash={txHash}
        blockNumber={blockNumber}
        error={error}
        onRetry={reset}
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
        />
      </div>
    </div>
  );
}
