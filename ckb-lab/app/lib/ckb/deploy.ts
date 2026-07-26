import { ccc } from "@ckb-ccc/core";

export interface BuildDeployTxParams {
  signer: ccc.Signer;
  /** Raw RISC-V binary. Hex conversion happens here — callers always pass plain bytes. */
  binary: Uint8Array;
  feeRate?: number;
  /** Hash type callers will use when referencing this cell. Default "data1" (CKB VM1). */
  hashType?: ccc.HashType;
  /** When true, attach a Type ID type script so the code_hash stays stable after upgrades. */
  enableTypeId?: boolean;
}

export interface DeployTxResult {
  tx: ccc.Transaction;
  /**
   * Blake2b-256 hash of the binary data (0x-prefixed hex).
   * Used as code_hash when referencing with hash_type "data" / "data1" / "data2".
   */
  dataHash: ccc.Hex;
  /**
   * Type ID args (0x-prefixed hex). Only present when enableTypeId = true.
   * Derived from the first input and the output index; uniquely identifies this cell.
   */
  typeIdArgs?: ccc.Hex;
  /**
   * The stable code_hash to use when referencing this cell with hash_type "type".
   * Only present when enableTypeId = true.
   *
   * This is the *hash of the whole Type ID type script*, not its args — a script is
   * identified by blake2b(code_hash ‖ hash_type ‖ args), so passing the bare args as a
   * code_hash would reference a script that does not exist.
   */
  typeIdCodeHash?: ccc.Hex;
}

/**
 * Build a CKB transaction that stores a compiled RISC-V binary as cell data.
 *
 * The script cell is always placed at output index 0 so the stable outpoint
 * for cell dep references is `txHash:0x0`.
 *
 * The returned tx is unsigned — the caller must sign and broadcast it.
 */
export async function buildDeployTx({
  signer,
  binary,
  feeRate,
  enableTypeId = false,
}: BuildDeployTxParams): Promise<DeployTxResult> {
  // CKB cell data must be a 0x-prefixed hex string; raw bytes are not accepted on-chain.
  const hexData =
    "0x" +
    Array.from(binary)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

  // Compute the data hash upfront — callers need it for the preview summary regardless
  // of whether Type ID is enabled.
  const dataHash = ccc.hashCkb(binary);

  // Use the deployer's own lock as the output cell lock so only they can update or consume it.
  // getRecommendedAddressObj() avoids a round-trip through string parsing.
  const { script: lock } = await signer.getRecommendedAddressObj();

  const tx = ccc.Transaction.from({});

  // Output capacity is intentionally left at 0.
  // completeInputsByCapacity will compute the minimum occupied size:
  //   (lock_script_bytes + 8-byte capacity field + data_bytes) × 10^8 shannons
  // and set it on the output, avoiding a hardcoded formula that would be wrong
  // for wallets whose lock args differ from the secp256k1 default (20 bytes).
  tx.addOutput({ lock }, hexData);

  // Pass 1: source enough inputs to cover the output's occupied capacity.
  await tx.completeInputsByCapacity(signer);

  let typeIdArgs: ccc.Hex | undefined;
  let typeIdCodeHash: ccc.Hex | undefined;
  if (enableTypeId) {
    // hashTypeId MUST be called after completeInputsByCapacity (needs tx.inputs[0] to exist)
    // but BEFORE completeFeeBy — adding the type script increases the occupied size of the
    // output, which changes the minimum fee. Getting the order wrong leaves the tx underfunded.
    typeIdArgs = ccc.hashTypeId(tx.inputs[0], 0);
    const { codeHash, hashType: typeIdHashType } = await signer.client.getKnownScript(
      ccc.KnownScript.TypeId
    );
    tx.outputs[0].type = ccc.Script.from({
      codeHash,
      hashType: typeIdHashType,
      args: typeIdArgs,
    });
    typeIdCodeHash = tx.outputs[0].type.hash();
  }

  // Pass 2: top up any shortfall from fee so the tx is valid to broadcast.
  await tx.completeFeeBy(signer, feeRate);

  return { tx, dataHash, typeIdArgs, typeIdCodeHash };
}
