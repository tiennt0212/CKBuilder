import { describe, expect, it } from "vitest";
import { Network, parseNetwork } from "@/lib/ccc-client";
import {
  nextNetworkHref,
  readNetworkQueryParam,
  resolveStartupNetwork,
} from "@/lib/network-preference";

describe("parseNetwork", () => {
  it.each([[Network.Devnet], [Network.Testnet], [Network.Mainnet]])("accepts %s", (network) => {
    expect(parseNetwork(network)).toBe(network);
  });

  it.each([
    ["unknown name", "staging"],
    ["wrong casing", "Testnet"],
    ["a name with whitespace", " testnet"],
    ["empty string", ""],
    ["a JSON-quoted value", '"testnet"'],
    ["a JSON array", '["testnet"]'],
  ])("rejects %s", (_label, raw) => {
    expect(parseNetwork(raw)).toBeNull();
  });

  it("rejects a missing value", () => {
    expect(parseNetwork(null)).toBeNull();
    expect(parseNetwork(undefined)).toBeNull();
  });
});

describe("resolveStartupNetwork", () => {
  const absent = { query: null, pinned: null, shared: null };

  it("falls back to the env default when nothing has been chosen", () => {
    expect(resolveStartupNetwork({ ...absent, fallback: Network.Testnet })).toEqual({
      network: Network.Testnet,
      pinned: false,
    });
  });

  it("prefers the query param over every other source", () => {
    expect(
      resolveStartupNetwork({
        query: Network.Devnet,
        pinned: Network.Mainnet,
        shared: Network.Testnet,
        fallback: Network.Testnet,
      })
    ).toEqual({ network: Network.Devnet, pinned: true });
  });

  it("prefers this tab's pin over the shared choice", () => {
    expect(
      resolveStartupNetwork({
        query: null,
        pinned: Network.Devnet,
        shared: Network.Mainnet,
        fallback: Network.Testnet,
      })
    ).toEqual({ network: Network.Devnet, pinned: true });
  });

  it("prefers the shared choice over the env default", () => {
    expect(
      resolveStartupNetwork({ ...absent, shared: Network.Mainnet, fallback: Network.Testnet })
    ).toEqual({ network: Network.Mainnet, pinned: false });
  });

  // A corrupt or stale value must behave exactly as if it were absent — never strand the app on
  // a network that does not exist, and never stop a lower-precedence source from being used.
  it("falls through a corrupt query param to the pin", () => {
    expect(
      resolveStartupNetwork({
        query: "staging",
        pinned: Network.Mainnet,
        shared: null,
        fallback: Network.Testnet,
      })
    ).toEqual({ network: Network.Mainnet, pinned: true });
  });

  it("falls through a corrupt pin to the shared choice", () => {
    expect(
      resolveStartupNetwork({
        query: null,
        pinned: "staging",
        shared: Network.Devnet,
        fallback: Network.Testnet,
      })
    ).toEqual({ network: Network.Devnet, pinned: false });
  });

  it("falls through a corrupt shared choice to the env default", () => {
    expect(
      resolveStartupNetwork({ ...absent, shared: "staging", fallback: Network.Mainnet })
    ).toEqual({ network: Network.Mainnet, pinned: false });
  });

  it("falls all the way through when every stored value is corrupt", () => {
    expect(
      resolveStartupNetwork({
        query: "",
        pinned: "Testnet",
        shared: '"devnet"',
        fallback: Network.Testnet,
      })
    ).toEqual({ network: Network.Testnet, pinned: false });
  });

  // `pinned` decides whether the tab follows other tabs and whether it writes the shared key,
  // so which source won matters as much as which network won.
  it("marks only query- and pin-sourced networks as pinned", () => {
    expect(
      resolveStartupNetwork({ ...absent, query: Network.Devnet, fallback: Network.Testnet })
    ).toHaveProperty("pinned", true);
    expect(
      resolveStartupNetwork({ ...absent, pinned: Network.Devnet, fallback: Network.Testnet })
    ).toHaveProperty("pinned", true);
    expect(
      resolveStartupNetwork({ ...absent, shared: Network.Devnet, fallback: Network.Testnet })
    ).toHaveProperty("pinned", false);
    expect(resolveStartupNetwork({ ...absent, fallback: Network.Devnet })).toHaveProperty(
      "pinned",
      false
    );
  });
});

describe("readNetworkQueryParam", () => {
  // Validation is parseNetwork's job, not this one's — it hands back whatever is there.
  it("reads the param when present", () => {
    expect(readNetworkQueryParam("?foo=1&network=staging&bar=2")).toBe("staging");
  });

  it("returns null when absent", () => {
    expect(readNetworkQueryParam("?other=1")).toBeNull();
  });
});

describe("nextNetworkHref", () => {
  const base = "https://ckb.example/registry";

  it("rewrites a pin the tab has switched away from", () => {
    expect(nextNetworkHref(`${base}?network=devnet`, Network.Mainnet)).toBe(
      `${base}?network=mainnet`
    );
  });

  it("never adds the param to a URL that does not carry one", () => {
    expect(nextNetworkHref(base, Network.Mainnet)).toBeNull();
    expect(nextNetworkHref(`${base}?foo=1`, Network.Mainnet)).toBeNull();
  });

  it("does nothing when the param is already correct", () => {
    expect(nextNetworkHref(`${base}?network=mainnet`, Network.Mainnet)).toBeNull();
  });

  // Repairing an unrecognised value would silently promote an unpinned tab to pinned: the tab
  // loaded unpinned because resolveStartupNetwork ignored `staging`, but a rewritten
  // `?network=mainnet` would take precedence over everything on the next reload.
  it("leaves an unrecognised value alone rather than repairing it", () => {
    expect(nextNetworkHref(`${base}?network=staging`, Network.Mainnet)).toBeNull();
    expect(nextNetworkHref(`${base}?network=`, Network.Mainnet)).toBeNull();
  });

  it("preserves the path and every other param", () => {
    expect(nextNetworkHref(`${base}?foo=1&network=devnet&bar=2#frag`, Network.Testnet)).toBe(
      `${base}?foo=1&network=testnet&bar=2#frag`
    );
  });
});
