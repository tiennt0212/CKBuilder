import { buildTransferTx } from "@/lib/ckb/transfer";
import { useSigner } from "@ckb-ccc/connector-react";
import { useState } from "react";

export type TransferStatus = "idle" | "building" | "signing" | "sending" | "done" | "error";

export function useTransfer() {
    const signer = useSigner();
    const [status, setStatus] = useState<TransferStatus>("idle");
    const [error, setError] = useState<string | null>(null);

    const transfer = async (to: string, amountCkb: bigint) => {
        if (!signer) throw new Error("Wallet not connected");
        setError(null);
        try {

            setStatus("building");
            const tx = await buildTransferTx(to, amountCkb, signer);
            setStatus("signing");
            await signer.signTransaction(tx);          // wallet popup
            setStatus("sending");
            const txHash = await signer.client.sendTransaction(tx);
            setStatus("done");
            return txHash;
        }
        catch (err: any) {
            console.error("Transfer error:", err);
            setStatus("error");
            setError(err.message || "Unknown error");
            throw err;
        }
    };

    return { transfer, status, error };
}