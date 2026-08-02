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
    "keeps the node's verbatim message on input %i",
    (_i, err) => {
      // The decoder augments the node's message and never replaces it. Every other guarantee in
      // this file is about added meaning; this one is about not losing the source of truth.
      expect(decodeTxError(err).raw).not.toBe("");
    }
  );

  it.each(everyInput.map((e, i) => [i, e]))(
    "always yields a title and a cause on input %i",
    (_i, err) => {
      const d = decodeTxError(err);
      expect(d.title.length).toBeGreaterThan(0);
      expect(d.cause.length).toBeGreaterThan(0);
    }
  );

  it("handles a thrown non-Error without crashing", () => {
    expect(decodeTxError(undefined).kind).toBe(TxErrorKind.Unknown);
    expect(decodeTxError({ nope: true }).kind).toBe(TxErrorKind.Unknown);
  });
});
