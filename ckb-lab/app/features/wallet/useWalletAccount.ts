import { useEffect, useState } from "react";
import { useCcc } from "@ckb-ccc/connector-react";

export function useWalletAccount() {
  const signer = useCcc().signerInfo?.signer;
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<bigint | null>(null);

  useEffect(() => {
    if (!signer) {
      setAddress(null);
      setBalance(null);
      return;
    }
    signer.getRecommendedAddress().then(setAddress);
    signer.getBalance().then(setBalance);
  }, [signer]);

  return { address, balance, isConnected: !!signer };
}
