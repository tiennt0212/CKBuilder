import { ccc } from "@ckb-ccc/core";

export const txToRawJson = (tx: ccc.Transaction | null) =>
  tx ? JSON.parse(ccc.stringify(tx)) : null;
export const txToBytes = (tx: ccc.Transaction | null) => (tx ? tx.rawToBytes() : null);
export const addressFromLock = (client: ccc.Client | null, lock: ccc.Script | null) => {
  if (!client || !lock) return null;
  return ccc.Address.fromScript(lock, client);
};
