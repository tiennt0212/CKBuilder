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

/** `source: Inputs[0].Lock` / `source: Outputs[0].Type` — which script group the node was running. */
const SCRIPT_SOURCE_RE = /source:\s*(Inputs|Outputs)\[(\d+)\]\.(Lock|Type)/;

function scriptSourceFrom(raw: string): { source: ScriptSource; index: number } | undefined {
  const m = raw.match(SCRIPT_SOURCE_RE);
  if (!m) return undefined;
  const source: ScriptSource =
    m[3] === "Lock" ? "lock" : m[1] === "Inputs" ? "inputType" : "outputType";
  return { source, index: Number(m[2]) };
}

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
  // Two ErrorClientBase subclasses are built by CCC locally rather than from a node reply, and
  // put a JSON payload in `data` (`{"limit":"…","actual":"…"}`). Preferring `data` for those
  // would replace a readable sentence with a blob — worse than showing nothing.
  if (
    err instanceof ccc.ErrorClientMaxFeeRateExceeded ||
    err instanceof ccc.ErrorClientWaitTransactionTimeout
  ) {
    return err.message;
  }
  // Everything else from the JSON-RPC layer carries the node's untouched string in `data`, while
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
  const from = scriptSourceFrom(raw);

  // The caller's map describes the contract IT attached, which is always a type script — the lock
  // belongs to the wallet and the page knows nothing about it. Applying the map to a lock failure
  // would be exactly the confident lie this module exists to avoid, and it is not hypothetical:
  // lesson-08-hash-lock and lesson-10-counter both define exit codes 5-8 with entirely different
  // meanings, and both can run in the same transaction. When the node does not say which script
  // failed, withhold the map rather than guess.
  const isCallersScript = from !== undefined && from.source !== "lock";
  const meaning =
    isCallersScript && exitCode !== undefined ? opts?.exitCodes?.[exitCode] : undefined;

  const label = !isCallersScript
    ? from?.source === "lock"
      ? "The lock script"
      : "The script"
    : opts?.scriptLabel
      ? `The ${opts.scriptLabel} script`
      : "The script";

  const where = from
    ? ` It ran as the ${from.source === "lock" ? "lock" : "type"} script of ` +
      `${from.source === "outputType" ? "output" : "input"} ${from.index}.`
    : "";

  const cause =
    exitCode === undefined
      ? `${label} returned non-zero, but the node did not report which exit code.${where}`
      : meaning
        ? `${label} returned exit code ${exitCode}: ${meaning}.${where}`
        : `${label} returned exit code ${exitCode}. Exit codes are defined by the contract, ` +
          `not by CKB, so this number only has meaning against that script's own source.${where}`;

  return {
    kind: TxErrorKind.ScriptRejected,
    raw,
    title: "Script rejected the transaction",
    cause,
    exitCode,
    exitCodeMeaning: meaning,
    scriptSource: from?.source,
    scriptIndex: from?.index,
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

/**
 * `VM Internal Error: {0:?}` is ckb-script's shared prefix for the WHOLE `ckb_vm::Error` enum —
 * MemOutOfBound, MaxCycleExceeded, InvalidPermission and more. Only the InvalidInstruction
 * variant is the atomics story above, so everything else gets this deliberately vaguer entry.
 * Naming a specific fix here would send someone to rebuild for a target feature they never used.
 */
const VM_INTERNAL_ERROR: Explanation = {
  kind: TxErrorKind.InvalidInstruction,
  title: "CKB-VM stopped executing the script",
  cause:
    "The VM aborted before the script could return a value, so there is no exit code — this is " +
    "the VM refusing to run the binary, not the contract rejecting the transaction. The variant " +
    "named in the node message says which limit or rule was broken.",
  nextStep:
    "Read the variant in the node message below: it distinguishes a memory fault from a cycle " +
    "limit from a bad instruction, and each has a different fix.",
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
  title: "A cell this transaction references is already spent",
  // Deliberately covers both an input and a cell dep: CKB reports a consumed script cell with the
  // same Resolve(Dead(OutPoint(…))) as a consumed input, and the two need different fixes. Naming
  // only the input case would send someone to rebuild a transaction whose script cell is gone.
  cause:
    "One of the cells this transaction points at no longer exists on chain — something else " +
    "spent it first. Cells are consumed whole, so a stale local copy of one is enough to cause " +
    "this. It may be an input, or the cell dep holding a deployed script.",
  nextStep:
    "If it is an input, re-read the cell from chain and rebuild. If the outpoint is a deployed " +
    "script's cell dep, that script was destroyed and must be deployed again.",
};

const MAX_FEE_RATE: Explanation = {
  kind: TxErrorKind.FeeTooLow,
  title: "Fee rate above the safety limit",
  cause:
    "CCC refused to broadcast because the computed fee exceeds its maximum fee rate. This is a " +
    "client-side guard against overpaying, not a node rejection — nothing was sent.",
  nextStep: "Lower the fee rate on the form.",
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
  // problem, and matching it first is what stops it being reported as one. The specific variant
  // must also be tested before the generic "VM Internal Error" prefix below it.
  { test: /InvalidInstruction/i, explain: fixed(INVALID_INSTRUCTION) },
  { test: /VM Internal Error/i, explain: fixed(VM_INTERNAL_ERROR) },
  { test: /ValidationFailure/i, explain: scriptRejected },
  {
    test: /ScriptNotFound|script not found/i,
    // Newer nodes name the code_hash they could not resolve, which is the value the reader
    // compares against their registry entry — so put it in the sentence, not just the object.
    explain: (raw) => {
      const codeHash = raw.match(NOT_FOUND_CODE_HASH_RE)?.[1];
      return {
        ...SCRIPT_NOT_FOUND,
        raw,
        scriptCodeHash: codeHash,
        cause: codeHash
          ? `${SCRIPT_NOT_FOUND.cause} Unresolved code_hash: ${codeHash}.`
          : SCRIPT_NOT_FOUND.cause,
      };
    },
  },
  { test: /Dead\(OutPoint/i, explain: fixed(INPUT_SPENT) },
  { test: /Unknown\(OutPoint|Resolve\(Unknown/i, explain: fixed(CELL_DEP_MISSING) },
  // `InvalidSince` deliberately excluded: it means the `since` VALUE is malformed, which waiting
  // can never fix, and IMMATURE's next step is "wait". No builder here sets `since` yet.
  { test: /Immature/i, explain: fixed(IMMATURE) },
  {
    test: /InsufficientCellCapacity|CapacityNotEnough|OutputsSumOverflow/i,
    explain: fixed(INSUFFICIENT_CAPACITY),
  },
  {
    test: /Duplicated\(Byte32|PoolRejectedDuplicatedTransaction/i,
    explain: fixed(DUPLICATED_TRANSACTION),
  },
  { test: /Max fee rate exceeded/i, explain: fixed(MAX_FEE_RATE) },
  { test: /RBFRejected|MinFeeRate|PoolIsFull/i, explain: fixed(FEE_TOO_LOW) },
  // Last resort for wallets that throw an Error instead of an EIP-1193 object, so the structured
  // `code === 4001` check in decodeTxError could not fire. Kept tight on purpose: this entry
  // asserts "nothing reached the node", and a bare /declined/ would let a node-side message claim
  // that. A false Unknown is recoverable; a false statement about chain state is not.
  {
    test: /\buser (rejected|denied|cancell?ed)\b|\brejected the request\b/i,
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
    return {
      // `scriptRejected` already derives source, index and the sentence from `raw`, and gates the
      // caller's exit-code map on them. Only `scriptCodeHash` is worth taking from the class:
      // exitCode is re-parsed (err.errorCode is unreliable, see EXIT_CODE_RES) and the rest agrees.
      ...scriptRejected(raw, opts),
      scriptCodeHash: err.scriptCodeHash,
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
