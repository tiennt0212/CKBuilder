import { ccc } from "@ckb-ccc/core";

export async function buildTransferTx(
  signer: ccc.Signer,
  to: string,
  amountShannons: bigint,
  feeRate?: number
): Promise<ccc.Transaction> {
  const recipientAddr = await ccc.Address.fromString(to, signer.client);
  const tx = ccc.Transaction.from({});
  tx.addOutput({ lock: recipientAddr.script }, "0x");
  tx.outputs[0].capacity = amountShannons;
  await tx.completeFeeBy(signer, feeRate);
  return tx;
}
