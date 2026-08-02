import { ccc } from "@ckb-ccc/core";
import { buildTypeInvokeTx } from "./invoke";
import { DepType } from "./dep-type";

/**
 * u64 little-endian codec for the counter cell's raw `data` field — the entire on-chain state
 * (see contracts/lesson-10-counter/src/main.rs's `parse_counter`). Deliberately not reusing
 * script-actions.ts's encodeU64LE: that helper is /invoke's generic witness-arg encoder with no
 * length assertion, a different concern from decoding a specific 8-byte cell-data field where a
 * wrong length is a real error to surface. Keeping /counter's codec local also keeps it fully
 * self-contained — a later change to script-actions.ts for /invoke's needs must never be able to
 * move the ground under /counter.
 */
export function encodeCounterData(count: bigint): ccc.Hex {
  return ccc.hexFrom(ccc.numLeToBytes(count, 8));
}

export function decodeCounterData(data: ccc.HexLike): bigint {
  const bytes = ccc.bytesFrom(data);
  if (bytes.length !== 8) {
    throw new Error(`Counter cell data must be exactly 8 bytes, got ${bytes.length}`);
  }
  return ccc.numFromBytes(bytes);
}

/**
 * The counter contract's own exit codes, mirroring the constants in
 * contracts/lesson-10-counter/src/main.rs (ERROR_INVALID_DATA_LENGTH and below). Passed to
 * `decodeTxError` so /counter can name what a rejection meant.
 *
 * This map only applies to THIS contract. Exit codes are contract-defined — CKB assigns no
 * meaning to any non-zero value beyond "rejected" — which is why the decoder takes the map from
 * the caller instead of holding a global table. /invoke deliberately passes nothing: it runs
 * arbitrary scripts, and a number from one contract read through another's table would be a
 * confident lie. Update this alongside main.rs or the two drift silently.
 */
export const COUNTER_EXIT_CODES: Record<number, string> = {
  5: "the cell data is not exactly 8 bytes — the counter is stored as a u64",
  6: "a newly created counter must start at 0",
  7: "an update needs exactly one input and one output in the script group",
  8: "the output counter must be exactly the input counter plus 1",
};

export interface BuildCounterCreateTxParams {
  signer: ccc.Signer;
  /** The deployed counter script's identity (code_hash/hash_type), from the deployed-scripts registry. */
  script: ccc.ScriptLike;
  /** Outpoint of the deployed counter binary (cell dep). */
  cellDep: ccc.OutPointLike;
  depType?: ccc.DepType;
  feeRate?: number;
}

export interface CounterTxResult {
  tx: ccc.Transaction;
  outputCapacity: bigint;
}

/**
 * Create a brand-new counter cell at count = 0. Creation is structurally identical to a generic
 * type-script invoke (one new output, no input to consume) — thin wrapper over buildTypeInvokeTx,
 * fixing outputData to 8 zero bytes and dropping the witness/args/extraCapacity knobs /invoke
 * exposes but the counter contract never reads (no witness, no args — see main.rs).
 */
export async function buildCounterCreateTx({
  signer,
  script,
  cellDep,
  depType = DepType.Code,
  feeRate,
}: BuildCounterCreateTxParams): Promise<CounterTxResult> {
  const { tx, outputCapacity } = await buildTypeInvokeTx({
    signer,
    script,
    cellDep,
    depType,
    outputData: encodeCounterData(0n),
    feeRate,
  });
  return { tx, outputCapacity };
}

export interface BuildCounterIncrementTxParams {
  signer: ccc.Signer;
  /** Outpoint of the existing counter cell to consume as input. */
  priorOutPoint: ccc.OutPointLike;
  /** Outpoint of the deployed counter binary (cell dep) — from the tracked entry. */
  cellDep: ccc.OutPointLike;
  depType?: ccc.DepType;
  feeRate?: number;
}

export interface CounterIncrementTxResult extends CounterTxResult {
  priorCount: bigint;
  newCount: bigint;
}

/**
 * Increment an existing counter cell by 1. Not expressible via buildTypeInvokeTx: that builder
 * always sources inputs from the wallet's own plain cells via completeInputsByCapacity, which has
 * no path to consume a specific pre-existing outpoint. Here the prior cell's own capacity carries
 * forward unchanged into the new output — completeInputsByCapacity only needs to find *extra*
 * capacity for the fee, since input and output principal already balance exactly.
 */
export async function buildCounterIncrementTx({
  signer,
  priorOutPoint,
  cellDep,
  depType = DepType.Code,
  feeRate,
}: BuildCounterIncrementTxParams): Promise<CounterIncrementTxResult> {
  // Read the live cell from chain, not the local store's cached `count` — the store is a display
  // cache that can drift (stale after external edits, multiple tabs); the chain is the only real
  // source of truth for what the type script will actually see as GroupInput data.
  const cell = await signer.client.getCell(priorOutPoint);
  if (!cell) {
    throw new Error("Counter cell not found — it may already be spent");
  }
  if (!cell.cellOutput.type) {
    throw new Error("Tracked cell has no type script — this entry is not a valid counter cell");
  }

  const priorCount = decodeCounterData(cell.outputData);
  const newCount = priorCount + 1n;

  const tx = ccc.Transaction.from({});
  // Passing cellOutput/outputData here (already fetched above) lets completeInputsByCapacity
  // skip re-fetching this same cell internally.
  tx.addInput({
    previousOutput: ccc.OutPoint.from(priorOutPoint),
    cellOutput: cell.cellOutput,
    outputData: cell.outputData,
  });
  // Carry the EXACT on-chain lock + type forward, not a reconstruction from the tracked entry's
  // denormalized script fields — those only identify which cellDep to reference, never what the
  // output's own lock/type must be. Only `data` changes.
  tx.addOutput(
    { lock: cell.cellOutput.lock, type: cell.cellOutput.type, capacity: cell.cellOutput.capacity },
    encodeCounterData(newCount)
  );
  tx.addCellDeps({ outPoint: ccc.OutPoint.from(cellDep), depType });

  // No-op in the common case (output capacity already equals input capacity); only sources extra
  // wallet cells if there's a genuine shortfall. completeFeeBy then tops up for the fee.
  await tx.completeInputsByCapacity(signer);
  await tx.completeFeeBy(signer, feeRate);

  return { tx, priorCount, newCount, outputCapacity: tx.outputs[0].capacity };
}

export interface BuildCounterDestroyTxParams {
  signer: ccc.Signer;
  priorOutPoint: ccc.OutPointLike;
  cellDep: ccc.OutPointLike;
  depType?: ccc.DepType;
  feeRate?: number;
}

export interface CounterDestroyTxResult {
  tx: ccc.Transaction;
  priorCount: bigint;
  /** The cell's full capacity — what completeFeeBy will return to the wallet, minus the fee. */
  reclaimedCapacity: bigint;
}

/**
 * Destroy an existing counter cell, reclaiming its capacity. The contract allows destruction
 * unconditionally (N group inputs, 0 group outputs) — so this tx adds the cell as an input and
 * deliberately adds NO output carrying the counter's type script. completeFeeBy's automatic
 * change-to-signer behavior (a new output to the signer's own lock for any leftover capacity)
 * is exactly what's needed here — no manual output construction required at all.
 */
export async function buildCounterDestroyTx({
  signer,
  priorOutPoint,
  cellDep,
  depType = DepType.Code,
  feeRate,
}: BuildCounterDestroyTxParams): Promise<CounterDestroyTxResult> {
  const cell = await signer.client.getCell(priorOutPoint);
  if (!cell) {
    throw new Error("Counter cell not found — it may already be spent");
  }
  const priorCount = decodeCounterData(cell.outputData);

  const tx = ccc.Transaction.from({});
  tx.addInput({
    previousOutput: ccc.OutPoint.from(priorOutPoint),
    cellOutput: cell.cellOutput,
    outputData: cell.outputData,
  });
  tx.addCellDeps({ outPoint: ccc.OutPoint.from(cellDep), depType });

  await tx.completeFeeBy(signer, feeRate);

  return { tx, priorCount, reclaimedCapacity: cell.cellOutput.capacity };
}
