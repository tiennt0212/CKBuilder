import { ckbToShannons } from "@/lib";
import { buildTransferTx } from "@/lib/ckb/transfer";
import { useSigner } from "@ckb-ccc/connector-react";
import { useState } from "react";

export type TransferStatus = "idle" | "building" | "signing" | "sending" | "done" | "error";

export function useTransfer() {
  const signer = useSigner();
  const [status, setStatus] = useState<TransferStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [fee, setFee] = useState<bigint | null>(null);

  const buildTx = async ({
    to,
    amountCkb,
    feeRate,
  }: {
    to: string;
    amountCkb: string;
    feeRate?: number;
  }) => {
    try {
      if (!signer) throw new Error("Wallet not connected");
      const tx = await buildTransferTx(signer, to, ckbToShannons(amountCkb), feeRate);
      const fee = await tx.getFee(signer.client);
      setFee(fee);
      return tx;
    } catch (err: any) {
      throw err;
    }
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
    setError(null);
    try {
      setStatus("building");
      const tx = await buildTx({ to, amountCkb, feeRate });
      if (buildOnly) {
        setStatus("idle");
        return tx;
      } else {
        setStatus("signing");
        await signer.signTransaction(tx); // wallet popup
        setStatus("sending");
        const txHash = await signer.client.sendTransaction(tx);
        setStatus("done");
        return txHash;
      }
    } catch (err: any) {
      console.error("Transfer error:", err);
      setStatus("error");
      setError(err.message || "Unknown error");
      throw err;
    }
  };

  return { transfer, buildTx, fee, status, error };
}
