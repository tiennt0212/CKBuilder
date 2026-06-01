"use client";

import {
  createContext,
  useContext,
  useState,
  useMemo,
  type ReactNode,
} from "react";
import { buildCccClient, readEnvNetwork, type Network } from "ckb-utils";
import type { ccc } from "@ckb-ccc/core";

interface NetworkContextValue {
  network: Network;
  setNetwork: (n: Network) => void;
  cccClient: ccc.Client;
}

const NetworkContext = createContext<NetworkContextValue | null>(null);

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [network, setNetwork] = useState<Network>(readEnvNetwork);
  const cccClient = useMemo(() => buildCccClient(network), [network]);

  return (
    <NetworkContext.Provider value={{ network, setNetwork, cccClient }}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  const ctx = useContext(NetworkContext);
  if (!ctx) throw new Error("useNetwork must be used inside NetworkProvider");
  return ctx;
}
