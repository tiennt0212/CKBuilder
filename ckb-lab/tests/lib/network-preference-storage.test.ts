import { afterEach, describe, expect, it, vi } from "vitest";
import { Network } from "@/lib/ccc-client";
import {
  LS_NETWORK_KEY,
  readPinnedNetwork,
  readSharedNetwork,
  SS_NETWORK_PIN_KEY,
  syncNetworkQueryParam,
  writePinnedNetwork,
  writeSharedNetwork,
} from "@/lib/network-preference";

/**
 * The storage wrappers and `syncNetworkQueryParam` are the parts of this module that touch the
 * browser, so they are the parts the pure tests next door cannot reach. They are still worth
 * covering: their whole job is the failure behaviour — inert during SSR, and never throwing out
 * of a Safari private-mode or disabled-storage profile. A throw escaping any of them aborts the
 * effect that called it, which is how `restorePending` gets stranded and the network pill ends
 * up permanently disabled.
 *
 * The test environment is `node` (see vitest.config.ts — no jsdom in this repo), so `window` and
 * the two storage areas are stubbed per-test rather than provided by the environment. That is
 * also what makes the "no window at all" case directly expressible.
 */

/** A minimal Storage; `mode` picks which failure a real browser would produce. */
function fakeStorage(mode: "ok" | "throws" = "ok", seed: Record<string, string> = {}) {
  const map = new Map(Object.entries(seed));
  return {
    getItem: vi.fn((key: string) => {
      if (mode === "throws") throw new Error("SecurityError");
      return map.get(key) ?? null;
    }),
    setItem: vi.fn((key: string, value: string) => {
      if (mode === "throws") throw new Error("QuotaExceededError");
      map.set(key, value);
    }),
    read: (key: string) => map.get(key) ?? null,
  };
}

function stubBrowser(options: {
  local?: ReturnType<typeof fakeStorage>;
  session?: ReturnType<typeof fakeStorage>;
  href?: string;
  replaceState?: (...args: unknown[]) => void;
}) {
  const history = { state: { __next: 1 }, replaceState: options.replaceState ?? vi.fn() };
  vi.stubGlobal("window", {
    location: { href: options.href ?? "https://ckb.example/registry" },
    history,
  });
  if (options.local) vi.stubGlobal("localStorage", options.local);
  if (options.session) vi.stubGlobal("sessionStorage", options.session);
  return history;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("storage wrappers without a window (SSR)", () => {
  // No stubBrowser() here: `window` genuinely does not exist, which is the render pass on the
  // server. Reading must yield "nothing chosen" rather than throwing.
  it("read as null and write as a no-op", () => {
    expect(readSharedNetwork()).toBeNull();
    expect(readPinnedNetwork()).toBeNull();
    expect(() => writeSharedNetwork(Network.Mainnet)).not.toThrow();
    expect(() => writePinnedNetwork(Network.Mainnet)).not.toThrow();
  });
});

describe("shared network key (localStorage)", () => {
  it("round-trips through the documented key", () => {
    const local = fakeStorage();
    stubBrowser({ local });

    writeSharedNetwork(Network.Devnet);

    expect(local.setItem).toHaveBeenCalledWith(LS_NETWORK_KEY, "devnet");
    expect(readSharedNetwork()).toBe("devnet");
  });

  // The reader is deliberately raw — resolveStartupNetwork owns validation, so a corrupt value
  // has to survive the trip out of storage in order to fall through to the next source there.
  it("hands back an unrecognised value unchanged rather than nulling it", () => {
    stubBrowser({ local: fakeStorage("ok", { [LS_NETWORK_KEY]: "staging" }) });
    expect(readSharedNetwork()).toBe("staging");
  });

  it("survives a storage area that throws", () => {
    stubBrowser({ local: fakeStorage("throws") });
    expect(readSharedNetwork()).toBeNull();
    expect(() => writeSharedNetwork(Network.Mainnet)).not.toThrow();
  });
});

describe("per-tab pin key (sessionStorage)", () => {
  it("round-trips through the documented key", () => {
    const session = fakeStorage();
    stubBrowser({ session });

    writePinnedNetwork(Network.Testnet);

    expect(session.setItem).toHaveBeenCalledWith(SS_NETWORK_PIN_KEY, "testnet");
    expect(readPinnedNetwork()).toBe("testnet");
  });

  it("survives a storage area that throws", () => {
    stubBrowser({ session: fakeStorage("throws") });
    expect(readPinnedNetwork()).toBeNull();
    expect(() => writePinnedNetwork(Network.Mainnet)).not.toThrow();
  });

  // The two keys must not collide: a pinned tab writing the shared key would drag every other
  // tab onto its network, which is the opposite of what pinning means.
  it("writes a different key from the shared one", () => {
    expect(SS_NETWORK_PIN_KEY).not.toBe(LS_NETWORK_KEY);
  });
});

describe("syncNetworkQueryParam", () => {
  it("rewrites an existing pin and preserves the router's history state", () => {
    const history = stubBrowser({ href: "https://ckb.example/registry?network=devnet" });

    syncNetworkQueryParam(Network.Mainnet);

    expect(history.replaceState).toHaveBeenCalledWith(
      { __next: 1 }, // Next's own history entry must survive the touch-up
      "",
      "https://ckb.example/registry?network=mainnet"
    );
  });

  it("does not touch a URL that carries no pin", () => {
    const history = stubBrowser({ href: "https://ckb.example/registry" });
    syncNetworkQueryParam(Network.Mainnet);
    expect(history.replaceState).not.toHaveBeenCalled();
  });

  // Safari throws SecurityError past ~100 replaceState calls in 30s. This must not escape: the
  // caller is mid-effect, and an abort there strands restorePending at true, which disables the
  // network pill for the rest of the session.
  it("swallows a throwing replaceState", () => {
    stubBrowser({
      href: "https://ckb.example/registry?network=devnet",
      replaceState: () => {
        throw new Error("SecurityError");
      },
    });
    expect(() => syncNetworkQueryParam(Network.Mainnet)).not.toThrow();
  });

  it("is inert without a window", () => {
    expect(() => syncNetworkQueryParam(Network.Mainnet)).not.toThrow();
  });
});
