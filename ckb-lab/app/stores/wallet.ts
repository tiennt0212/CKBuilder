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
    // Clear the previous signer's address/balance rather than leaving them visible under a now-
    // different signer while the new fetches below are in flight (e.g. switching wallets).
    useWalletStore.setState({ address: null, balance: null, isConnected: true });
    signer
      .getRecommendedAddress()
      .then((address) => {
        if (!cancelled) useWalletStore.setState({ address });
      })
      .catch(() => {
        if (!cancelled) useWalletStore.setState({ address: null });
      });
    signer
      .getBalance()
      .then((balance) => {
        if (!cancelled) useWalletStore.setState({ balance });
      })
      .catch(() => {
        if (!cancelled) useWalletStore.setState({ balance: null });
      });
    return () => {
      cancelled = true;
    };
  }, [signer]);

  return null;
}
