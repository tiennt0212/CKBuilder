import { buildDeployTx } from "@/lib/ckb/deploy";
import { decodeTxError, type DecodedTxError } from "@/lib/ckb/tx-error";
import { deployedScriptId } from "@/lib/ckb/deployed-scripts";
import { HashType } from "@/lib/ckb/hash-type";
import { useDeployedScriptsStore } from "@/stores/deployed-scripts";
import { TxStatus } from "@/lib/ckb/tx-status";
import { useNetworkStore } from "@/stores/network";
import { ccc } from "@ckb-ccc/core";
import { useSigner } from "@ckb-ccc/connector-react";
import type { UploadFile } from "antd";
import { useRef, useState } from "react";

// Re-export so consumers don't need a second import line for the status type.
export type { TxStatus } from "@/lib/ckb/tx-status";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

interface BuildTxParams {
  file: UploadFile;
  feeRate?: number;
  hashType?: ccc.HashType;
  enableTypeId?: boolean;
}

export function useDeploy() {
  const signer = useSigner();
  const [status, setStatus] = useState<TxStatus>(TxStatus.Idle);
  const [error, setError] = useState<string | null>(null);
  const [decoded, setDecoded] = useState<DecodedTxError | null>(null);
  const [fee, setFee] = useState<bigint | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [blockNumber, setBlockNumber] = useState<bigint | null>(null);
  const [binarySize, setBinarySize] = useState<number | null>(null);
  const [dataHash, setDataHash] = useState<string | null>(null);
  const [typeIdArgs, setTypeIdArgs] = useState<string | null>(null);
  const [typeIdCodeHash, setTypeIdCodeHash] = useState<string | null>(null);
  const network = useNetworkStore((s) => s.network);
  const pollSignal = useRef<{ cancelled: boolean } | null>(null);
  // Incrementing counter prevents stale async callbacks from updating state after reset.
  const deployId = useRef(0);
  // Derived values from the last build, kept in a ref because the poll loop that records
  // the deploy in the registry runs after commit and would otherwise close over stale state.
  const lastBuild = useRef<{
    label: string;
    codeHash: string;
    hashType: ccc.HashType;
  } | null>(null);

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
      typeIdCodeHash: tich,
    } = await buildDeployTx({ signer, binary, feeRate, hashType, enableTypeId });
    setDataHash(dh);
    setTypeIdArgs(tia ?? null);
    setTypeIdCodeHash(tich ?? null);

    // With Type ID the cell is referenced by its type script hash at hash_type "type";
    // without it, by the data hash at hash_type "data*". Record whichever pair actually
    // resolves, so /invoke can use the entry without the user reasoning about it.
    //
    // Guard: never record { data hash, "type" }. A plain data cell has no type script,
    // so "type" resolves to nothing and /invoke would fail with ScriptNotFound. Even if a
    // stray "type" reaches here without Type ID, coerce it to a data hash reference.
    lastBuild.current = {
      label: file.name,
      codeHash: enableTypeId && tich ? tich : dh,
      hashType: enableTypeId
        ? HashType.Type
        : hashType === HashType.Data2
          ? HashType.Data2
          : HashType.Data1,
    };

    const txFee = await tx.getFee(signer.client);
    setFee(txFee);
    return tx;
  };

  const reset = () => {
    deployId.current += 1;
    if (pollSignal.current) pollSignal.current.cancelled = true;
    pollSignal.current = null;
    setStatus(TxStatus.Idle);
    setError(null);
    setDecoded(null);
    setFee(null);
    setTxHash(null);
    setBlockNumber(null);
    setBinarySize(null);
    setDataHash(null);
    setTypeIdArgs(null);
    setTypeIdCodeHash(null);
  };

  const deploy = async ({ file, feeRate, hashType, enableTypeId }: BuildTxParams) => {
    if (!signer) throw new Error("Wallet not connected");

    const myId = ++deployId.current;
    if (pollSignal.current) pollSignal.current.cancelled = true;
    pollSignal.current = null;
    setError(null);
    setDecoded(null);
    setTxHash(null);
    setBlockNumber(null);

    try {
      setStatus(TxStatus.Building);
      const tx = await buildTx({ file, feeRate, hashType, enableTypeId });
      if (myId !== deployId.current) return;

      setStatus(TxStatus.Signing);
      await signer.signTransaction(tx);
      if (myId !== deployId.current) return;

      setStatus(TxStatus.Sending);
      const hash = await signer.client.sendTransaction(tx);
      if (myId !== deployId.current) return;

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
                // Record the deploy so /invoke can offer it without the user copying an
                // outpoint and code hash by hand. Only committed deploys are recorded —
                // a rejected tx leaves no live cell for a cell dep to resolve against.
                if (lastBuild.current) {
                  // Write through the store (not the util directly) so /invoke and /registry,
                  // which read the same singleton, reflect the new entry without a reload.
                  useDeployedScriptsStore.getState().add({
                    id: deployedScriptId(hash, 0, network),
                    label: lastBuild.current.label,
                    txHash: hash,
                    index: 0,
                    codeHash: lastBuild.current.codeHash,
                    hashType: lastBuild.current.hashType,
                    network,
                    deployedAt: new Date().toISOString(),
                  });
                }
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
      console.error("Deploy error:", err);
      const message = err instanceof Error ? err.message : "Unknown error";
      setStatus(TxStatus.Error);
      setError(message);
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
    deploy,
    buildTx,
    fee,
    binarySize,
    status,
    isInProgress,
    error,
    decoded,
    txHash,
    blockNumber,
    reset,
    dataHash,
    typeIdArgs,
    typeIdCodeHash,
  };
}
