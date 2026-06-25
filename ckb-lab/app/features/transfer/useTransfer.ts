import { ckbToShannons } from "@/lib";
import { buildTransferTx } from "@/lib/ckb/transfer";
import { useSigner } from "@ckb-ccc/connector-react";
import { useRef, useState } from "react";

export type TransferStatus =
  | "idle"
  | "building"
  | "signing"
  | "sending"
  | "sent"
  | "pending"
  | "proposed"
  | "committed"
  | "rejected"
  | "error";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function useTransfer() {
  const signer = useSigner();
  const [status, setStatus] = useState<TransferStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [fee, setFee] = useState<bigint | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [blockNumber, setBlockNumber] = useState<bigint | null>(null);
  const pollSignal = useRef<{ cancelled: boolean } | null>(null);

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
    if (pollSignal.current) pollSignal.current.cancelled = true;
    pollSignal.current = null;
    setStatus("idle");
    setError(null);
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

    if (pollSignal.current) pollSignal.current.cancelled = true;
    pollSignal.current = null;
    setError(null);

    try {
      setStatus("building");
      const tx = await buildTx({ to, amountCkb, feeRate });
      if (buildOnly) {
        setStatus("idle");
        return tx;
      }

      setStatus("signing");
      await signer.signTransaction(tx);

      setStatus("sending");
      const hash = await signer.client.sendTransaction(tx);

      setStatus("sent");
      setTxHash(hash);

      const signal = { cancelled: false };
      pollSignal.current = signal;

      const poll = async () => {
        while (!signal.cancelled) {
          await sleep(2000);
          if (signal.cancelled) return;
          try {
            const res = await signer.client.getTransaction(hash);
            if (!res) continue;
            switch (res.status) {
              case "sent":
                setStatus("sent");
                break;
              case "pending":
                setStatus("pending");
                break;
              case "proposed":
                setStatus("proposed");
                break;
              case "committed":
                setStatus("committed");
                setBlockNumber(res.blockNumber ?? null);
                return;
              case "rejected":
                setStatus("rejected");
                setError(res.reason ?? "Rejected by node");
                return;
            }
          } catch (err: any) {
            setStatus("error");
            setError(err?.message ?? "Failed to fetch transaction status");
            return;
          }
        }
      };

      poll();
      return hash;
    } catch (err: any) {
      console.error("Transfer error:", err);
      setStatus("error");
      setError(err.message || "Unknown error");
      throw err;
    }
  };

  return { transfer, buildTx, fee, status, error, txHash, blockNumber, reset };
}
