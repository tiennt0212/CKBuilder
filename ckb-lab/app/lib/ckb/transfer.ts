import { ccc } from "@ckb-ccc/core";

/**
 * The smallest amount a plain transfer can send to `lock`, in shannons: the capacity the empty
 * output cell occupies (8 capacity + 32 code_hash + 1 hash_type + args). This is NOT a constant
 * 61 CKB — that only holds for secp256k1's 20-byte args. An Omnilock recipient (e.g. a MetaMask
 * wallet via CCC) has 22-byte args, so its floor is 63 CKB. It depends on the recipient's lock
 * only; the sender's change cell is sized by `completeFeeBy` itself.
 */
export function minTransferCapacity(lock: ccc.ScriptLike): bigint {
  // With capacity omitted and outputData given, CCC fills capacity with the occupied size.
  return ccc.CellOutput.from({ lock }, "0x").capacity;
}

export async function buildTransferTx(
  signer: ccc.Signer,
  to: string,
  amountShannons: bigint,
  feeRate?: number
): Promise<ccc.Transaction> {
  const recipientAddr = await ccc.Address.fromString(to, signer.client);
  const min = minTransferCapacity(recipientAddr.script);
  // Fail here with a readable message instead of letting the node reject the tx later with
  // InsufficientCellCapacity, which names an output index rather than the amount.
  if (amountShannons < min) {
    throw new Error(`Amount must be at least ${ccc.fixedPointToString(min)} CKB for this address`);
  }
  const tx = ccc.Transaction.from({});
  tx.addOutput({ lock: recipientAddr.script }, "0x");
  tx.outputs[0].capacity = amountShannons;
  await tx.completeFeeBy(signer, feeRate);
  return tx;
}
