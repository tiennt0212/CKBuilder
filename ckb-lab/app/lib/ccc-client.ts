import { ccc, CellDepInfoLike, KnownScript, Script } from "@ckb-ccc/core";
import { TESTNET_SCRIPTS } from "@ckb-ccc/core/advanced";

export const Network = {
  Devnet: "devnet",
  Testnet: "testnet",
  Mainnet: "mainnet",
} as const;
export type Network = (typeof Network)[keyof typeof Network];
export const NETWORKS = Object.values(Network) as Network[];

export type ScriptInfo = Pick<Script, "codeHash" | "hashType"> & {
  cellDeps: CellDepInfoLike[];
};

// Devnet scripts from offCKB system-scripts.json, layered on top of the full TESTNET_SCRIPTS
// set. Only the 5 scripts offCKB's devnet genesis actually deploys are overridden below;
// everything else falls back to the testnet entry so `client.getKnownScript()` never throws
// for a script we simply haven't listed (getKnownScript does a pure local lookup on this map,
// no RPC call — a missing key is a hard, synchronous error, not a graceful "not found on
// this chain"). Wallet connectors that probe several lock types (e.g. MetaMask trying both
// OmniLock and PWLock) would otherwise throw uncaught mid-connection for any devnet-omitted
// script. Update the 5 overrides below when deploying to a new devnet.
export const DEVNET_SCRIPTS: Record<string, ScriptInfo> = {
  ...(TESTNET_SCRIPTS as unknown as Record<string, ScriptInfo>),
  [KnownScript.Secp256k1Blake160]: {
    codeHash: "0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8",
    hashType: "type",
    cellDeps: [
      {
        cellDep: {
          outPoint: {
            txHash: "0x4d804f1495612631da202fe9902fa9899118554b08138cfe5dfb50e1ede76293",
            index: 0,
          },
          depType: "depGroup",
        },
      },
    ],
  },
  [KnownScript.Secp256k1Multisig]: {
    codeHash: "0x5c5069eb0857efc65e1bca0c07df34c31663b3622fd3876c876320fc9634e2a8",
    hashType: "type",
    cellDeps: [
      {
        cellDep: {
          outPoint: {
            txHash: "0x4d804f1495612631da202fe9902fa9899118554b08138cfe5dfb50e1ede76293",
            index: 1,
          },
          depType: "depGroup",
        },
      },
    ],
  },
  [KnownScript.AnyoneCanPay]: {
    codeHash: "0xe09352af0066f3162287763ce4ddba9af6bfaeab198dc7ab37f8c71c9e68bb5b",
    hashType: "type",
    cellDeps: [
      {
        cellDep: {
          outPoint: {
            txHash: "0x1bb87da347a776a927ab6593e1e10304ca195f8e24279f039008d5e3115b1bf7",
            index: 8,
          },
          depType: "code",
        },
      },
    ],
  },
  [KnownScript.OmniLock]: {
    codeHash: "0x9c6933d977360f115a3e9cd5a2e0e475853681b80d775d93ad0f8969da343e56",
    hashType: "type",
    cellDeps: [
      {
        cellDep: {
          outPoint: {
            txHash: "0x1bb87da347a776a927ab6593e1e10304ca195f8e24279f039008d5e3115b1bf7",
            index: 7,
          },
          depType: "code",
        },
      },
      {
        cellDep: {
          outPoint: {
            txHash: "0x4d804f1495612631da202fe9902fa9899118554b08138cfe5dfb50e1ede76293",
            index: 0,
          },
          depType: "depGroup",
        },
      },
    ],
  },
  [KnownScript.XUdt]: {
    codeHash: "0x1a1e4fef34f5982906f745b048fe7b1089647e82346074e0f32c2ece26cf6b1e",
    hashType: "type",
    cellDeps: [
      {
        cellDep: {
          outPoint: {
            txHash: "0x1bb87da347a776a927ab6593e1e10304ca195f8e24279f039008d5e3115b1bf7",
            index: 6,
          },
          depType: "code",
        },
      },
    ],
  },
} as Record<string, ScriptInfo>;

export const DEVNET_RPC_URL = "http://localhost:28114";

/**
 * Ask the devnet node whether it is there. Unlike testnet and mainnet, devnet is a process the
 * user runs themselves, so it is the one network that can simply be absent — and switching to an
 * absent node makes every page fail its queries with no explanation.
 *
 * Works from a deployed https origin too: `http://localhost` is a potentially-trustworthy origin,
 * so it is exempt from mixed-content blocking, and the node answers with permissive CORS. Chrome
 * 142+ does gate a public origin reaching loopback behind a Local Network Access permission
 * prompt — a denied or dismissed prompt reads here as "unreachable", which is the right outcome.
 */
export async function isDevnetReachable(timeoutMs = 2000): Promise<boolean> {
  try {
    const res = await fetch(DEVNET_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: 1, jsonrpc: "2.0", method: "local_node_info", params: [] }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export const NETWORK_LABELS: Record<Network, string> = {
  mainnet: "Mainnet",
  testnet: "Testnet",
  devnet: "Local Devnet",
};

export const NETWORK_RPC_URLS: Record<Network, string> = {
  mainnet: "https://mainnet.ckb.dev/rpc",
  testnet: "https://testnet.ckb.dev/rpc",
  devnet: DEVNET_RPC_URL,
};

export function buildCccClient(network: Network): ccc.Client {
  if (network === Network.Mainnet) {
    return new ccc.ClientPublicMainnet();
  }
  if (network === Network.Testnet) {
    return new ccc.ClientPublicTestnet();
  }
  // devnet — offCKB proxy
  return new ccc.ClientPublicTestnet({
    url: DEVNET_RPC_URL,
    fallbacks: [DEVNET_RPC_URL],
    scripts: DEVNET_SCRIPTS as any,
  });
}

export function readEnvNetwork(): Network {
  const network = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_NETWORK : undefined;
  if (!network || !NETWORKS.includes(network as Network)) {
    return Network.Testnet;
  }
  return network as Network;
}

// Built once per network so <CccProvider> (defaultClient/clientOptions), NetworkPill, and
// networkOfClient() below all share the exact same instances. A fresh instance per call would
// give every reselect a new object identity, defeating identity-based lookups and needlessly
// re-triggering the connector's internal signer refresh (which reacts to `client` changing).
export const CLIENT_BY_NETWORK: Record<Network, ccc.Client> = {
  [Network.Devnet]: buildCccClient(Network.Devnet),
  [Network.Testnet]: buildCccClient(Network.Testnet),
  [Network.Mainnet]: buildCccClient(Network.Mainnet),
};

// Reverse lookup by identity — CLIENT_BY_NETWORK's instances are the only ones ever handed to
// <CccProvider>, so `===` reliably tells us which network is active. Falls back to Testnet (the
// library's own hardcoded default) for the brief window before defaultClient's own effect
// commits, when useCcc().client is still a bare `new ccc.ClientPublicTestnet()` the library
// constructed itself.
export function networkOfClient(client: ccc.Client): Network {
  const match = (Object.entries(CLIENT_BY_NETWORK) as [Network, ccc.Client][]).find(
    ([, c]) => c === client
  );
  return match?.[0] ?? Network.Testnet;
}

const KNOWN_SCRIPT_LABELS: KnownScript[] = [
  KnownScript.Secp256k1Blake160,
  KnownScript.Secp256k1Multisig,
  KnownScript.AnyoneCanPay,
  KnownScript.OmniLock,
  KnownScript.XUdt,
];

export async function buildLockLabelMap(client: ccc.Client): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  for (const knownScript of KNOWN_SCRIPT_LABELS) {
    try {
      const { codeHash } = await client.getKnownScript(knownScript);
      map[codeHash] = knownScript;
    } catch {
      // script doesn't exist on the network -> skip it
    }
  }
  return map;
}
