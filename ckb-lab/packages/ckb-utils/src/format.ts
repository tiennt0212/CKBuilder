import { ccc } from "@ckb-ccc/core";

export function shannonToCKB(shannon: bigint): string {
  const ckb = Number(shannon) / 10 ** 8;
  return ckb.toFixed(8).replace(/\.?0+$/, "");
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
  const bytes = new Uint8Array(
    clean.match(/.{2}/g)!.map((b) => parseInt(b, 16))
  );
  return new TextDecoder().decode(bytes);
}

export function truncateAddress(address: string, chars = 8): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function formatCapacity(capacity: ccc.Num): string {
  return shannonToCKB(BigInt(capacity.toString()));
}
