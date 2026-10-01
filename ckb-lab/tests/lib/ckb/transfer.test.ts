import { ccc } from "@ckb-ccc/core";
import { describe, expect, it } from "vitest";
import { minTransferCapacity } from "@/lib/ckb/transfer";

const lockWithArgs = (argsBytes: number): ccc.ScriptLike => ({
  codeHash: "0x" + "11".repeat(32),
  hashType: "type",
  args: "0x" + "22".repeat(argsBytes),
});

/**
 * The transfer floor is the recipient cell's occupied size, so it moves with the lock's args
 * length. The page used to hardcode 61 CKB, which under-reports for Omnilock recipients.
 */
describe("minTransferCapacity", () => {
  it("is 61 CKB for a secp256k1 lock (20-byte args)", () => {
    expect(minTransferCapacity(lockWithArgs(20))).toBe(ccc.fixedPointFrom(61));
  });

  it("is 63 CKB for an Omnilock lock (22-byte args, as MetaMask wallets use)", () => {
    expect(minTransferCapacity(lockWithArgs(22))).toBe(ccc.fixedPointFrom(63));
  });

  it("is 41 CKB for a lock with empty args", () => {
    expect(minTransferCapacity(lockWithArgs(0))).toBe(ccc.fixedPointFrom(41));
  });
});
