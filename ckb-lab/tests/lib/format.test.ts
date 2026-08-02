import { describe, expect, it } from "vitest";
import { ckbToShannons, shannonToCKB } from "@/lib/format";

/** 1 CKB = 10^8 shannons. Every figure the user reads crosses this boundary. */
const CKB = 100_000_000n;

describe("shannonToCKB", () => {
  it.each([
    [0n, "0"],
    [CKB, "1"],
    [61n * CKB, "61"],
    [CKB / 2n, "0.5"],
    [1n, "0.00000001"], // one shannon — the smallest representable amount
    [-CKB, "-1"],
    [-1n, "-0.00000001"],
  ])("formats %s shannons as %s", (shannon, expected) => {
    expect(shannonToCKB(shannon)).toBe(expected);
  });

  it("strips trailing zeros but never the integer part", () => {
    expect(shannonToCKB(150_000_000n)).toBe("1.5");
    expect(shannonToCKB(100_000_010n)).toBe("1.0000001");
  });

  it("does not lose precision past Number.MAX_SAFE_INTEGER", () => {
    // The whole reason these are bigint: a mainnet-scale balance in shannons overflows a JS
    // number, and CKB's own supply is well past 2^53.
    expect(shannonToCKB(33_600_000_000_000_000n)).toBe("336000000");
  });
});

describe("ckbToShannons", () => {
  it.each([
    ["0", 0n],
    ["1", CKB],
    ["0.5", CKB / 2n],
    ["0.00000001", 1n],
    ["336000000", 33_600_000_000_000_000n],
  ])("parses %s CKB as %s shannons", (ckb, expected) => {
    expect(ckbToShannons(ckb)).toBe(expected);
  });

  it("truncates beyond 8 decimals rather than rounding", () => {
    // A shannon is indivisible, so there is nothing below the 8th place to round into.
    expect(ckbToShannons("1.123456789")).toBe(112_345_678n);
  });

  it("pads a short decimal to the full 8 places", () => {
    expect(ckbToShannons("1.5")).toBe(150_000_000n);
    expect(ckbToShannons("1.")).toBe(CKB);
  });
});

describe("round trip", () => {
  it.each(["0", "1", "0.5", "61", "0.00000001", "336000000", "1.0000001"])(
    "survives %s CKB → shannons → CKB",
    (ckb) => {
      expect(shannonToCKB(ckbToShannons(ckb))).toBe(ckb);
    }
  );
});
