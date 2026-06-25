import { ckbToShannons } from "@/lib";
import { buildTransferTx } from "@/lib/ckb/transfer";
import { TransferStatus } from "@/lib/ckb/transfer-status";
import { useSigner } from "@ckb-ccc/connector-react";
import { useRef, useState } from "react";

export type { TransferStatus } from "@/lib/ckb/transfer-status";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function useTransfer() {
  const signer = useSigner();
  const [status, setStatus] = useState<TransferStatus>(TransferStatus.Idle);
  const [error, setError] = useState<string | null>(null);
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
    setStatus(TransferStatus.Idle);
    setError(null);
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
    setTxHash(null);
    setBlockNumber(null);

    try {
      setStatus(TransferStatus.Building);
      const tx = await buildTx({ to, amountCkb, feeRate });
      if (myId !== transferId.current) return;

      if (buildOnly) {
        setStatus(TransferStatus.Idle);
        return tx;
      }

      setStatus(TransferStatus.Signing);
      await signer.signTransaction(tx);
      if (myId !== transferId.current) return;

      setStatus(TransferStatus.Sending);
      const hash = await signer.client.sendTransaction(tx);
      if (myId !== transferId.current) return;

      setStatus(TransferStatus.Sent);
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
              case TransferStatus.Sent:
                setStatus(TransferStatus.Sent);
                break;
              case TransferStatus.Pending:
                setStatus(TransferStatus.Pending);
                break;
              case TransferStatus.Proposed:
                setStatus(TransferStatus.Proposed);
                break;
              case TransferStatus.Committed:
                if (signal.cancelled) return;
                setStatus(TransferStatus.Committed);
                setBlockNumber(res.blockNumber ?? null);
                return;
              case TransferStatus.Rejected:
                if (signal.cancelled) return;
                setStatus(TransferStatus.Rejected);
                setError(res.reason ?? "Rejected by node");
                return;
            }
          } catch (err: any) {
            rpcErrors++;
            if (rpcErrors >= 3) {
              setStatus(TransferStatus.Error);
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
      setStatus(TransferStatus.Error);
      setError(err.message || "Unknown error");
      throw err;
    }
  };

  return { transfer, buildTx, fee, status, error, txHash, blockNumber, reset };
}
