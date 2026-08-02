import { describe, expect, it } from "vitest";
import { COUNTER_EXIT_CODES, decodeCounterData, encodeCounterData } from "@/lib/ckb/counter";

/**
 * The counter cell's whole on-chain state is 8 raw bytes, little-endian u64 — no molecule, no
 * header. The contract (`contracts/lesson-10-counter/src/main.rs` `parse_counter`) rejects any
 * other length with exit code 5, so the codec here and the contract there have to agree exactly.
 */
describe("counter data codec", () => {
  it.each([
    [0n, "0x0000000000000000"],
    [1n, "0x0100000000000000"],
    [256n, "0x0001000000000000"],
    [2n ** 64n - 1n, "0xffffffffffffffff"],
  ])("encodes %s little-endian", (count, hex) => {
    expect(encodeCounterData(count)).toBe(hex);
  });

  it.each([0n, 1n, 42n, 2n ** 53n, 2n ** 64n - 1n])("round-trips %s", (count) => {
    expect(decodeCounterData(encodeCounterData(count))).toBe(count);
  });

  it("survives values past Number.MAX_SAFE_INTEGER", () => {
    // The reason the store persists this as a decimal string: JSON.stringify throws on bigint,
    // and a u64 past 2^53 does not survive a JS number.
    const big = 9_007_199_254_740_993n; // 2^53 + 1
    expect(decodeCounterData(encodeCounterData(big))).toBe(big);
  });

  it.each([
    ["0x", 0],
    ["0x00", 1],
    ["0x0100000000000000ff", 9],
  ])("rejects %s — %i bytes, not 8", (hex, length) => {
    expect(() => decodeCounterData(hex)).toThrow(`got ${length}`);
  });
});

describe("COUNTER_EXIT_CODES", () => {
  it("covers exactly the codes the contract defines", () => {
    // Mirrors ERROR_INVALID_DATA_LENGTH (5) through ERROR_COUNTER_NOT_INCREMENTED (8) in
    // contracts/lesson-10-counter/src/main.rs. If the contract gains a code and this map does
    // not, /counter silently falls back to showing a bare number.
    expect(Object.keys(COUNTER_EXIT_CODES).map(Number).sort()).toEqual([5, 6, 7, 8]);
  });

  it("never claims 0, which is success rather than a rejection", () => {
    expect(COUNTER_EXIT_CODES[0]).toBeUndefined();
  });
});
