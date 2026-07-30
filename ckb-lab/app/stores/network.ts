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
    // Skip the transient default client CccProvider constructs before its own defaultClient
    // effect commits (see providers.tsx) — it's not one of our 3 canonical instances, so
    // networkOfClient() would fall back to "testnet" and briefly flash the wrong network label
    // even when configured for devnet/mainnet, and any lock-label map built for it would be
    // thrown away a moment later anyway when this effect re-runs for the real client. Leave
    // `network`/`lockLabelMap` at whatever they already are (the env-configured initial value)
    // until the real client commits.
    if (!Object.values(CLIENT_BY_NETWORK).includes(client)) return;

    // Clear immediately so a stale label from the previous network's code hashes never briefly
    // renders against the new network's cells while the async rebuild below is in flight.
    useNetworkStore.setState({ network: networkOfClient(client), lockLabelMap: {} });

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
