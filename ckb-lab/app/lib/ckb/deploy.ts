import { ccc } from "@ckb-ccc/core";

export interface BuildDeployTxParams {
  signer: ccc.Signer;
  /** Raw RISC-V binary. Hex conversion happens here — callers always pass plain bytes. */
  binary: Uint8Array;
  feeRate?: number;
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
}: BuildDeployTxParams): Promise<ccc.Transaction> {
  // CKB cell data must be a 0x-prefixed hex string; raw bytes are not accepted on-chain.
  const hexData =
    "0x" +
    Array.from(binary)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

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
  // Pass 2: top up any shortfall from fee so the tx is valid to broadcast.
  await tx.completeFeeBy(signer, feeRate);

  return tx;
}
