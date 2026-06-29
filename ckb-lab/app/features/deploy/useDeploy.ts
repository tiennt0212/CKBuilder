import { buildDeployTx } from "@/lib/ckb/deploy";
import { TransferStatus } from "@/lib/ckb/transfer-status";
import { ccc } from "@ckb-ccc/core";
import { useSigner } from "@ckb-ccc/connector-react";
import type { UploadFile } from "antd";
import { useRef, useState } from "react";

// Re-export so consumers don't need a second import line for the status type.
export type { TransferStatus } from "@/lib/ckb/transfer-status";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

interface BuildTxParams {
  file: UploadFile;
  feeRate?: number;
  hashType?: ccc.HashType;
  enableTypeId?: boolean;
}

export function useDeploy() {
  const signer = useSigner();
  const [status, setStatus] = useState<TransferStatus>(TransferStatus.Idle);
  const [error, setError] = useState<string | null>(null);
  const [fee, setFee] = useState<bigint | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [blockNumber, setBlockNumber] = useState<bigint | null>(null);
  const [binarySize, setBinarySize] = useState<number | null>(null);
  const [dataHash, setDataHash] = useState<string | null>(null);
  const [typeIdArgs, setTypeIdArgs] = useState<string | null>(null);
  const pollSignal = useRef<{ cancelled: boolean } | null>(null);
  // Incrementing counter prevents stale async callbacks from updating state after reset.
  const deployId = useRef(0);

  const buildTx = async ({
    file,
    feeRate,
    hashType,
    enableTypeId,
  }: BuildTxParams): Promise<ccc.Transaction> => {
    if (!signer) throw new Error("Wallet not connected");

    // Antd's UploadFile wraps the native File in .originFileObj.
    // We call .arrayBuffer() on .originFileObj (not on the UploadFile itself) because
    // UploadFile does not implement the File interface in some Antd versions.
    const buffer = await file.originFileObj!.arrayBuffer();
    const binary = new Uint8Array(buffer);

    setBinarySize(binary.byteLength);

    const {
      tx,
      dataHash: dh,
      typeIdArgs: tia,
    } = await buildDeployTx({ signer, binary, feeRate, hashType, enableTypeId });
    setDataHash(dh);
    setTypeIdArgs(tia ?? null);
    const txFee = await tx.getFee(signer.client);
    setFee(txFee);
    return tx;
  };

  const reset = () => {
    deployId.current += 1;
    if (pollSignal.current) pollSignal.current.cancelled = true;
    pollSignal.current = null;
    setStatus(TransferStatus.Idle);
    setError(null);
    setFee(null);
    setTxHash(null);
    setBlockNumber(null);
    setBinarySize(null);
    setDataHash(null);
    setTypeIdArgs(null);
  };

  const deploy = async ({ file, feeRate, hashType, enableTypeId }: BuildTxParams) => {
    if (!signer) throw new Error("Wallet not connected");

    const myId = ++deployId.current;
    if (pollSignal.current) pollSignal.current.cancelled = true;
    pollSignal.current = null;
    setError(null);
    setTxHash(null);
    setBlockNumber(null);

    try {
      setStatus(TransferStatus.Building);
      const tx = await buildTx({ file, feeRate, hashType, enableTypeId });
      if (myId !== deployId.current) return;

      setStatus(TransferStatus.Signing);
      await signer.signTransaction(tx);
      if (myId !== deployId.current) return;

      setStatus(TransferStatus.Sending);
      const hash = await signer.client.sendTransaction(tx);
      if (myId !== deployId.current) return;

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
          } catch (err: unknown) {
            rpcErrors++;
            if (rpcErrors >= 3) {
              setStatus(TransferStatus.Error);
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
      console.error("Deploy error:", err);
      const message = err instanceof Error ? err.message : "Unknown error";
      setStatus(TransferStatus.Error);
      setError(message);
      throw err;
    }
  };

  const isInProgress = [
    TransferStatus.Building,
    TransferStatus.Signing,
    TransferStatus.Sending,
    TransferStatus.Sent,
    TransferStatus.Pending,
    TransferStatus.Proposed,
    TransferStatus.Committed,
  ].some((s) => s === status);

  return {
    deploy,
    buildTx,
    fee,
    binarySize,
    status,
    isInProgress,
    error,
    txHash,
    blockNumber,
    reset,
    dataHash,
    typeIdArgs,
  };
}
