"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { useCcc } from "@ckb-ccc/connector-react";
import {
  buildLockLabelMap,
  CLIENT_BY_NETWORK,
  networkOfClient,
  readEnvNetwork,
  type Network,
} from "@/lib/ccc-client";

interface NetworkState {
  network: Network;
  lockLabelMap: Record<string, string>;
}

// Purely a derived cache — CccProvider (via defaultClient/clientOptions in providers.tsx) is the
// single source of truth for the active client. This store never builds or pushes a client; it
// only mirrors whichever client useCcc() currently reports, via NetworkSync below.
export const useNetworkStore = create<NetworkState>(() => ({
  network: readEnvNetwork(),
  lockLabelMap: {},
}));

/** Mounted once in providers.tsx. Reacts to CCC's own client changing — never pushes into it. */
export function NetworkSync() {
  const client = useCcc().client;

  useEffect(() => {
    // Clear immediately so a stale label from the previous network's code hashes never briefly
    // renders against the new network's cells while the async rebuild below is in flight.
    useNetworkStore.setState({ network: networkOfClient(client), lockLabelMap: {} });

    // Skip the transient default client CccProvider constructs before its own defaultClient
    // effect commits (see providers.tsx) — building a lock-label map for it is thrown away a
    // moment later when this effect re-runs for the real client, and getKnownScript's per-script
    // lookups, while local/non-RPC, aren't free to redo on every single page load for nothing.
    if (!Object.values(CLIENT_BY_NETWORK).includes(client)) return;

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
