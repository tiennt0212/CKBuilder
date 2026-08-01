/**
 * What /tokens is about to do: mint a brand-new supply of the wallet's own token, or move an
 * existing token to someone else. Object-as-namespace so the two are compared by name, not magic
 * string — mirrors invoke/script-source.ts and counter/counter-mode.ts.
 *
 * These are peer modes of one operation, not two separate features: both build a transaction whose
 * output carries the xUDT type script, and they differ only in where the tokens come from.
 */
export const TokenAction = {
  Issue: "issue",
  Transfer: "transfer",
} as const;

export type TokenAction = (typeof TokenAction)[keyof typeof TokenAction];

/** Shared per-mode copy, so the input card's heading and its submit button can't drift apart. */
export const TOKEN_ACTION_META: Record<
  TokenAction,
  { title: string; subtitle: string; submit: string }
> = {
  [TokenAction.Issue]: {
    title: "Issue token",
    subtitle: "Mint a new xUDT owned by your lock",
    submit: "Issue tokens",
  },
  [TokenAction.Transfer]: {
    title: "Transfer token",
    subtitle: "Send an xUDT you hold to another address",
    submit: "Send tokens",
  },
};
