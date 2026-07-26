import { ccc } from "@ckb-ccc/core";
import { DepType } from "./dep-type";

export interface BuildTypeInvokeTxParams {
  signer: ccc.Signer;
  /** The script under test, attached to the output cell as its type script. */
  script: ccc.ScriptLike;
  /** Outpoint of the deployed cell holding the script binary. */
  cellDep: ccc.OutPointLike;
  /**
   * How the node reads the cell dep. "code" = its data IS the binary (what /deploy produces).
   * "depGroup" = its data is a list of outpoints to load (e.g. system scripts like secp256k1).
   * Defaults to "code".
   */
  depType?: ccc.DepType;
  /** Cell data for the output, 0x-prefixed hex. Defaults to empty. */
  outputData?: ccc.Hex;
  /** Script payload, placed in WitnessArgs.outputType. Omit for scripts that read no witness. */
  witness?: ccc.Hex;
  /** Shannons to add on top of the minimum occupied capacity, for a cell whose data may grow. */
  extraCapacity?: bigint;
  feeRate?: number;
}

export interface TypeInvokeTxResult {
  tx: ccc.Transaction;
  /** Final capacity of the output cell in shannons — minimum occupied plus any extra. */
  outputCapacity: bigint;
}

/**
 * Build a transaction that exercises a deployed script as a **type script**.
 *
 * There is no such thing as calling a CKB script. The script runs as a validator during
 * verification: attaching it to an output means the node executes it when the cell is
 * created, and a non-zero return rejects the whole transaction. That rejection is a real
 * outcome to surface, not an error to swallow.
 *
 * The returned tx is unsigned — the caller must sign and broadcast it.
 */
export async function buildTypeInvokeTx({
  signer,
  script,
  cellDep,
  depType = DepType.Code,
  outputData = "0x",
  witness,
  extraCapacity = 0n,
  feeRate,
}: BuildTypeInvokeTxParams): Promise<TypeInvokeTxResult> {
  const { script: lock } = await signer.getRecommendedAddressObj();

  const tx = ccc.Transaction.from({});

  // Capacity is intentionally left at 0 — completeInputsByCapacity computes the minimum
  // occupied size from the real lock + type + data bytes. A hardcoded formula would be
  // wrong for any wallet whose lock args are not the secp256k1 default of 20 bytes.
  tx.addOutput({ lock, type: ccc.Script.from(script) }, outputData);

  // Without this dep the node cannot load the script binary and fails to resolve the
  // type script, regardless of whether the script itself would have passed.
  tx.addCellDeps({ outPoint: ccc.OutPoint.from(cellDep), depType });

  if (witness) {
    // The payload goes in WitnessArgs.outputType, NOT into witnesses[0] as raw bytes.
    // Input 0 belongs to the signer, so its secp signature owns witnesses[0]; writing raw
    // hex there would be overwritten by signTransaction. Using the structured WitnessArgs
    // lets the signer fill the `lock` field while leaving `outputType` intact, and
    // outputType is the field a type script validating outputs is expected to read.
    tx.setWitnessArgsAt(0, ccc.WitnessArgs.from({ outputType: witness }));
  }

  // Pass 1: source enough inputs to cover the output's occupied capacity.
  await tx.completeInputsByCapacity(signer);

  if (extraCapacity > 0n) {
    // Must happen before completeFeeBy: raising the output capacity increases what the
    // inputs have to cover, and completeFeeBy is what tops up the shortfall.
    tx.outputs[0].capacity += extraCapacity;
  }

  // Pass 2: top up for fee and for any extra capacity added above.
  await tx.completeFeeBy(signer, feeRate);

  return { tx, outputCapacity: tx.outputs[0].capacity };
}
