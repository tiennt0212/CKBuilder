"use client";

import { useEffect, useRef } from "react";
import { App } from "antd";
import { create } from "zustand";
import { useCcc } from "@ckb-ccc/connector-react";
import {
  buildLockLabelMap,
  CLIENT_BY_NETWORK,
  isCanonicalClient,
  isDevnetReachable,
  Network,
  NETWORK_LABELS,
  networkOfClient,
  parseNetwork,
  readEnvNetwork,
} from "@/lib/ccc-client";
import {
  LS_NETWORK_KEY,
  readNetworkQueryParam,
  readPinnedNetwork,
  readSharedNetwork,
  resolveStartupNetwork,
  syncNetworkQueryParam,
  writePinnedNetwork,
  writeSharedNetwork,
} from "@/lib/network-preference";

interface NetworkState {
  network: Network;
  lockLabelMap: Record<string, string>;
  /**
   * True while a stored choice is being restored, so the label on screen is not yet the network
   * the app will end up on. Starts `false` so the server render and the first client render
   * agree; only an effect can ever set it, because localStorage cannot be read during render.
   */
  restorePending: boolean;
  /** True when this tab answers to itself: it neither follows nor writes the shared choice. */
  pinned: boolean;
  /**
   * True once NetworkRestore has decided what this tab should be on — in particular once `pinned`
   * is authoritative. The cross-tab listener stays off until then; see NetworkRestore.
   */
  restoreSettled: boolean;
}

// Purely a derived cache — CccProvider (via defaultClient/clientOptions in providers.tsx) is the
// single source of truth for the active client. This store never builds or pushes a client; it
// only mirrors whichever client useCcc() currently reports, via NetworkSync below. Restoring a
// persisted choice does not change that: NetworkRestore goes through setClient() and waits for
// NetworkSync to mirror the result, rather than seeding `network` directly. Seeding it directly
// would be strictly worse than not persisting at all — the pill would read devnet while every
// RPC still went to testnet, with no visible symptom until a transaction failed.
export const useNetworkStore = create<NetworkState>(() => ({
  network: readEnvNetwork(),
  lockLabelMap: {},
  restorePending: false,
  pinned: false,
  restoreSettled: false,
}));

/**
 * Devnet is the one network that can simply be absent, so the rule is: **the tab that triggers a
 * switch probes; tabs that merely follow do not.** Three paths satisfy it by themselves — the
 * pill probes before switching, the startup restore probes, and the cross-tab mirror deliberately
 * skips (the tab that acted already paid for it). Each of those calls `markDevnetProbed()`.
 *
 * A fourth path cannot: CCC's own picker inside the connected-wallet modal, which `clientOptions`
 * in providers.tsx populates, dispatches straight into `setClient` with no hook for us. It is the
 * one trigger that arrives unclaimed, and `VetDevnetSwitch` below probes it after the fact.
 *
 * So the contract is: claim your switch, or it gets vetted for you. A future `setClient` caller
 * that already knows the node is alive should call this; one that does not should stay silent.
 */
let devnetProbeClaimed = false;

export function markDevnetProbed(): void {
  devnetProbeClaimed = true;
}

function takeDevnetProbeClaim(): boolean {
  const claimed = devnetProbeClaimed;
  devnetProbeClaimed = false;
  return claimed;
}

/** Mounted once in providers.tsx. Reacts to CCC's own client changing — never pushes into it. */
export function NetworkSync() {
  const client = useCcc().client;
  const seenFirstClient = useRef(false);

  useEffect(() => {
    // Skip the transient default client CccProvider constructs before its own defaultClient
    // effect commits (see providers.tsx) — it's not one of our 3 canonical instances, so
    // networkOfClient() would fall back to "testnet" and briefly flash the wrong network label
    // even when configured for devnet/mainnet, and any lock-label map built for it would be
    // thrown away a moment later anyway when this effect re-runs for the real client. Leave
    // `network`/`lockLabelMap` at whatever they already are (the env-configured initial value)
    // until the real client commits.
    if (!isCanonicalClient(client)) return;

    const network = networkOfClient(client);

    // The single place the choice is written. Doing it here rather than in NetworkPill covers
    // both switch surfaces at once: the pill, and CCC's own picker inside the connected-wallet
    // modal, which is live because providers.tsx passes `clientOptions`.
    //
    // The FIRST canonical client is skipped: it is always CccProvider's `defaultClient`, i.e.
    // the env default, never a choice the user made. Persisting it would freeze NEXT_PUBLIC_NETWORK
    // at whatever it was on a browser's first visit and make every later change to that env var
    // inert. Everything after it is a real transition — a click, or NetworkRestore's own switch.
    //
    // A restore always lands as one of those later transitions, which is also why `restorePending`
    // is cleared only in this branch: NetworkRestore sets it during the *first* canonical client's
    // commit, and clearing it unconditionally here would cancel the settling state on that same
    // commit or not, depending on which sibling's effect React happened to run first.
    if (seenFirstClient.current) {
      if (useNetworkStore.getState().pinned) {
        writePinnedNetwork(network);
      } else {
        writeSharedNetwork(network);
      }
      syncNetworkQueryParam(network);
      useNetworkStore.setState({ restorePending: false });
    } else {
      seenFirstClient.current = true;
    }

    // Clear immediately so a stale label from the previous network's code hashes never briefly
    // renders against the new network's cells while the async rebuild below is in flight.
    useNetworkStore.setState({ network, lockLabelMap: {} });

    let cancelled = false;
    buildLockLabelMap(client).then((lockLabelMap) => {
      if (!cancelled) useNetworkStore.setState({ lockLabelMap });
    });
    return () => {
      cancelled = true;
    };
  }, [client]);

  return null;
}

/**
 * Mounted once in providers.tsx, beside NetworkSync. Puts the tab back on the network the user
 * last chose, and keeps unpinned tabs in step with each other.
 *
 * **The restore waits for a canonical client rather than for a moment in time.** CccProvider runs
 * `useEffect(() => { if (defaultClient) setClient(defaultClient) }, [setClient])` — note the deps
 * are `[setClient]`, not `[defaultClient]`. That effect belongs to this component's *parent*, so
 * it runs *after* any effect here in the same commit and would silently overwrite an eager
 * restore. But `useCcc().client` can only become one of the CLIENT_BY_NETWORK instances via that
 * very effect (or a user click, impossible before mount) — so seeing a canonical client *is* the
 * signal that it has already committed. No ordering is assumed and nothing is intermittent.
 */
export function NetworkRestore() {
  const { client, setClient } = useCcc();
  const { message } = App.useApp();
  const pinned = useNetworkStore((s) => s.pinned);
  const restoreSettled = useNetworkStore((s) => s.restoreSettled);
  const restored = useRef(false);

  useEffect(() => {
    if (restored.current || !isCanonicalClient(client)) return;
    restored.current = true;

    const target = resolveStartupNetwork({
      query: readNetworkQueryParam(window.location.search),
      pinned: readPinnedNetwork(),
      shared: readSharedNetwork(),
      fallback: readEnvNetwork(),
    });

    // Adopt a `?network=` into the tab's own key so the pin survives a reload, and so NetworkSync
    // writes this tab's key from now on instead of the one every other tab is following.
    if (target.pinned) writePinnedNetwork(target.network);
    // `restoreSettled` is what arms the cross-tab listener below. It is set here, before the async
    // probe rather than after it, because what the listener is waiting on is `pinned` being
    // authoritative — not the restore being finished.
    useNetworkStore.setState({ pinned: target.pinned, restoreSettled: true });

    const alreadyThere = client === CLIENT_BY_NETWORK[target.network];

    // A tab that is already on the target still probes when that target is devnet — a new tab has
    // to establish that the node is alive *now*, not that it was alive when the choice was made.
    // Without this, opening a tab with NEXT_PUBLIC_NETWORK=devnet and a stored devnet choice would
    // return here and never check, which is the silent dead page all of this exists to prevent.
    if (alreadyThere && target.network !== Network.Devnet) return;

    const startedFrom = networkOfClient(client);
    // Nothing is moving in the already-there case, so there is no label to hold back.
    if (!alreadyThere) useNetworkStore.setState({ restorePending: true });

    // Deliberately not cancelled on cleanup. Under React StrictMode this effect is torn down and
    // re-run on mount, and `restored` survives that — so a cancel-on-cleanup would abort the only
    // restore attempt the app ever makes and leave dev builds silently on the env default. There
    // is nothing to leak: both calls below target module-level state that outlives this component.
    void (async () => {
      // Devnet is the one network that can simply be absent — it is a node the user runs. Starting
      // up on a node that is not there makes every page fail its queries with no explanation, which
      // is exactly what isDevnetReachable() was added to prevent on the click path. Probing on load
      // costs ~2s and, on the deployed origin only, can raise Chrome's Local Network Access prompt
      // once; local development is exempt from that entirely, since a loopback origin is never
      // subject to the check. Worth it either way — the alternative is a silently dead page.
      const unreachable = target.network === Network.Devnet && !(await isDevnetReachable());

      // The probe can take 2s, and this tab is not frozen for it: the user may switch in the
      // wallet modal, or another tab may switch and this one may mirror it. Either is a live,
      // deliberate choice and it outranks a restore decided before it happened — without this
      // check, a background tab finishing its probe would yank both tabs onto the stored network
      // and then broadcast that, silently undoing what the user just did.
      const now = useNetworkStore.getState().network;
      if (now !== startedFrom) {
        useNetworkStore.setState({ restorePending: false });
        return;
      }

      if (unreachable) {
        useNetworkStore.setState({ restorePending: false });
        message.warning({
          // When the tab is already on devnet there is nowhere better to fall back to — the
          // operator configured it. Say why the page is empty instead of moving them somewhere
          // they did not ask for; the explanation is the whole value here, not the fallback.
          content: alreadyThere
            ? "Local devnet did not answer — queries on this page will come back empty. Start a node with `offckb node`."
            : `Local devnet did not answer, so this tab stayed on ${NETWORK_LABELS[now]}. Start one with \`offckb node\`, then switch again.`,
          duration: 8,
        });
        // The stored choice is left alone on purpose: the node may well be running next time, and
        // clearing it would quietly demote a deliberate choice into a one-off.
        return;
      }
      if (alreadyThere) return; // probed only to confirm the node is alive; nothing to switch to
      markDevnetProbed();
      setClient(CLIENT_BY_NETWORK[target.network]);
    })();
  }, [client, setClient, message]);

  useEffect(() => {
    // Stay off until the restore has decided, for two reasons. `pinned` is still at its initial
    // `false` before then, so a tab about to pin itself would follow other tabs for those few ms.
    // And a mirror in that window would push a canonical client into CCC *without* its
    // `defaultClient` effect having run — which is exactly the signal the restore above reads as
    // proof that it did, so an early mirror would make that inference wrong.
    if (!restoreSettled) return;
    // A pinned tab answers to itself — that is the whole point of pinning, and it is what keeps
    // "run devnet and testnet side by side to compare them" possible.
    if (pinned) return;

    const onStorage = (event: StorageEvent) => {
      if (event.key !== LS_NETWORK_KEY) return;
      const next = parseNetwork(event.newValue);
      if (!next) return;
      // No "are we already on it" guard here on purpose. Any client this closure could compare
      // against lags the connector's real one: setClient sets a Lit @state synchronously, but
      // useCcc().client (and the store, which trails it) only catches up a microtask and a render
      // later — so a guard would drop a legitimate mirror that arrives inside that gap. Passing
      // the same instance twice is free: Lit's default hasChanged is `!==`, so it is a no-op.
      //
      // No devnet probe either: the tab that triggered the switch already vetted the node, and
      // re-establishing that in every following tab costs each of them ~2s to learn what one of
      // them already knows. Startup is the case that does re-probe, because liveness is a fact
      // about now rather than about when the choice was made.
      markDevnetProbed();
      setClient(CLIENT_BY_NETWORK[next]);
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [restoreSettled, pinned, setClient]);

  return null;
}

/**
 * Mounted once in providers.tsx. Catches a switch to devnet that no one claimed a probe for.
 *
 * Today that means exactly one thing: CCC's own network picker inside the connected-wallet modal.
 * `clientOptions` in providers.tsx feeds it all three networks, and `ccc-connected-scene`
 * dispatches `SelectClientEvent` straight into the connector's `setClient` — there is no hook to
 * probe before the switch, so this probes after and undoes it. That is a visible two-step, which
 * is why the pill still probes up front: this is the fallback for the path we do not own, not the
 * general mechanism.
 *
 * Without it, persisting the network makes that unprobed choice worse than it used to be — it is
 * now written to the shared key and mirrored, so one modal click on a dead node takes every
 * unpinned tab down with it and greets the user there again on the next load.
 */
export function VetDevnetSwitch() {
  const { client, setClient } = useCcc();
  const { message } = App.useApp();
  const previous = useRef(client);

  useEffect(() => {
    const from = previous.current;
    // Consume a claim only on a real transition. This effect can re-run for an unrelated dep, and
    // eating the claim then would leave the switch it belonged to looking unclaimed.
    if (client === from) return;
    previous.current = client;

    if (takeDevnetProbeClaim()) return;
    // `from` is the transient client only on the very first commit, which is defaultClient
    // arriving — not a switch, and nothing to revert to.
    if (!isCanonicalClient(client) || !isCanonicalClient(from)) return;
    if (networkOfClient(client) !== Network.Devnet) return;

    void (async () => {
      if (await isDevnetReachable()) return;
      // Only undo if nothing has moved on since — the user may well have switched again during
      // the 2s probe, and reverting to `from` then would be a jump they never asked for.
      if (useNetworkStore.getState().network !== Network.Devnet) return;
      markDevnetProbed(); // the revert is ours; it must not re-enter this check
      setClient(from);
      message.warning({
        content: `Local devnet did not answer, so ${NETWORK_LABELS[networkOfClient(from)]} is still active. Start a node with \`offckb node\`.`,
        duration: 8,
      });
    })();
  }, [client, setClient, message]);

  return null;
}
