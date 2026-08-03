import { describe, expect, it } from "vitest";
import { Network } from "@/lib/ccc-client";
import {
  parseNetwork,
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
    ["JSON from an older build", '"testnet"'],
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
  it.each([
    ["?network=devnet", "devnet"],
    ["network=devnet", "devnet"], // URLSearchParams tolerates the missing leading "?"
    ["?foo=1&network=mainnet&bar=2", "mainnet"],
    ["?network=staging", "staging"], // validation is parseNetwork's job, not this one's
    ["?network=", ""],
  ])("reads %s as %s", (search, expected) => {
    expect(readNetworkQueryParam(search)).toBe(expected);
  });

  it.each([[""], ["?"], ["?other=1"]])("returns null for %s", (search) => {
    expect(readNetworkQueryParam(search)).toBeNull();
  });
});
