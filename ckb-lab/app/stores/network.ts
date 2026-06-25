"use client";

import { create } from "zustand";
import { buildCccClient, buildLockLabelMap, readEnvNetwork, type Network } from "@/lib/ccc-client";
import type { ccc } from "@ckb-ccc/core";

interface NetworkState {
  network: Network;
  cccClient: ccc.Client;
  lockLabelMap: Record<string, string>;
  setNetwork: (n: Network) => void;
}

const initialNetwork = readEnvNetwork();
const initialClient = buildCccClient(initialNetwork);

export const useNetworkStore = create<NetworkState>((set, get) => ({
  network: initialNetwork,
  cccClient: buildCccClient(initialNetwork),
  lockLabelMap: {},
  setNetwork: (network) => {
    const cccClient = buildCccClient(network);
    set({ network, cccClient });
    buildLockLabelMap(get().cccClient).then((lockLabelMap) => set({ lockLabelMap }));
  },
}));

// Trigger initial lockmap build
buildLockLabelMap(initialClient).then((lockLabelMap) => useNetworkStore.setState({ lockLabelMap }));
