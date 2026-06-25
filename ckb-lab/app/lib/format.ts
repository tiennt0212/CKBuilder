import { ccc } from "@ckb-ccc/core";

export function shannonToCKB(shannon: bigint): string {
  const sign = shannon < 0n ? "-" : "";
  const abs = shannon < 0n ? -shannon : shannon;
  const integer = abs / 100_000_000n;
  const fraction = (abs % 100_000_000n).toString().padStart(8, "0").replace(/0+$/, "");
  return fraction ? `${sign}${integer}.${fraction}` : `${sign}${integer}`;
}

export function ckbToShannons(ckb: string): bigint {
  const [integer = "0", decimal = ""] = ckb.split(".");
  const paddedDecimal = decimal.padEnd(8, "0").slice(0, 8);
  return BigInt(integer) * 100_000_000n + BigInt(paddedDecimal);
}

export function utf8ToHex(str: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  return (
    "0x" +
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}

export function hexToUtf8(hex: string): string {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (clean.length === 0) return "";
  const bytes = new Uint8Array(clean.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
  return new TextDecoder().decode(bytes);
}

export function truncateAddress(address: string, chars = 8): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function formatCapacity(capacity: ccc.Num): string {
  return shannonToCKB(BigInt(capacity.toString()));
}
