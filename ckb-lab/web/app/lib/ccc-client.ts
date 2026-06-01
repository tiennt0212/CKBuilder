import { ccc, CellDepInfoLike, KnownScript, Script } from "@ckb-ccc/core";

export type Network = "devnet" | "testnet" | "mainnet";

export type ScriptInfo = Pick<Script, "codeHash" | "hashType"> & {
  cellDeps: CellDepInfoLike[];
};

// Devnet scripts from offCKB system-scripts.json
// Update this when deploying to a new devnet
export const DEVNET_SCRIPTS: Record<string, ScriptInfo> = {
  [KnownScript.Secp256k1Blake160]: {
    codeHash:
      "0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8",
    hashType: "type",
    cellDeps: [
      {
        cellDep: {
          outPoint: {
            txHash:
              "0x71a7ba8fc96349fea0ed3a5c47992e3b4084b031a42264a018e0072e8172e46c",
            index: 0,
          },
          depType: "depGroup",
        },
      },
    ],
  },
  [KnownScript.XUdt]: {
    codeHash:
      "0x50bd8d6680b8b9cf98b73f3c08faf8b9a21914bd03b94c17f197ef5b6a1c18ba",
    hashType: "data1",
    cellDeps: [
      {
        cellDep: {
          outPoint: {
            txHash:
              "0xc07844ce21b38e4b071dd0e1ee3b0e27afd8d7532491327f39b786343f558ab7",
            index: 0,
          },
          depType: "code",
        },
      },
    ],
  },
} as Record<string, ScriptInfo>;

export function buildCccClient(network: Network): ccc.Client {
  if (network === "mainnet") {
    return new ccc.ClientPublicMainnet();
  }
  if (network === "testnet") {
    return new ccc.ClientPublicTestnet();
  }
  // devnet — offCKB proxy
  return new ccc.ClientPublicTestnet({
    url: "http://localhost:28114",
    scripts: DEVNET_SCRIPTS as any,
  });
}

export function readEnvNetwork(): Network {
  const network =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_NETWORK
      : undefined;
  if (!network || !["devnet", "testnet", "mainnet"].includes(network)) {
    return "testnet";
  }
  return network as Network;
}
