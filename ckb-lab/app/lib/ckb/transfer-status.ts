export const TransferStatus = {
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

export type TransferStatus = (typeof TransferStatus)[keyof typeof TransferStatus];
export const TRANSFER_STATUSES = Object.values(TransferStatus) as TransferStatus[];
