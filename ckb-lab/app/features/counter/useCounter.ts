import {
  buildCounterCreateTx,
  buildCounterDestroyTx,
  buildCounterIncrementTx,
} from "@/lib/ckb/counter";
import { counterCellId, type CounterCell, type CounterScriptRef } from "@/lib/ckb/counter-cells";
import { TxStatus } from "@/lib/ckb/tx-status";
import { useCounterCellsStore } from "@/stores/counter-cells";
import { useNetworkStore } from "@/stores/network";
import { ccc } from "@ckb-ccc/core";
import { useSigner } from "@ckb-ccc/connector-react";
import { useRef, useState } from "react";

// Re-export so consumers don't need a second import line for the status type.
export type { TxStatus } from "@/lib/ckb/tx-status";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export type CounterRunParams =
  | { kind: "create"; script: CounterScriptRef; label?: string; feeRate?: number }
  | { kind: "increment"; entry: CounterCell; feeRate?: number }
  | { kind: "destroy"; entry: CounterCell; feeRate?: number };

/**
 * One hook covering create/increment/destroy rather than three near-identical copies of the
 * build->sign->send->poll->persist skeleton: all three verbs share that skeleton completely and
 * differ only in which pure builder (app/lib/ckb/counter.ts) runs and which counter-cells store
 * call fires on commit. Mirrors useDeploy.ts/useInvoke.ts's status machine, staleness-guard ref,
 * and poll loop exactly; the one new piece is the three-way commit branch below.
 */
export function useCounter() {
  const signer = useSigner();
  const network = useNetworkStore((s) => s.network);
  const [status, setStatus] = useState<TxStatus>(TxStatus.Idle);
  const [error, setError] = useState<string | null>(null);
  const [fee, setFee] = useState<bigint | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [blockNumber, setBlockNumber] = useState<bigint | null>(null);
  // "before"/"after" counter values, feeding StatePanel/CellFlow. priorCount is null for a
  // fresh create (no prior cell); newCount is null for a destroy (no resulting cell).
  const [priorCount, setPriorCount] = useState<bigint | null>(null);
  const [newCount, setNewCount] = useState<bigint | null>(null);
  const [outputCapacity, setOutputCapacity] = useState<bigint | null>(null);
  const pollSignal = useRef<{ cancelled: boolean } | null>(null);
  // Incrementing counter prevents stale async callbacks from updating state after reset.
  const counterId = useRef(0);
  // Derived values from the last build, kept in a ref because the poll loop that persists the
  // result runs after commit and would otherwise close over stale state.
  const lastBuild = useRef<{
    kind: CounterRunParams["kind"];
    script?: CounterScriptRef; // present for "create"
    label?: string; // present for "create"
    priorEntry?: CounterCell; // present for "increment"/"destroy"
  } | null>(null);

  const buildTx = async (params: CounterRunParams): Promise<ccc.Transaction> => {
    if (!signer) throw new Error("Wallet not connected");

    if (params.kind === "create") {
      const script = ccc.Script.from({
        codeHash: params.script.codeHash,
        hashType: params.script.hashType,
        args: "0x",
      });
      const { tx, outputCapacity: cap } = await buildCounterCreateTx({
        signer,
        script,
        cellDep: params.script.cellDep,
        depType: params.script.depType,
        feeRate: params.feeRate,
      });
      setPriorCount(null);
      setNewCount(0n);
      setOutputCapacity(cap);
      lastBuild.current = { kind: "create", script: params.script, label: params.label };
      setFee(await tx.getFee(signer.client));
      return tx;
    }

    if (params.kind === "increment") {
      const {
        tx,
        priorCount: prior,
        newCount: next,
        outputCapacity: cap,
      } = await buildCounterIncrementTx({
        signer,
        priorOutPoint: params.entry.outPoint,
        cellDep: params.entry.script.cellDep,
        depType: params.entry.script.depType,
        feeRate: params.feeRate,
      });
      setPriorCount(prior);
      setNewCount(next);
      setOutputCapacity(cap);
      lastBuild.current = { kind: "increment", priorEntry: params.entry };
      setFee(await tx.getFee(signer.client));
      return tx;
    }

    // destroy
    const {
      tx,
      priorCount: prior,
      reclaimedCapacity,
    } = await buildCounterDestroyTx({
      signer,
      priorOutPoint: params.entry.outPoint,
      cellDep: params.entry.script.cellDep,
      depType: params.entry.script.depType,
      feeRate: params.feeRate,
    });
    setPriorCount(prior);
    setNewCount(null);
    setOutputCapacity(reclaimedCapacity);
    lastBuild.current = { kind: "destroy", priorEntry: params.entry };
    setFee(await tx.getFee(signer.client));
    return tx;
  };

  const reset = () => {
    counterId.current += 1;
    if (pollSignal.current) pollSignal.current.cancelled = true;
    pollSignal.current = null;
    setStatus(TxStatus.Idle);
    setError(null);
    setFee(null);
    setTxHash(null);
    setBlockNumber(null);
    setPriorCount(null);
    setNewCount(null);
    setOutputCapacity(null);
  };

  const run = async (params: CounterRunParams) => {
    if (!signer) throw new Error("Wallet not connected");

    const myId = ++counterId.current;
    if (pollSignal.current) pollSignal.current.cancelled = true;
    pollSignal.current = null;
    setError(null);
    setTxHash(null);
    setBlockNumber(null);

    try {
      setStatus(TxStatus.Building);
      const tx = await buildTx(params);
      if (myId !== counterId.current) return;

      setStatus(TxStatus.Signing);
      await signer.signTransaction(tx);
      if (myId !== counterId.current) return;

      setStatus(TxStatus.Sending);
      const hash = await signer.client.sendTransaction(tx);
      if (myId !== counterId.current) return;

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
              case TxStatus.Committed: {
                if (signal.cancelled) return;
                setStatus(TxStatus.Committed);
                setBlockNumber(res.blockNumber ?? null);

                // Persist the result so Existing mode can offer it next time, without the
                // user copying an outpoint by hand. Only a committed tx is recorded — a
                // rejected one leaves no live cell (or still leaves the old one alive).
                const build = lastBuild.current;
                if (build?.kind === "create" && build.script) {
                  const now = new Date().toISOString();
                  useCounterCellsStore.getState().add({
                    id: counterCellId(hash, 0, network),
                    outPoint: { txHash: hash, index: 0 },
                    count: "0",
                    script: build.script,
                    network,
                    label: build.label,
                    createdAt: now,
                    updatedAt: now,
                  });
                } else if (build?.kind === "increment" && build.priorEntry) {
                  const prior = build.priorEntry;
                  useCounterCellsStore.getState().update(prior.id, {
                    ...prior,
                    id: counterCellId(hash, 0, network),
                    outPoint: { txHash: hash, index: 0 },
                    count: String(BigInt(prior.count) + 1n),
                    updatedAt: new Date().toISOString(),
                  });
                } else if (build?.kind === "destroy" && build.priorEntry) {
                  useCounterCellsStore.getState().remove(build.priorEntry.id, network);
                }
                return;
              }
              case TxStatus.Rejected:
                if (signal.cancelled) return;
                setStatus(TxStatus.Rejected);
                // A rejection here usually means the type script itself returned non-zero
                // (e.g. ERROR_COUNTER_NOT_INCREMENTED). Keep the node's reason verbatim.
                setError(res.reason ?? "Rejected by node");
                return;
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
      console.error("Counter tx error:", err);
      const message = err instanceof Error ? err.message : "Unknown error";
      setStatus(TxStatus.Error);
      setError(message);
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
    priorCount,
    newCount,
    outputCapacity,
    status,
    isInProgress,
    error,
    txHash,
    blockNumber,
    reset,
  };
}
