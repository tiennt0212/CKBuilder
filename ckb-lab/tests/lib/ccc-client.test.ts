import { afterEach, describe, expect, it, vi } from "vitest";
import { ccc } from "@ckb-ccc/core";
import {
  CLIENT_BY_NETWORK,
  DEVNET_RPC_URL,
  isCanonicalClient,
  isDevnetReachable,
  Network,
  NETWORK_LABELS,
  NETWORK_RPC_URLS,
  NETWORKS,
  networkOfClient,
} from "@/lib/ccc-client";

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * `networkOfClient` and `isCanonicalClient` are identity lookups, not value comparisons, and the
 * whole network layer leans on that: the restore reads "this client is one of ours" as proof that
 * CccProvider's `defaultClient` effect has already committed. If a second instance for the same
 * network ever became reachable, that inference would quietly stop holding — so the identity
 * contract is worth pinning down here rather than in a comment.
 */
describe("CLIENT_BY_NETWORK identity", () => {
  it("holds one instance per network, built once", () => {
    expect(CLIENT_BY_NETWORK[Network.Devnet]).toBe(CLIENT_BY_NETWORK[Network.Devnet]);
    const instances = NETWORKS.map((n) => CLIENT_BY_NETWORK[n]);
    expect(new Set(instances).size).toBe(NETWORKS.length);
  });

  it.each(NETWORKS)("round-trips %s through networkOfClient", (network) => {
    expect(networkOfClient(CLIENT_BY_NETWORK[network])).toBe(network);
  });

  it("recognises exactly the three instances it built", () => {
    for (const network of NETWORKS) {
      expect(isCanonicalClient(CLIENT_BY_NETWORK[network])).toBe(true);
    }
  });

  // This is the client CccProvider constructs for itself before `defaultClient` commits. Treating
  // it as canonical would flash the wrong network label and, worse, would let NetworkRestore
  // conclude that CCC's effect had run when it had not.
  it("rejects a separately constructed testnet client", () => {
    const impostor = new ccc.ClientPublicTestnet();
    expect(isCanonicalClient(impostor)).toBe(false);
    // networkOfClient still falls back to testnet for it — deliberate, and why callers must gate
    // on isCanonicalClient rather than trusting this value.
    expect(networkOfClient(impostor)).toBe(Network.Testnet);
  });
});

describe("network tables", () => {
  it.each(NETWORKS)("has a label and an RPC URL for %s", (network) => {
    expect(NETWORK_LABELS[network]).toBeTruthy();
    expect(NETWORK_RPC_URLS[network]).toMatch(/^https?:\/\//);
  });

  // Devnet is the only http:// endpoint, and the only one that is a process the user runs. Several
  // decisions downstream (the probe, the pill's copy) are keyed on that being true.
  it("points devnet at loopback and the other two at https", () => {
    expect(NETWORK_RPC_URLS[Network.Devnet]).toBe(DEVNET_RPC_URL);
    expect(new URL(DEVNET_RPC_URL).hostname).toBe("localhost");
    expect(NETWORK_RPC_URLS[Network.Testnet]).toMatch(/^https:/);
    expect(NETWORK_RPC_URLS[Network.Mainnet]).toMatch(/^https:/);
  });
});

describe("isDevnetReachable", () => {
  it("posts a local_node_info probe to the devnet RPC", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await expect(isDevnetReachable()).resolves.toBe(true);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(DEVNET_RPC_URL);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body).method).toBe("local_node_info");
  });

  // Every non-answer is the same answer to the caller: do not switch to this network. A node that
  // 500s, a connection refused, and a denied Local Network Access prompt are indistinguishable
  // here on purpose — all three mean "queries from this page will not work".
  it.each([
    ["a non-ok response", { ok: false }, undefined],
    ["a rejected request", undefined, new TypeError("Failed to fetch")],
    ["an aborted request", undefined, new DOMException("timeout", "TimeoutError")],
  ])("reports %s as unreachable", async (_label, resolved, rejected) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => (rejected ? Promise.reject(rejected) : Promise.resolve(resolved)))
    );
    await expect(isDevnetReachable()).resolves.toBe(false);
  });

  it("gives up rather than hanging when the node never answers", async () => {
    // A socket that accepts and then goes silent is the realistic devnet failure — without the
    // abort signal the restore would sit on `restorePending` indefinitely and the pill would stay
    // skeletonised, which is worse than reporting the node as absent.
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init: { signal: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            init.signal.addEventListener("abort", () => reject(init.signal.reason));
          })
      )
    );
    await expect(isDevnetReachable(10)).resolves.toBe(false);
  });
});
