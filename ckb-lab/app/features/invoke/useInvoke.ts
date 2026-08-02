import { buildTypeInvokeTx } from "@/lib/ckb/invoke";
import { decodeTxError, type DecodedTxError } from "@/lib/ckb/tx-error";
import { TxStatus } from "@/lib/ckb/tx-status";
import { ccc } from "@ckb-ccc/core";
import { useSigner } from "@ckb-ccc/connector-react";
import { useRef, useState } from "react";

// Re-export so consumers don't need a second import line for the status type.
export type { TxStatus } from "@/lib/ckb/tx-status";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export interface InvokeParams {
  script: ccc.ScriptLike;
  cellDep: ccc.OutPointLike;
  depType?: ccc.DepType;
  outputData?: ccc.Hex;
  witness?: ccc.Hex;
  extraCapacity?: bigint;
  feeRate?: number;
}

export function useInvoke() {
  const signer = useSigner();
  const [status, setStatus] = useState<TxStatus>(TxStatus.Idle);
  const [error, setError] = useState<string | null>(null);
  // The structured form of `error`. Kept alongside rather than replacing it: `error` is still the
  // raw string every preview card and the spent-cell check compare against.
  const [decoded, setDecoded] = useState<DecodedTxError | null>(null);
  const [fee, setFee] = useState<bigint | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [blockNumber, setBlockNumber] = useState<bigint | null>(null);
  const [outputCapacity, setOutputCapacity] = useState<bigint | null>(null);
  const pollSignal = useRef<{ cancelled: boolean } | null>(null);
  // Incrementing counter prevents stale async callbacks from updating state after reset.
  const invokeId = useRef(0);

  const buildTx = async (params: InvokeParams): Promise<ccc.Transaction> => {
    if (!signer) throw new Error("Wallet not connected");

    const { tx, outputCapacity: cap } = await buildTypeInvokeTx({ signer, ...params });
    setOutputCapacity(cap);
    const txFee = await tx.getFee(signer.client);
    setFee(txFee);
    return tx;
  };

  const reset = () => {
    invokeId.current += 1;
    if (pollSignal.current) pollSignal.current.cancelled = true;
    pollSignal.current = null;
    setStatus(TxStatus.Idle);
    setError(null);
    setDecoded(null);
    setFee(null);
    setTxHash(null);
    setBlockNumber(null);
    setOutputCapacity(null);
  };

  const invoke = async (params: InvokeParams) => {
    if (!signer) throw new Error("Wallet not connected");

    const myId = ++invokeId.current;
    if (pollSignal.current) pollSignal.current.cancelled = true;
    pollSignal.current = null;
    setError(null);
    setDecoded(null);
    setTxHash(null);
    setBlockNumber(null);

    try {
      setStatus(TxStatus.Building);
      const tx = await buildTx(params);
      if (myId !== invokeId.current) return;

      setStatus(TxStatus.Signing);
      await signer.signTransaction(tx);
      if (myId !== invokeId.current) return;

      setStatus(TxStatus.Sending);
      const hash = await signer.client.sendTransaction(tx);
      if (myId !== invokeId.current) return;

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
                // A rejection here usually means the script itself returned non-zero.
                // Keep the node's reason verbatim — it is the whole point of the page — and
                // decode it alongside. No exitCodes map: /invoke runs an arbitrary script, so
                // the exit code is shown as a bare number rather than read through some other
                // contract's table.
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
      console.error("Invoke error:", err);
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
    invoke,
    buildTx,
    fee,
    outputCapacity,
    status,
    isInProgress,
    error,
    decoded,
    txHash,
    blockNumber,
    reset,
  };
}
