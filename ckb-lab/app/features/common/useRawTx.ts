import { txToBytes, txToRawJson } from "@/lib/ckb/utils";
import { Bytes, ccc } from "@ckb-ccc/core";
import { useState } from "react";

export type TransferStatus = "idle" | "building" | "signing" | "sending" | "done" | "error";

export function useRawTx() {
  const [isBuilding, setIsBuilding] = useState(false);
  const [txJson, setTxJson] = useState<ccc.Transaction | null>(null);
  const [txBytes, setTxBytes] = useState<Bytes | null>(null);

  const rawTx = async (buildFn: () => Promise<ccc.Transaction | null>) => {
    setIsBuilding(true);
    try {
      const tx = await buildFn();
      const txJson = txToRawJson(tx);
      const txBytes = txToBytes(tx);
      setTxJson(txJson);
      setTxBytes(txBytes);
      return txJson;
    } catch (error) {
      console.error("Error building raw transaction:", error);
      throw error;
    } finally {
      setIsBuilding(false);
    }
  };

  return { rawTx, txJson, txBytes, isBuilding };
}
