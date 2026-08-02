import { decodeTxError, type DecodedTxError } from "@/lib/ckb/tx-error";
import { TxStatus } from "@/lib/ckb/tx-status";
import { buildIssueUdtTx, buildTransferUdtTx } from "@/lib/ckb/udt";
import { ccc } from "@ckb-ccc/core";
import { useSigner } from "@ckb-ccc/connector-react";
import { useRef, useState } from "react";

// Re-export so consumers don't need a second import line for the status type.
export type { TxStatus } from "@/lib/ckb/tx-status";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export type TokenRunParams =
  | { kind: "issue"; amount: bigint; to?: string; feeRate?: number }
  | { kind: "transfer"; udtArgs: ccc.Hex; to: string; amount: bigint; feeRate?: number };

/** String-only adapter for the build-error path, which has no TxStatusBanner to hand `decoded` to. */
export function describeError(err: unknown): string {
  return decodeTxError(err).cause;
}

/**
 * One hook covering issue and transfer rather than two near-identical copies of the
 * build->sign->send->poll skeleton: both share it completely and differ only in which pure builder
 * (app/lib/ckb/udt.ts) runs. Mirrors useCounter.ts/useDeploy.ts's status machine, staleness-guard
 * ref, and poll loop exactly.
 *
 * Unlike /counter and /deploy there is no store write on commit and no lastBuild ref — that
 * absence is deliberate, not an oversight. A token's identity is derivable from chain at any time,
 * so a localStorage registry would be a second source of truth for something the indexer already
 * answers, and it would need the bigint-as-decimal-string dance for u128 amounts. The balance list
 * re-reads from chain instead (see useUdtBalances).
 */
export function useTokens() {
  const signer = useSigner();
  const [status, setStatus] = useState<TxStatus>(TxStatus.Idle);
  const [error, setError] = useState<string | null>(null);
  const [decoded, setDecoded] = useState<DecodedTxError | null>(null);
  const [fee, setFee] = useState<bigint | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [blockNumber, setBlockNumber] = useState<bigint | null>(null);
  // Per-build figures feeding the preview card's summary rows. Capacity is read back off the built
  // transaction rather than assumed, because the minimum depends on the recipient's lock size.
  const [recipientCellCapacity, setRecipientCellCapacity] = useState<bigint | null>(null);
  const [changeCellCapacity, setChangeCellCapacity] = useState<bigint | null>(null);
  const [changeAmount, setChangeAmount] = useState<bigint | null>(null);
  const pollSignal = useRef<{ cancelled: boolean } | null>(null);
  // Incrementing counter prevents stale async callbacks from updating state after reset.
  const tokenId = useRef(0);

  const buildTx = async (params: TokenRunParams): Promise<ccc.Transaction> => {
    if (!signer) throw new Error("Wallet not connected");

    if (params.kind === "issue") {
      const { tx, udtCellCapacity } = await buildIssueUdtTx({
        signer,
        amount: params.amount,
        to: params.to,
        feeRate: params.feeRate,
      });
      setRecipientCellCapacity(udtCellCapacity);
      setChangeCellCapacity(null);
      setChangeAmount(null);
      setFee(await tx.getFee(signer.client));
      return tx;
    }

    // transfer
    const {
      tx,
      changeAmount: change,
      recipientCellCapacity: recipientCap,
      changeCellCapacity: changeCap,
    } = await buildTransferUdtTx({
      signer,
      udtArgs: params.udtArgs,
      to: params.to,
      amount: params.amount,
      feeRate: params.feeRate,
    });
    setRecipientCellCapacity(recipientCap);
    setChangeCellCapacity(changeCap);
    setChangeAmount(change);
    setFee(await tx.getFee(signer.client));
    return tx;
  };

  const reset = () => {
    tokenId.current += 1;
    if (pollSignal.current) pollSignal.current.cancelled = true;
    pollSignal.current = null;
    setStatus(TxStatus.Idle);
    setError(null);
    setDecoded(null);
    setFee(null);
    setTxHash(null);
    setBlockNumber(null);
    setRecipientCellCapacity(null);
    setChangeCellCapacity(null);
    setChangeAmount(null);
  };

  const run = async (params: TokenRunParams) => {
    if (!signer) throw new Error("Wallet not connected");

    const myId = ++tokenId.current;
    if (pollSignal.current) pollSignal.current.cancelled = true;
    pollSignal.current = null;
    setError(null);
    setDecoded(null);
    setTxHash(null);
    setBlockNumber(null);

    try {
      setStatus(TxStatus.Building);
      const tx = await buildTx(params);
      if (myId !== tokenId.current) return;

      setStatus(TxStatus.Signing);
      await signer.signTransaction(tx);
      if (myId !== tokenId.current) return;

      setStatus(TxStatus.Sending);
      const hash = await signer.client.sendTransaction(tx);
      if (myId !== tokenId.current) return;

      setStatus(TxStatus.Sent);
      setTxHash(hash);

      const signal = { cancelled: false };
      pollSignal.current = signal;

      const poll = async () => {
        let rpcErrors = 0;
        while (!signal.cancelled) {
          try {
            const res = await signer.client.getTransaction(hash);
            rpcErrors = 0;
            if (!res) {
              await sleep(2000);
              continue;
            }
            switch (res.status) {
              case TxStatus.Sent:
                setStatus(TxStatus.Sent);
                break;
              case TxStatus.Pending:
                setStatus(TxStatus.Pending);
                break;
              case TxStatus.Proposed:
                setStatus(TxStatus.Proposed);
                break;
              case TxStatus.Committed:
                if (signal.cancelled) return;
                setStatus(TxStatus.Committed);
                setBlockNumber(res.blockNumber ?? null);
                return;
              case TxStatus.Rejected: {
                if (signal.cancelled) return;
                setStatus(TxStatus.Rejected);
                // A rejection here usually means the xUDT script itself returned non-zero — most
                // often owner mode not engaging, or inputs and outputs not balancing. Keep the
                // node's reason verbatim and decode it alongside.
                const reason = res.reason ?? "Rejected by node";
                setError(reason);
                setDecoded(decodeTxError(reason));
                return;
              }
            }
          } catch (err: unknown) {
            rpcErrors++;
            if (rpcErrors >= 3) {
              setStatus(TxStatus.Error);
              setError(err instanceof Error ? err.message : "Failed to fetch transaction status");
              return;
            }
          }
          await sleep(2000);
        }
      };

      poll();
      return hash;
    } catch (err: unknown) {
      console.error("Token tx error:", err);
      setStatus(TxStatus.Error);
      // Decode the thrown value, not `err.message` — CCC's typed client errors carry structured
      // fields that are lost the moment it is stringified. `error` gets `raw` rather than `cause`
      // so it stays the raw-message channel it is in the other four hooks.
      const decodedErr = decodeTxError(err);
      setError(decodedErr.raw);
      setDecoded(decodedErr);
      throw err;
    }
  };

  const isInProgress = [
    TxStatus.Building,
    TxStatus.Signing,
    TxStatus.Sending,
    TxStatus.Sent,
    TxStatus.Pending,
    TxStatus.Proposed,
    TxStatus.Committed,
  ].some((s) => s === status);

  return {
    run,
    buildTx,
    fee,
    recipientCellCapacity,
    changeCellCapacity,
    changeAmount,
    status,
    isInProgress,
    error,
    decoded,
    txHash,
    blockNumber,
    reset,
  };
}
