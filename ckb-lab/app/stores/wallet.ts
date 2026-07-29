"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { useCcc } from "@ckb-ccc/connector-react";

interface WalletState {
  address: string | null;
  balance: bigint | null;
  isConnected: boolean;
}

// Centralizes what app/features/wallet/useWalletAccount.ts and app/components/WalletButton.tsx
// each used to fetch independently (two separate getRecommendedAddress()/getBalance() calls per
// signer change). Kept separate from useNetworkStore — network and wallet-account are different
// domains (network can change without the wallet reconnecting, and vice versa).
export const useWalletStore = create<WalletState>(() => ({
  address: null,
  balance: null,
  isConnected: false,
}));

/** Mounted once in providers.tsx, sibling to NetworkSync. */
export function WalletAccountSync() {
  const signer = useCcc().signerInfo?.signer;

  useEffect(() => {
    if (!signer) {
      useWalletStore.setState({ address: null, balance: null, isConnected: false });
      return;
    }
    let cancelled = false;
    useWalletStore.setState({ isConnected: true });
    signer.getRecommendedAddress().then((address) => {
      if (!cancelled) useWalletStore.setState({ address });
    });
    signer.getBalance().then((balance) => {
      if (!cancelled) useWalletStore.setState({ balance });
    });
    return () => {
      cancelled = true;
    };
  }, [signer]);

  return null;
}
