import { ccc } from "@ckb-ccc/core";
import { shannonToCKB } from "@/lib/format";

/**
 * Turns a node rejection into a structured, human-readable explanation.
 *
 * Pure — no React, no chain calls, no store reads. The UI decides presentation; this module only
 * decides what the failure *was*.
 *
 * Why this exists: there is no way to "call" a CKB script. A script is a RISC-V binary handed the
 * whole transaction that returns 0 or non-zero, so a rejection is a normal outcome and the node's
 * verdict is the product. But the verdict arrives as e.g.
 *
 *   Verification(Error { kind: Script, inner: TransactionScriptError { source: Inputs[0].Lock,
 *   cause: ValidationFailure: see error code -31 on page https://... })
 *
 * which reports the fact without teaching anything. The decoder augments that string; it never
 * replaces it — `raw` always carries the node's own words through to the UI.
 */

export const TxErrorKind = {
  /** The script ran and returned non-zero. The number is the script's own exit code. */
  ScriptRejected: "scriptRejected",
  /** code_hash + hash_type resolve to no binary — the script reference can never work. */
  ScriptNotFound: "scriptNotFound",
  /** CKB-VM refused an instruction the binary contains. Not a deploy-side problem. */
  InvalidInstruction: "invalidInstruction",
  /** A cell dep (or input) the node cannot find at all. */
  CellDepMissing: "cellDepMissing",
  /** An input exists but is already spent. */
  InputSpent: "inputSpent",
  /** A cellbase output still inside its 4-epoch lock, or a `since` not yet satisfied. */
  Immature: "immature",
  /** Not enough CKB to cover the outputs' occupied capacity plus the fee. */
  InsufficientCapacity: "insufficientCapacity",
  /** Enough CKB, but not enough of the token being sent. */
  InsufficientCoin: "insufficientCoin",
  /** This exact transaction is already in the pool or on chain. */
  DuplicatedTransaction: "duplicatedTransaction",
  /** The pool wants a higher fee — min fee rate, or an RBF replacement that undercuts. */
  FeeTooLow: "feeTooLow",
  /** The user dismissed the wallet's signing prompt. Nothing reached the node. */
  WalletRejected: "walletRejected",
  /** Nothing matched. `cause` falls back to the raw string, i.e. exactly the old behaviour. */
  Unknown: "unknown",
} as const;

export type TxErrorKind = (typeof TxErrorKind)[keyof typeof TxErrorKind];

/** Which script group the node was running when it rejected. */
export type ScriptSource = "lock" | "inputType" | "outputType";

export interface DecodedTxError {
  kind: TxErrorKind;
  /** The node's / library's verbatim message. Always populated — the decoder only augments. */
  raw: string;
  /** Headline, e.g. "Script rejected the transaction". */
  title: string;
  /** One or two sentences of plain language. */
  cause: string;
  /** A concrete thing to do next, when there is one. */
  nextStep?: string;
  /**
   * The script's OWN exit code. Contract-defined: the same number means different things in
   * different scripts, so it is carried through as a number and never given a universal meaning.
   */
  exitCode?: number;
  /** Set only when the caller supplied an `exitCodes` map for the script that actually ran. */
  exitCodeMeaning?: string;
  scriptSource?: ScriptSource;
  /** Index within inputs/outputs of the cell whose script failed. */
  scriptIndex?: number;
  scriptCodeHash?: string;
  /** The ckb-script-error-codes page the node pointed at, when it gave one. */
  referenceUrl?: string;
}

export interface DecodeOptions {
  /**
   * exit code → meaning, for the script the caller knows is running. The caller supplies this
   * because exit codes are defined by the contract, not by CKB — a decoder that hardcoded a
   * table would be inventing meanings for other people's scripts. Pages that run an arbitrary
   * script (`/invoke`) correctly pass nothing and get the bare number.
   */
  exitCodes?: Record<number, string>;
  /** Name of that script, used in the cause sentence. */
  scriptLabel?: string;
}

/** A decoded error before the raw string is attached — the shape the static cases are written in. */
type Explanation = Omit<DecodedTxError, "raw">;

const SCRIPT_SOURCE_LABEL: Record<ScriptSource, string> = {
  lock: "lock script",
  inputType: "type script (on an input)",
  outputType: "type script (on an output)",
};

/**
 * CCC's own parser reports `errorCode` from the regex `(-?[0-9])*`, which repeats a
 * single-character group — so JavaScript keeps only the LAST repetition. `-31` is reported as
 * `1`, `12` as `2`; only single-digit non-negative codes survive. Verified against
 * @ckb-ccc/core 1.12.5 `client/jsonRpc/client.js` ERROR_PARSERS.
 *
 * The exit code is the one number this whole module exists to deliver, so re-read it from the
 * raw string rather than trusting `ErrorClientVerification.errorCode`. Every other field on that
 * class is captured correctly and is used as-is.
 *
 * Two spellings, because CKB changed the Display impl: newer nodes point at the error-code page,
 * older ones print `ValidationFailure(-31)`.
 */
const EXIT_CODE_RES = [/see error code (-?\d+) on page/, /ValidationFailure[:(]\s*(-?\d+)/];
const REFERENCE_URL_RE =
  /(https:\/\/nervosnetwork\.github\.io\/ckb-script-error-codes\/\S+?\.html)/;

/** The node names the unresolvable script in newer CKB builds: `ScriptNotFound: code_hash: …`. */
const NOT_FOUND_CODE_HASH_RE = /ScriptNotFound:\s*code_hash:\s*Byte32\((0x[0-9a-fA-F]+)\)/;

/** EIP-1193's "user rejected request". Standard across browser wallets; the wording is not. */
const EIP1193_USER_REJECTED = 4001;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Pulls the most informative string available off whatever was thrown. */
function rawOf(err: unknown): string {
  // ErrorClientBase and its subclasses carry the node's untouched string in `data`, while
  // `message` is wrapped in "Client request error …". Prefer `data`.
  if (err instanceof ccc.ErrorClientBase && err.data) return err.data;
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  // Wallet extensions throw plain objects rather than Errors — MetaMask's rejection is
  // `{ code: 4001, message: "User rejected the request.", data: {…} }`. Without this branch
  // String() yields "[object Object]" and the entire message is lost.
  if (isRecord(err) && typeof err.message === "string") return err.message;
  return String(err);
}

function exitCodeFrom(raw: string): number | undefined {
  for (const re of EXIT_CODE_RES) {
    const m = raw.match(re);
    if (m) return Number(m[1]);
  }
  return undefined;
}

/** Describes an exit code without pretending to know what it means. */
function scriptRejected(raw: string, opts?: DecodeOptions): DecodedTxError {
  const exitCode = exitCodeFrom(raw);
  const label = opts?.scriptLabel ? `The ${opts.scriptLabel} script` : "The script";
  const meaning = exitCode === undefined ? undefined : opts?.exitCodes?.[exitCode];

  const cause =
    exitCode === undefined
      ? `${label} returned non-zero, but the node did not report which exit code.`
      : meaning
        ? `${label} returned exit code ${exitCode}: ${meaning}`
        : `${label} returned exit code ${exitCode}. Exit codes are defined by the contract, ` +
          `not by CKB, so this number only has meaning against that script's own source.`;

  return {
    kind: TxErrorKind.ScriptRejected,
    raw,
    title: "Script rejected the transaction",
    cause,
    exitCode,
    exitCodeMeaning: meaning,
    referenceUrl: raw.match(REFERENCE_URL_RE)?.[1],
  };
}

const SCRIPT_NOT_FOUND: Explanation = {
  kind: TxErrorKind.ScriptNotFound,
  title: "Script not found",
  cause:
    "The node could not resolve this code_hash + hash_type pair to a binary. A script is " +
    "identified by blake2b(code_hash ‖ hash_type ‖ args), so the two are one decision: a plain " +
    "data cell can only be referenced by its data hash (data1/data2), and a Type ID cell by " +
    "type. The impossible pair is accepted at deploy time and only fails here, at broadcast.",
  nextStep:
    "Check the hash_type on the registry entry against how the cell was actually deployed — a " +
    'data hash with hash_type "type" can never resolve.',
};

const INVALID_INSTRUCTION: Explanation = {
  kind: TxErrorKind.InvalidInstruction,
  title: "CKB-VM refused an instruction in the binary",
  cause:
    "A riscv64imac build can emit native atomics (LR/SC/AMO), which CKB-VM does not execute on " +
    "any VM version. This is a property of the binary, not of how it was deployed — no " +
    "hash_type fixes it. It looks like a script-resolution problem and is not one.",
  nextStep:
    "Rebuild the contract with -C target-feature=-a and deploy it again. Tracked as issue #34.",
};

const CELL_DEP_MISSING: Explanation = {
  kind: TxErrorKind.CellDepMissing,
  title: "A referenced cell does not exist on this chain",
  cause:
    "The node cannot find a cell dep or input this transaction points at. The usual cause is a " +
    "reference built for one network and broadcast on another: on devnet, any script this app " +
    "does not override falls back to the testnet cell-dep outpoint, which resolves cleanly " +
    "while building and only fails here.",
  nextStep:
    "Confirm the cell dep outpoint exists on the network you are connected to, not just on " +
    "testnet.",
};

const INPUT_SPENT: Explanation = {
  kind: TxErrorKind.InputSpent,
  title: "An input is already spent",
  cause:
    "One of the cells this transaction consumes no longer exists on chain — something else " +
    "spent it first. Cells are consumed whole, so a stale local copy of one is enough to cause " +
    "this.",
  nextStep: "Re-read the cell from chain and rebuild the transaction.",
};

const IMMATURE: Explanation = {
  kind: TxErrorKind.Immature,
  title: "Input is not spendable yet",
  cause:
    "An input is still locked by time: either a cellbase (miner reward) output inside its " +
    "4-epoch maturity window, or a `since` field the chain has not reached.",
  nextStep: "Wait for the maturity window to pass, then rebuild the transaction.",
};

const INSUFFICIENT_CAPACITY: Explanation = {
  kind: TxErrorKind.InsufficientCapacity,
  title: "Not enough CKB",
  cause:
    "The inputs do not cover the outputs' occupied capacity plus the fee. Every cell must hold " +
    "at least as much CKB as its own bytes occupy, so capacity is locked by a cell, not spent " +
    "by it.",
  nextStep: "Reduce the amount, or fund the wallet with more CKB.",
};

const DUPLICATED_TRANSACTION: Explanation = {
  kind: TxErrorKind.DuplicatedTransaction,
  title: "This transaction is already in the pool",
  cause:
    "A byte-identical transaction has already been submitted. The node keeps the first one; " +
    "this submission changes nothing.",
  nextStep: "Wait for the original to be committed rather than resubmitting.",
};

const FEE_TOO_LOW: Explanation = {
  kind: TxErrorKind.FeeTooLow,
  title: "Fee too low for the pool to accept",
  cause:
    "The node's mempool declined the transaction at this fee rate — either it is under the " +
    "minimum, or it is replacing an earlier transaction without paying more than it.",
  nextStep: "Raise the fee rate and rebuild.",
};

const WALLET_REJECTED: Explanation = {
  kind: TxErrorKind.WalletRejected,
  title: "Signing was cancelled",
  cause:
    "The wallet prompt was dismissed, so the transaction was never signed and nothing reached " +
    "the node. No CKB moved.",
  nextStep: "Submit again and approve the prompt in your wallet.",
};

/**
 * Ordered matchers over the raw string, mirroring the shape of CCC's own ERROR_PARSERS —
 * first match wins. This is the fallback path for everything CCC does not turn into a typed
 * error, and it is not optional: `tx_status.reason` from the polling loop is a plain string that
 * never passes through CCC's parsers at all.
 */
type Matcher = (raw: string, opts?: DecodeOptions) => DecodedTxError;

/** Wraps a static explanation as a matcher, attaching the raw string the node actually sent. */
const fixed =
  (explanation: Explanation): Matcher =>
  (raw) => ({ ...explanation, raw });

const RAW_MATCHERS: { test: RegExp; explain: Matcher }[] = [
  // Ordered before ScriptNotFound: an InvalidInstruction failure reads like a resolution
  // problem, and matching it first is what stops it being reported as one.
  { test: /InvalidInstruction|VM Internal Error/i, explain: fixed(INVALID_INSTRUCTION) },
  { test: /ValidationFailure/i, explain: scriptRejected },
  {
    test: /ScriptNotFound|script not found/i,
    // Newer nodes name the code_hash they could not resolve. Surfacing it turns "something did
    // not resolve" into a value the reader can compare against their registry entry.
    explain: (raw) => ({
      ...SCRIPT_NOT_FOUND,
      raw,
      scriptCodeHash: raw.match(NOT_FOUND_CODE_HASH_RE)?.[1],
    }),
  },
  { test: /Dead\(OutPoint/i, explain: fixed(INPUT_SPENT) },
  { test: /Unknown\(OutPoint|Resolve\(Unknown/i, explain: fixed(CELL_DEP_MISSING) },
  { test: /Immature|InvalidSince/i, explain: fixed(IMMATURE) },
  {
    test: /InsufficientCellCapacity|CapacityNotEnough|OutputsSumOverflow/i,
    explain: fixed(INSUFFICIENT_CAPACITY),
  },
  {
    test: /Duplicated\(Byte32|PoolRejectedDuplicatedTransaction/i,
    explain: fixed(DUPLICATED_TRANSACTION),
  },
  { test: /RBFRejected|MinFeeRate|PoolIsFull/i, explain: fixed(FEE_TOO_LOW) },
  // Wallet extensions share no error type; matching their wording is the only option.
  {
    test: /user (rejected|denied|cancell?ed)|rejected the request|declined/i,
    explain: fixed(WALLET_REJECTED),
  },
];

/**
 * Decode whatever a transaction attempt threw, or the `tx_status.reason` string a rejected
 * transaction carries.
 *
 * Accepts `unknown` deliberately: the CCC typed errors below only survive as objects, so callers
 * must hand over the thrown value itself, not `err.message`.
 */
export function decodeTxError(err: unknown, opts?: DecodeOptions): DecodedTxError {
  const raw = rawOf(err);

  // --- Structured path: CCC parses four node failures into typed classes before throwing, so
  // prefer those fields over re-deriving them from the string. See @ckb-ccc/core
  // client/jsonRpc/client.js ERROR_PARSERS.
  if (err instanceof ccc.ErrorClientVerification) {
    const decoded = scriptRejected(raw, opts);
    const cell = err.source === "outputType" ? "output" : "input";
    return {
      ...decoded,
      // exitCode stays the value re-parsed from `raw` — err.errorCode is unreliable, see
      // EXIT_CODE_RES above.
      scriptSource: err.source,
      scriptIndex: Number(err.sourceIndex),
      scriptCodeHash: err.scriptCodeHash,
      cause: `${decoded.cause} It ran as the ${SCRIPT_SOURCE_LABEL[err.source]} of ${cell} ${err.sourceIndex}.`,
    };
  }

  if (err instanceof ccc.ErrorClientResolveUnknown) {
    return {
      ...CELL_DEP_MISSING,
      raw,
      cause: `${CELL_DEP_MISSING.cause} Unresolved outpoint: ${err.outPoint.txHash}.`,
    };
  }

  if (err instanceof ccc.ErrorClientRBFRejected) {
    return {
      ...FEE_TOO_LOW,
      raw,
      title: "Fee too low to replace the earlier transaction",
      cause:
        `This transaction pays ${shannonToCKB(err.currentFee)} CKB in fees, but replacing the ` +
        `one already in the pool needs at least ${shannonToCKB(err.leastFee)} CKB.`,
      nextStep: "Raise the fee rate above that figure and rebuild.",
    };
  }

  if (err instanceof ccc.ErrorClientDuplicatedTransaction) {
    return {
      ...DUPLICATED_TRANSACTION,
      raw,
      cause: `${DUPLICATED_TRANSACTION.cause} Existing transaction: ${err.txHash}.`,
    };
  }

  // Built locally by CCC while completing the transaction, so these never reach the node. Both
  // mean "you don't have enough" but of different things, which matters to whoever is looking at
  // the page. (Previously `describeError` in useTokens.ts; the wording is carried over verbatim.)
  if (err instanceof ccc.ErrorTransactionInsufficientCoin) {
    return {
      kind: TxErrorKind.InsufficientCoin,
      raw,
      title: "Not enough of this token",
      cause: `Not enough of this token — short by ${err.amount} units`,
      nextStep: "Lower the amount, or acquire more of the token.",
    };
  }

  if (err instanceof ccc.ErrorTransactionInsufficientCapacity) {
    const forChange = err.isForChange ? " to create the change cell" : "";
    return {
      ...INSUFFICIENT_CAPACITY,
      raw,
      cause: `Not enough CKB — short by ${shannonToCKB(err.amount)} CKB${forChange}`,
      nextStep: err.isForChange
        ? "A change cell needs its own occupied capacity. Send a round number, or fund the wallet."
        : INSUFFICIENT_CAPACITY.nextStep,
    };
  }

  // Wallet rejection, checked structurally. The EIP-1193 code is standardised across wallets
  // while the message text is not — it varies per wallet and can be localised, so matching the
  // code is the only reliable test. Placed after the CCC branches so a node error can never be
  // mistaken for one on a numeric collision.
  if (isRecord(err) && err.code === EIP1193_USER_REJECTED) {
    return { ...WALLET_REJECTED, raw };
  }

  // --- Fallback path: regex over the raw string.
  for (const { test, explain } of RAW_MATCHERS) {
    if (test.test(raw)) return explain(raw, opts);
  }

  return {
    kind: TxErrorKind.Unknown,
    raw,
    title: "Transaction failed",
    // No invented explanation — an unrecognised failure degrades to exactly what the app showed
    // before this decoder existed, never to something misleading.
    cause: raw,
  };
}
