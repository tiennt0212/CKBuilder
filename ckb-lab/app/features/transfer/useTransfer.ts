import { ckbToShannons } from "@/lib";
import { buildTransferTx } from "@/lib/ckb/transfer";
import { decodeTxError, type DecodedTxError } from "@/lib/ckb/tx-error";
import { TxStatus } from "@/lib/ckb/tx-status";
import { useSigner } from "@ckb-ccc/connector-react";
import { useRef, useState } from "react";

export type { TxStatus } from "@/lib/ckb/tx-status";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function useTransfer() {
  const signer = useSigner();
  const [status, setStatus] = useState<TxStatus>(TxStatus.Idle);
  const [error, setError] = useState<string | null>(null);
  const [decoded, setDecoded] = useState<DecodedTxError | null>(null);
  const [fee, setFee] = useState<bigint | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [blockNumber, setBlockNumber] = useState<bigint | null>(null);
  const pollSignal = useRef<{ cancelled: boolean } | null>(null);
  const transferId = useRef(0);

  const buildTx = async ({
    to,
    amountCkb,
    feeRate,
  }: {
    to: string;
    amountCkb: string;
    feeRate?: number;
  }) => {
    if (!signer) throw new Error("Wallet not connected");
    const tx = await buildTransferTx(signer, to, ckbToShannons(amountCkb), feeRate);
    const txFee = await tx.getFee(signer.client);
    setFee(txFee);
    return tx;
  };

  const reset = () => {
    transferId.current += 1;
    if (pollSignal.current) pollSignal.current.cancelled = true;
    pollSignal.current = null;
    setStatus(TxStatus.Idle);
    setError(null);
    setDecoded(null);
    setFee(null);
    setTxHash(null);
    setBlockNumber(null);
  };

  const transfer = async ({
    buildOnly,
    to,
    amountCkb,
    feeRate,
  }: {
    buildOnly?: boolean;
    to: string;
    amountCkb: string;
    feeRate?: number;
  }) => {
    if (!signer) throw new Error("Wallet not connected");

    const myId = ++transferId.current;
    if (pollSignal.current) pollSignal.current.cancelled = true;
    pollSignal.current = null;
    setError(null);
    setDecoded(null);
    setTxHash(null);
    setBlockNumber(null);

    try {
      setStatus(TxStatus.Building);
      const tx = await buildTx({ to, amountCkb, feeRate });
      if (myId !== transferId.current) return;

      if (buildOnly) {
        setStatus(TxStatus.Idle);
        return tx;
      }

      setStatus(TxStatus.Signing);
      await signer.signTransaction(tx);
      if (myId !== transferId.current) return;

      setStatus(TxStatus.Sending);
      const hash = await signer.client.sendTransaction(tx);
      if (myId !== transferId.current) return;

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
                // Keep the node's reason verbatim and decode it alongside.
                const reason = res.reason ?? "Rejected by node";
                setError(reason);
                setDecoded(decodeTxError(reason));
                return;
              }
            }
          } catch (err: any) {
            rpcErrors++;
            if (rpcErrors >= 3) {
              setStatus(TxStatus.Error);
              setError(err?.message ?? "Failed to fetch transaction status");
              return;
            }
          }
          await sleep(2000);
        }
      };

      poll();
      return hash;
    } catch (err: any) {
      console.error("Transfer error:", err);
      setStatus(TxStatus.Error);
      setError(err.message || "Unknown error");
      // Decode the thrown value, not `message` — CCC's typed client errors carry the script
      // source, index and code hash as fields, and those are lost the moment it is stringified.
      setDecoded(decodeTxError(err));
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
    transfer,
    buildTx,
    fee,
    status,
    isInProgress,
    error,
    decoded,
    txHash,
    blockNumber,
    reset,
  };
}
