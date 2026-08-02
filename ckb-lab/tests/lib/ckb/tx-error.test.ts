import { describe, expect, it } from "vitest";
import { ccc } from "@ckb-ccc/core";
import { COUNTER_EXIT_CODES } from "@/lib/ckb/counter";
import { decodeTxError, TxErrorKind } from "@/lib/ckb/tx-error";

/**
 * Realistic node strings. Shapes taken from CKB's own Display impls and from the regexes
 * @ckb-ccc/core matches against in `client/jsonRpc/client.js` ERROR_PARSERS.
 */
const RAW = {
  /** secp256k1 lock rejecting — a NEGATIVE, two-character exit code. */
  verificationNegative:
    "TransactionFailedToVerify: Verification(Error { kind: Script, inner: " +
    "TransactionScriptError { source: Inputs[0].Lock, cause: ValidationFailure: see error code " +
    "-31 on page https://nervosnetwork.github.io/ckb-script-error-codes/by-data-hash/0xab.html " +
    "for more details })",
  /** The counter's type script rejecting an increment that did not increment. */
  verificationCounter:
    "TransactionFailedToVerify: Verification(Error { kind: Script, inner: " +
    "TransactionScriptError { source: Outputs[0].Type, cause: ValidationFailure: see error code " +
    "8 on page https://nervosnetwork.github.io/ckb-script-error-codes/by-type-hash/0xcd.html " +
    "for more details })",
  /** Older CKB nodes print the code inline instead of linking to the page. */
  verificationLegacy: "TransactionFailedToVerify: ValidationFailure(-31)",
  scriptNotFound:
    "TransactionFailedToVerify: Verification(Error { kind: Script, inner: " +
    "TransactionScriptError { source: Outputs[0].Type, cause: ScriptNotFound })",
  invalidInstruction:
    "TransactionFailedToVerify: Verification(Error { kind: Script, inner: " +
    "TransactionScriptError { source: Inputs[0].Lock, cause: VM Internal Error: " +
    "InvalidInstruction(0x2f) })",
  dead: "TransactionFailedToResolve: Resolve(Dead(OutPoint(0xabc)))",
  unknownOutPoint: "TransactionFailedToResolve: Resolve(Unknown(OutPoint(0xabc)))",
  immature: "TransactionFailedToVerify: Verification(Error { kind: Transaction, inner: Immature })",
  capacity:
    "TransactionFailedToVerify: Verification(Error { kind: Transaction, inner: " +
    "InsufficientCellCapacity })",
  duplicated: "PoolRejectedDuplicatedTransaction: Duplicated(Byte32(0xabc))",
  minFeeRate: "PoolRejectedTransactionByMinFeeRate: min fee rate not met",
  unrecognised: "SomethingCkbHasNeverEmitted: wat",
} as const;

describe("decodeTxError — script rejections", () => {
  it("carries a negative, multi-digit exit code through intact", () => {
    // Regression guard. CCC's own parser captures this with `(-?[0-9])*`, a repeated
    // SINGLE-character group, so it reports -31 as 1. If this ever asserts 1, the decoder has
    // started trusting ErrorClientVerification.errorCode again. See .context/processes/gotchas.md.
    const d = decodeTxError(RAW.verificationNegative);
    expect(d.kind).toBe(TxErrorKind.ScriptRejected);
    expect(d.exitCode).toBe(-31);
  });

  it("reads the code from the legacy ValidationFailure(n) spelling too", () => {
    expect(decodeTxError(RAW.verificationLegacy).exitCode).toBe(-31);
  });

  it("names the meaning when the caller supplies a map for that contract", () => {
    const d = decodeTxError(RAW.verificationCounter, {
      exitCodes: COUNTER_EXIT_CODES,
      scriptLabel: "counter",
    });
    expect(d.exitCode).toBe(8);
    expect(d.exitCodeMeaning).toBe(COUNTER_EXIT_CODES[8]);
    expect(d.cause).toContain(COUNTER_EXIT_CODES[8]);
  });

  it("refuses to invent a meaning when no map is supplied", () => {
    // /invoke's case: an arbitrary script's code 8 means nothing to us, and saying otherwise
    // would be a confident lie. The number is shown; the meaning is not.
    const d = decodeTxError(RAW.verificationCounter);
    expect(d.exitCode).toBe(8);
    expect(d.exitCodeMeaning).toBeUndefined();
    expect(d.cause).toContain("defined by the contract");
    expect(d.cause).not.toContain(COUNTER_EXIT_CODES[8]);
  });

  it("does not apply a map entry that the failing code has no key for", () => {
    const d = decodeTxError(RAW.verificationNegative, { exitCodes: COUNTER_EXIT_CODES });
    expect(d.exitCode).toBe(-31);
    expect(d.exitCodeMeaning).toBeUndefined();
  });

  it("keeps the node's error-code reference page when it gives one", () => {
    expect(decodeTxError(RAW.verificationCounter).referenceUrl).toBe(
      "https://nervosnetwork.github.io/ckb-script-error-codes/by-type-hash/0xcd.html"
    );
    expect(decodeTxError(RAW.verificationLegacy).referenceUrl).toBeUndefined();
  });
});

describe("decodeTxError — the exit-code map only describes the caller's own script", () => {
  const COUNTER_OPTS = { exitCodes: COUNTER_EXIT_CODES, scriptLabel: "counter" };

  /** Same exit code 5, but the LOCK returned it — the wallet's script, not the caller's. */
  const lockFailedWithCode5 =
    "Verification(Error { kind: Script, inner: TransactionScriptError { source: Inputs[0].Lock, " +
    "cause: ValidationFailure: see error code 5 on page " +
    "https://nervosnetwork.github.io/ckb-script-error-codes/by-data-hash/0xab.html })";

  it("withholds the map when the failing script is the lock", () => {
    // The collision is real in this very repo: lesson-08-hash-lock defines 5 as
    // ERROR_INVALID_ARGS_LENGTH while lesson-10-counter defines 5 as "data is not 8 bytes", and
    // both can run in one transaction. Attributing a lock's 5 to the counter is the confident lie
    // this module exists to avoid.
    const d = decodeTxError(lockFailedWithCode5, COUNTER_OPTS);
    expect(d.exitCode).toBe(5);
    expect(d.exitCodeMeaning).toBeUndefined();
    expect(d.cause).not.toContain(COUNTER_EXIT_CODES[5]);
    expect(d.cause).not.toContain("counter");
    expect(d.cause).toContain("lock script");
  });

  it("applies the map when the failing script is a type script", () => {
    const d = decodeTxError(RAW.verificationCounter, COUNTER_OPTS);
    expect(d.exitCodeMeaning).toBe(COUNTER_EXIT_CODES[8]);
    expect(d.cause).toContain("counter");
  });

  it("withholds the map when the node does not say which script failed", () => {
    // Withholding beats guessing: the legacy spelling carries no `source:` field.
    const d = decodeTxError("ValidationFailure(8)", COUNTER_OPTS);
    expect(d.exitCode).toBe(8);
    expect(d.exitCodeMeaning).toBeUndefined();
  });

  it("reports the failing script's source and index from the raw string alone", () => {
    // Previously only the CCC-typed path knew this; now the plain-string path does too, which is
    // what the polling loop's tx_status.reason goes through.
    const d = decodeTxError(lockFailedWithCode5);
    expect(d.scriptSource).toBe("lock");
    expect(d.scriptIndex).toBe(0);
  });

  it("does not run the exit code and the location together into one sentence", () => {
    const d = decodeTxError(RAW.verificationCounter, COUNTER_OPTS);
    expect(d.cause).not.toMatch(/plus 1 It ran/);
    expect(d.cause).toContain("plus 1. It ran");
  });
});

describe("decodeTxError — VM aborts are not all the atomics bug", () => {
  it.each(["MemOutOfBound", "MaxCycleExceeded", "InvalidPermission", "OutOfBound"])(
    "does not prescribe -C target-feature=-a for %s",
    (variant) => {
      // `VM Internal Error: {0:?}` is ckb-script's prefix for the whole ckb_vm::Error enum. Only
      // the InvalidInstruction variant is the riscv64imac atomics story; telling someone with an
      // out-of-bounds read to rebuild for a target feature they never used is a confident wrong fix.
      const d = decodeTxError(`VM Internal Error: ${variant}`);
      expect(d.nextStep).not.toContain("target-feature");
      expect(d.cause).not.toContain("atomics");
    }
  );

  it("still gives the atomics explanation for InvalidInstruction itself", () => {
    const d = decodeTxError(RAW.invalidInstruction);
    expect(d.nextStep).toContain("target-feature=-a");
    expect(d.cause).toContain("atomics");
  });
});

describe("decodeTxError — CCC typed errors", () => {
  it("takes source, index and code hash off ErrorClientVerification", () => {
    const err = new ccc.ErrorClientVerification(
      { message: "x", data: RAW.verificationCounter },
      "outputType",
      0,
      // CCC's own (wrong) reading of the code. The decoder must ignore this field entirely.
      999,
      "type",
      `0x${"cd".repeat(32)}`
    );
    const d = decodeTxError(err);
    expect(d.kind).toBe(TxErrorKind.ScriptRejected);
    expect(d.scriptSource).toBe("outputType");
    expect(d.scriptIndex).toBe(0);
    expect(d.scriptCodeHash).toBe(`0x${"cd".repeat(32)}`);
    expect(d.exitCode).toBe(8); // re-parsed from `raw`, not the 999 CCC handed over
    expect(d.cause).toContain("output 0");
  });

  it("prefers ErrorClientBase.data over the wrapped message", () => {
    // `message` is prefixed with "Client request error", which is CCC's wording, not the node's.
    const err = new ccc.ErrorClientBase({ message: "wrapped", data: RAW.dead });
    expect(decodeTxError(err).raw).toBe(RAW.dead);
  });

  it("does NOT prefer .data on the two CCC builds locally, where it is a JSON blob", () => {
    // ErrorClientMaxFeeRateExceeded is reachable from the fee-rate input on /deploy, /tokens and
    // /counter. Its `data` is `{"limit":"…","actual":"…"}`, so preferring it replaced a readable
    // sentence with a blob — strictly worse than what the app showed before the decoder existed.
    const err = new ccc.ErrorClientMaxFeeRateExceeded(10_000_000n, 20_000_000n);
    const d = decodeTxError(err);
    expect(d.raw).not.toMatch(/^\{/);
    expect(d.raw).toContain("Max fee rate exceeded");
    expect(d.kind).toBe(TxErrorKind.FeeTooLow);
    expect(d.nextStep).toContain("Lower the fee rate");
  });

  it("keeps the timeout message readable too", () => {
    const d = decodeTxError(new ccc.ErrorClientWaitTransactionTimeout(5000));
    expect(d.raw).not.toMatch(/^\{/);
    expect(d.raw).toContain("timeout");
  });

  it("reports the unresolved outpoint from ErrorClientResolveUnknown", () => {
    const txHash = `0x${"11".repeat(32)}` as const;
    const err = new ccc.ErrorClientResolveUnknown(
      { message: "x", data: RAW.unknownOutPoint },
      { txHash, index: 0 }
    );
    const d = decodeTxError(err);
    expect(d.kind).toBe(TxErrorKind.CellDepMissing);
    expect(d.cause).toContain(txHash);
  });

  it("formats both RBF fees as CKB rather than shannons", () => {
    const err = new ccc.ErrorClientRBFRejected(
      { message: "x", data: "RBFRejected" },
      1_0000_0000n,
      2_5000_0000n
    );
    const d = decodeTxError(err);
    expect(d.kind).toBe(TxErrorKind.FeeTooLow);
    expect(d.cause).toContain("1 CKB");
    expect(d.cause).toContain("2.5 CKB");
  });

  it("separates being short of CKB from being short of the token", () => {
    const coin = decodeTxError(
      new ccc.ErrorTransactionInsufficientCoin(500n, {
        codeHash: `0x${"22".repeat(32)}`,
        hashType: "type",
        args: "0x",
      })
    );
    expect(coin.kind).toBe(TxErrorKind.InsufficientCoin);
    expect(coin.cause).toBe("Not enough of this token — short by 500 units");

    const capacity = decodeTxError(
      new ccc.ErrorTransactionInsufficientCapacity(61_0000_0000n, { isForChange: true })
    );
    expect(capacity.kind).toBe(TxErrorKind.InsufficientCapacity);
    expect(capacity.cause).toBe("Not enough CKB — short by 61 CKB to create the change cell");
  });
});

describe("decodeTxError — raw string matchers", () => {
  it.each([
    [RAW.invalidInstruction, TxErrorKind.InvalidInstruction],
    [RAW.scriptNotFound, TxErrorKind.ScriptNotFound],
    [RAW.dead, TxErrorKind.InputSpent],
    [RAW.unknownOutPoint, TxErrorKind.CellDepMissing],
    [RAW.immature, TxErrorKind.Immature],
    [RAW.capacity, TxErrorKind.InsufficientCapacity],
    [RAW.duplicated, TxErrorKind.DuplicatedTransaction],
    [RAW.minFeeRate, TxErrorKind.FeeTooLow],
    ["User rejected the request.", TxErrorKind.WalletRejected],
  ])("classifies %s", (raw, kind) => {
    expect(decodeTxError(raw).kind).toBe(kind);
  });

  it("reports InvalidInstruction as itself, not as a resolution problem", () => {
    // The riscv64imac atomics failure (issue #34) looks like ScriptNotFound and is not one.
    // Matcher order is what keeps these apart, so this is an ordering test, not a duplicate.
    const d = decodeTxError(RAW.invalidInstruction);
    expect(d.kind).toBe(TxErrorKind.InvalidInstruction);
    expect(d.nextStep).toContain("target-feature=-a");
  });

  it("does not claim 'nothing reached the node' from a bare 'declined'", () => {
    // The wallet entry asserts no CKB moved. A node-side message containing "declined" must not
    // be able to make that claim — a false Unknown is recoverable, a false statement about chain
    // state is not.
    const d = decodeTxError("The transaction was declined by the pool");
    expect(d.kind).not.toBe(TxErrorKind.WalletRejected);
  });

  it("does not send someone to wait out a malformed `since`", () => {
    // InvalidSince means the since VALUE is wrong, which waiting can never fix — but IMMATURE's
    // next step is "wait for the maturity window".
    const d = decodeTxError("Verification(Error { kind: Transaction, inner: InvalidSince })");
    expect(d.kind).not.toBe(TxErrorKind.Immature);
  });

  it("covers a dead cell dep, not only a dead input", () => {
    // CKB reports a consumed script cell with the same Resolve(Dead(OutPoint(…))) as a consumed
    // input, and the two need different fixes.
    const d = decodeTxError(RAW.dead);
    expect(d.kind).toBe(TxErrorKind.InputSpent);
    expect(d.cause).toContain("cell dep");
    expect(d.nextStep).toContain("deployed again");
  });

  it("puts the unresolved code_hash in the sentence, not just the object", () => {
    const raw =
      "TransactionScriptError { source: Outputs[0].Type, cause: ScriptNotFound: code_hash: " +
      "Byte32(0xd1f0085e267991055fb3e16ff95d74df429aa3124e6f5439995b496a3b8edcdd) }";
    const d = decodeTxError(raw);
    expect(d.scriptCodeHash).toBe(
      "0xd1f0085e267991055fb3e16ff95d74df429aa3124e6f5439995b496a3b8edcdd"
    );
    expect(d.cause).toContain("0xd1f0085e267991055fb3e16ff95d74df429aa3124e6f5439995b496a3b8edcdd");
  });

  it("falls back to the raw string rather than guessing", () => {
    const d = decodeTxError(RAW.unrecognised);
    expect(d.kind).toBe(TxErrorKind.Unknown);
    // An unrecognised failure must degrade to exactly what the app showed before the decoder
    // existed — never to something invented.
    expect(d.cause).toBe(RAW.unrecognised);
    expect(d.nextStep).toBeUndefined();
  });
});

describe("decodeTxError — invariants", () => {
  const everyInput: unknown[] = [
    ...Object.values(RAW),
    new Error(RAW.dead),
    new ccc.ErrorClientBase({ message: "x", data: RAW.capacity }),
    new ccc.ErrorTransactionInsufficientCapacity(1n, {}),
  ];

  it.each(everyInput.map((e, i) => [i, e]))(
    "always decodes to something usable: input %i",
    (_i, err) => {
      // The decoder augments the node's message and never replaces it. Every other guarantee in
      // this file is about added meaning; this one is about not losing the source of truth, and
      // about never handing the UI an empty headline to render.
      const d = decodeTxError(err);
      expect(d.raw).not.toBe("");
      expect(d.title.length).toBeGreaterThan(0);
      expect(d.cause.length).toBeGreaterThan(0);
    }
  );

  it("handles a thrown non-Error without crashing", () => {
    expect(decodeTxError(undefined).kind).toBe(TxErrorKind.Unknown);
    expect(decodeTxError({ nope: true }).kind).toBe(TxErrorKind.Unknown);
  });
});

describe("decodeTxError — wallet extensions throw plain objects, not Errors", () => {
  /** Captured verbatim from MetaMask on testnet, trimmed of its (very long) stack. */
  const metaMaskRejection = {
    code: 4001,
    message: "User rejected the request.",
    data: { location: "confirmation", cause: null },
    stack: "Error: User rejected the request.\n    at new i (chrome-extension://…)",
  };

  it("does not render a thrown object as [object Object]", () => {
    // Regression: `rawOf` fell through to String(err) for anything that was not an Error, a
    // string, or a CCC error — and every browser wallet throws a plain object. The banner showed
    // "[object Object]" as the whole explanation.
    const d = decodeTxError(metaMaskRejection);
    expect(d.raw).toBe("User rejected the request.");
    expect(d.raw).not.toContain("[object Object]");
    expect(d.cause).not.toContain("[object Object]");
  });

  it("classifies it from the EIP-1193 code, not the wording", () => {
    expect(decodeTxError(metaMaskRejection).kind).toBe(TxErrorKind.WalletRejected);
  });

  it("still classifies a 4001 whose message is localised or absent", () => {
    // The code is standardised; the text is not. A Vietnamese or Korean wallet build must not
    // fall through to Unknown just because the English phrase is missing.
    expect(decodeTxError({ code: 4001, message: "Người dùng đã từ chối yêu cầu." }).kind).toBe(
      TxErrorKind.WalletRejected
    );
    expect(decodeTxError({ code: 4001 }).kind).toBe(TxErrorKind.WalletRejected);
  });

  it("does not treat a non-4001 wallet error as a rejection", () => {
    // 4100 is "unauthorized", 4900 "disconnected" — different problems with different fixes.
    expect(
      decodeTxError({ code: 4100, message: "The requested account is not authorized." }).kind
    ).toBe(TxErrorKind.Unknown);
  });
});

describe("decodeTxError — formats captured from a real node", () => {
  // These differ from the constructed fixtures above in ways that would have broken a stricter
  // matcher. Kept verbatim so a future tightening of the regexes has to stay compatible with
  // what CKB actually emits, not with what I assumed it emits.
  it.each([
    [
      "InvalidInstruction carries a struct, not a hex argument",
      "Verification(Error { kind: Script, inner: TransactionScriptError { source: Outputs[0].Type, " +
        "cause: VM Internal Error: InvalidInstruction { pc: 85546, instruction: 336213423 } } })",
      TxErrorKind.InvalidInstruction,
    ],
  ])("%s", (_name, raw, kind) => {
    expect(decodeTxError(raw).kind).toBe(kind);
  });
});

describe("decodeTxError — ScriptNotFound names the script", () => {
  /** Captured verbatim from a CKB devnet node. */
  const raw =
    "Verification(Error { kind: Script, inner: TransactionScriptError { source: Outputs[0].Type, " +
    "cause: ScriptNotFound: code_hash: " +
    "Byte32(0xd1f0085e267991055fb3e16ff95d74df429aa3124e6f5439995b496a3b8edcdd) } })";

  it("extracts the code_hash the node could not resolve", () => {
    const d = decodeTxError(raw);
    expect(d.kind).toBe(TxErrorKind.ScriptNotFound);
    expect(d.scriptCodeHash).toBe(
      "0xd1f0085e267991055fb3e16ff95d74df429aa3124e6f5439995b496a3b8edcdd"
    );
  });

  it("still decodes when the node gives no code_hash", () => {
    const d = decodeTxError(RAW.scriptNotFound);
    expect(d.kind).toBe(TxErrorKind.ScriptNotFound);
    expect(d.scriptCodeHash).toBeUndefined();
  });
});
