import { parseNetwork, type Network } from "./ccc-client";

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

/**
 * The href with `?network=` brought in step with the network this tab is on, or `null` when
 * there is nothing to rewrite.
 *
 * Only rewrites a param that is already there **and already names a real network** — never adds
 * one, never repairs a bad one. Both halves matter:
 *
 * - Without the rewrite, a tab opened at `?network=devnet` that later switches to mainnet would
 *   revert to devnet on the next reload, which is the very bug this layer exists to fix.
 * - Without the validity check, `?network=staging` — which `resolveStartupNetwork` correctly
 *   ignores, leaving the tab unpinned — would be *repaired* into `?network=mainnet` by the tab's
 *   first switch, silently promoting an unpinned tab to pinned on the reload after that.
 */
export function nextNetworkHref(href: string, network: Network): string | null {
  const url = new URL(href);
  const current = url.searchParams.get(NETWORK_QUERY_PARAM);
  if (parseNetwork(current) === null || current === network) return null;
  url.searchParams.set(NETWORK_QUERY_PARAM, network);
  return url.toString();
}

/**
 * Uses `history.replaceState` rather than the Next router: the caller lives in `providers.tsx`,
 * which wraps every route, and `useSearchParams()` there would push the entire tree into
 * client-side rendering and demand a Suspense boundary — for a URL touch-up that needs no
 * re-render at all. Passing `history.state` through preserves the App Router's own history entry.
 */
export function syncNetworkQueryParam(network: Network): void {
  if (typeof window === "undefined") return;
  const href = nextNetworkHref(window.location.href, network);
  if (!href) return;
  try {
    window.history.replaceState(window.history.state, "", href);
  } catch {
    // Safari throws SecurityError past ~100 replaceState calls in 30s. The URL is cosmetic here;
    // the pin itself is already in sessionStorage. Throwing would abort the caller's effect
    // mid-way and strand `restorePending` at true, disabling the network pill for good.
  }
}

// The wrappers below guard on `window` so they are inert during SSR, like the read path in
// lib/ckb/deployed-scripts.ts. They additionally try/catch their *writes*, which that file does
// not — a disabled-storage profile or Safari private mode should cost a preference, not a page.
//
// The readers hand back the raw string rather than a validated Network: `resolveStartupNetwork`
// is the single place the precedence *and* the validation live, so a corrupt value falls through
// to the next source there instead of being quietly turned into `null` by two different layers.

export function readSharedNetwork(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(LS_NETWORK_KEY);
  } catch {
    return null;
  }
}

export function writeSharedNetwork(network: Network): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_NETWORK_KEY, network);
  } catch {
    // ignore
  }
}

export function readPinnedNetwork(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(SS_NETWORK_PIN_KEY);
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
