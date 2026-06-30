export const TxStatus = {
  Idle: "idle",
  Building: "building",
  Signing: "signing",
  Sending: "sending",
  Sent: "sent",
  Pending: "pending",
  Proposed: "proposed",
  Committed: "committed",
  Rejected: "rejected",
  Error: "error",
} as const;

export type TxStatus = (typeof TxStatus)[keyof typeof TxStatus];
export const TX_STATUSES = Object.values(TxStatus) as TxStatus[];
