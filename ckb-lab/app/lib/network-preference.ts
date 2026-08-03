import { NETWORKS, type Network } from "./ccc-client";

/**
 * Where the user's chosen network is remembered.
 *
 * `NEXT_PUBLIC_NETWORK` is only the default for a first visit — before the user has ever
 * chosen. Once they pick a network it has to survive a reload, or every network-scoped registry
 * (`ckbuilder:deployedScripts`, `ckbuilder:counterCells`, `ckbuilder:typeScriptPresets`) filters
 * itself empty on the next load and reads as data loss rather than as a network change.
 *
 * Two scopes, deliberately:
 *
 * - `ckbuilder:network` in **localStorage** is the shared choice. Tabs mirror it live, so
 *   switching in one tab switches the others.
 * - `ckbuilder:networkPin` in **sessionStorage** pins one tab to a network of its own. Opening
 *   the app at `?network=devnet` sets it, and that tab then ignores what the other tabs do —
 *   which is what makes "run devnet and testnet side by side to compare them" still possible.
 *
 * Values are stored as the bare network name, not JSON — the same shape as the `ckb-theme` key.
 * `parseNetwork()` makes anything else (a stale name, a hand-edited value, JSON from an older
 * build) resolve to `null` and fall through to the next source rather than throwing.
 */

export const LS_NETWORK_KEY = "ckbuilder:network";
export const SS_NETWORK_PIN_KEY = "ckbuilder:networkPin";
export const NETWORK_QUERY_PARAM = "network";

/** `null` for anything that is not one of the three names in `NETWORKS`. */
export function parseNetwork(raw: string | null | undefined): Network | null {
  if (!raw) return null;
  return NETWORKS.includes(raw as Network) ? (raw as Network) : null;
}

export interface StartupSources {
  /** `?network=` from the URL, already extracted. `null` when absent. */
  query: string | null;
  /** The sessionStorage pin — this tab's own choice. */
  pinned: string | null;
  /** The localStorage value shared by every unpinned tab. */
  shared: string | null;
  /** `readEnvNetwork()` — where a browser that has never chosen ends up. */
  fallback: Network;
}

export interface StartupNetwork {
  network: Network;
  /** True when this tab answers to itself: it neither follows nor writes the shared value. */
  pinned: boolean;
}

/**
 * Resolve which network a freshly loaded tab should be on.
 *
 * Precedence is `?network=` → this tab's pin → the shared choice → the env default. An
 * unrecognised value at any level is treated as absent and falls through to the next, so a
 * corrupt key can never strand the app on a network that does not exist.
 *
 * Pure on purpose: the precedence is the part worth testing, and this way it needs no
 * `localStorage`, no `window`, and no jsdom.
 */
export function resolveStartupNetwork({
  query,
  pinned,
  shared,
  fallback,
}: StartupSources): StartupNetwork {
  const fromQuery = parseNetwork(query);
  if (fromQuery) return { network: fromQuery, pinned: true };

  const fromPin = parseNetwork(pinned);
  if (fromPin) return { network: fromPin, pinned: true };

  const fromShared = parseNetwork(shared);
  if (fromShared) return { network: fromShared, pinned: false };

  return { network: fallback, pinned: false };
}

/** `?network=` out of a `location.search` string. Pure so the parsing is testable on its own. */
export function readNetworkQueryParam(search: string): string | null {
  return new URLSearchParams(search).get(NETWORK_QUERY_PARAM);
}

// The wrappers below follow the same shape as lib/ckb/deployed-scripts.ts: guard on `window` so
// they are inert during SSR, and swallow storage errors (Safari private mode, a disabled-storage
// profile) rather than taking a page down over a preference.

export function readSharedNetwork(): Network | null {
  if (typeof window === "undefined") return null;
  try {
    return parseNetwork(localStorage.getItem(LS_NETWORK_KEY));
  } catch {
    return null;
  }
}

export function writeSharedNetwork(network: Network): void {
  if (typeof window === "undefined") return;
  try {
    // Skip a no-op write: `setItem` with an unchanged value still fires a `storage` event in
    // other tabs, and every one of them would wake up to re-derive the network it already has.
    if (localStorage.getItem(LS_NETWORK_KEY) === network) return;
    localStorage.setItem(LS_NETWORK_KEY, network);
  } catch {
    // ignore
  }
}

export function readPinnedNetwork(): Network | null {
  if (typeof window === "undefined") return null;
  try {
    return parseNetwork(sessionStorage.getItem(SS_NETWORK_PIN_KEY));
  } catch {
    return null;
  }
}

export function writePinnedNetwork(network: Network): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SS_NETWORK_PIN_KEY, network);
  } catch {
    // ignore
  }
}
