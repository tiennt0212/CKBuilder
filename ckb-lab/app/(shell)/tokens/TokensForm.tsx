"use client";

import { TxStatusBanner } from "@/components/ui/TxStatusBanner";
import { useRawTx } from "@/features/common/useRawTx";
import { TxStatus } from "@/lib/ckb/tx-status";
import { TokenAction } from "@/features/tokens/token-action";
import { describeError, useTokens, type TokenRunParams } from "@/features/tokens/useTokens";
import { useUdtBalances } from "@/features/tokens/useUdtBalances";
import { Network } from "@/lib";
import { useDebouncedCallback } from "@/lib/useDebouncedCallback";
import { useNetworkStore } from "@/stores/network";
import { useWalletStore } from "@/stores/wallet";
import { useCcc } from "@ckb-ccc/connector-react";
import { Form } from "antd";
import { useForm } from "antd/es/form/Form";
import { useEffect, useMemo, useState } from "react";
import { TokensInputCard } from "./TokensInputCard";
import { TokensPreviewCard } from "./TokensPreviewCard";

const DEBOUNCE_MS = 400;

export function TokensForm() {
  const [activeTab, setActiveTab] = useState("summary");
  const [buildError, setBuildError] = useState<string | null>(null);
  const [action, setAction] = useState<TokenAction>(TokenAction.Issue);
  const [selectedArgs, setSelectedArgs] = useState<string | null>(null);

  const {
    buildTx,
    run,
    fee,
    recipientCellCapacity,
    changeCellCapacity,
    changeAmount,
    status,
    isInProgress,
    error,
    txHash,
    blockNumber,
    reset,
  } = useTokens();
  const { balances, loading: balancesLoading, refresh } = useUdtBalances();
  const { network, lockLabelMap } = useNetworkStore();
  const { client: cccClient } = useCcc();
  // Only mainnet uses the `ckb` prefix. Devnet is a test chain and shares testnet's `ckt`, so
  // testing against Testnet alone shows devnet users the wrong prefix.
  const addressPlaceholder = network === Network.Mainnet ? "ckb…" : "ckt…";
  const { address, balance } = useWalletStore();
  const [form] = useForm();
  const amount = Form.useWatch("amount", form);

  const { rawTx, txJson, txBytes } = useRawTx();

  const selected = useMemo(
    () => balances.find((b) => b.args === selectedArgs) ?? null,
    [balances, selectedArgs]
  );

  // Keep a token selected as the list loads or the network changes, so Transfer mode is usable
  // without an extra click and never points at a token that is no longer in the list.
  useEffect(() => {
    if (balances.length === 0) {
      setSelectedArgs(null);
      return;
    }
    if (!balances.some((b) => b.args === selectedArgs)) {
      setSelectedArgs(balances[0].args);
    }
  }, [balances, selectedArgs]);

  // Re-read the holdings once the chain confirms. Deliberately an effect here rather than a
  // callback passed into useTokens: a caller-supplied closure inside the poll loop is exactly what
  // forced useCounter to keep a lastBuild ref to dodge staleness. txHash is a dependency so a
  // second commit re-fires.
  useEffect(() => {
    if (status === TxStatus.Committed) refresh();
  }, [status, txHash, refresh]);

  // Nothing is transferable until a token is picked, and there is no token to pick before the
  // wallet holds one — so an empty list forces Issue mode rather than showing a dead form.
  const canTransfer = balances.length > 0;
  useEffect(() => {
    if (!canTransfer && action === TokenAction.Transfer) setAction(TokenAction.Issue);
  }, [canTransfer, action]);

  const toParams = (values: Record<string, unknown>): TokenRunParams | null => {
    const { to, amount, feeRate } = values as {
      to?: string;
      amount?: string;
      feeRate?: number;
    };
    if (!amount) return null;

    // InputNumber runs in stringMode, so the raw u128 reaches us intact as a decimal string. Going
    // through Number() here would silently round anything past 2^53.
    const rawAmount = BigInt(amount);

    if (action === TokenAction.Issue) {
      return { kind: "issue", amount: rawAmount, to: to || undefined, feeRate };
    }
    if (!to || !selected) return null;
    return { kind: "transfer", udtArgs: selected.args, to, amount: rawAmount, feeRate };
  };

  const debouncedBuild = useDebouncedCallback(async (params: TokenRunParams) => {
    try {
      await rawTx(() => buildTx(params));
      setBuildError(null);
    } catch (err: unknown) {
      setBuildError(describeError(err));
    }
  }, DEBOUNCE_MS);

  const handleValuesChange = (_: unknown, values: Record<string, unknown>) => {
    if (isInProgress) return;
    const params = toParams(values);
    if (!params) {
      setBuildError(null);
      return;
    }
    debouncedBuild(params);
  };

  const handleFinish = (values: Record<string, unknown>) => {
    const params = toParams(values);
    if (!params) return;
    run(params).catch((err) => console.error(err));
  };

  const handleReset = () => {
    setBuildError(null);
    reset();
  };

  const handleActionChange = (next: TokenAction) => {
    setAction(next);
    // The two modes mean different things by "to" and "amount", and a preview built for the other
    // mode would keep showing until the next keystroke.
    form.resetFields(["to", "amount"]);
    setBuildError(null);
  };

  const handleSelectToken = (args: string) => {
    setSelectedArgs(args);
    setBuildError(null);
  };

  return (
    <div>
      <TxStatusBanner
        status={status}
        txHash={txHash}
        blockNumber={blockNumber}
        error={error}
        onRetry={handleReset}
        retryLabel="New Token Transaction"
      />
      <div className="grid grid-cols-[1fr_1.07fr] gap-5 items-start">
        <TokensInputCard
          form={form}
          action={action}
          onActionChange={handleActionChange}
          balances={balances}
          balancesLoading={balancesLoading}
          selectedArgs={selectedArgs}
          onSelectToken={handleSelectToken}
          addressPlaceholder={addressPlaceholder}
          network={network}
          udtCellCapacity={recipientCellCapacity}
          isInProgress={isInProgress}
          onValuesChange={handleValuesChange}
          onFinish={handleFinish}
        />
        <TokensPreviewCard
          activeTab={activeTab}
          onTabChange={setActiveTab}
          txJson={txJson}
          txBytes={txBytes}
          action={action}
          amount={amount}
          fee={fee}
          recipientCellCapacity={recipientCellCapacity}
          changeCellCapacity={changeCellCapacity}
          changeAmount={changeAmount}
          ckbBalance={balance}
          ownerAddress={address}
          cccClient={cccClient}
          lockLabelMap={lockLabelMap}
          buildError={buildError}
        />
      </div>
    </div>
  );
}
