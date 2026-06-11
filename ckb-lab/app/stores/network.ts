"use client";

import { create } from "zustand";
import { buildCccClient, readEnvNetwork, type Network } from "@/lib/ccc-client";
import type { ccc } from "@ckb-ccc/core";

interface NetworkState {
  network: Network;
  cccClient: ccc.Client;
  setNetwork: (n: Network) => void;
}

const initialNetwork = readEnvNetwork();

export const useNetworkStore = create<NetworkState>((set) => ({
  network: initialNetwork,
  cccClient: buildCccClient(initialNetwork),
  setNetwork: (network) => set({ network, cccClient: buildCccClient(network) }),
}));
