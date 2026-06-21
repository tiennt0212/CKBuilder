import { ccc } from "@ckb-ccc/core"

export async function buildTransferTx(
	to: string,
	amountShannons: bigint,
	signer: ccc.Signer
): Promise<ccc.Transaction> {
	const recipientAddr = await ccc.Address.fromString(to, signer.client);
	const tx = ccc.Transaction.from({});
	tx.addOutput({ lock: recipientAddr.script }, "0x");
	tx.outputs[0].capacity = amountShannons;
	await tx.completeFeeBy(signer);  // coin selection + fee + change output
	return tx;
}