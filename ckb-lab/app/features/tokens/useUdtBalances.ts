import { loadUdtBalances, type UdtBalance } from "@/lib/ckb/udt";
import { useNetworkStore } from "@/stores/network";
import { useSigner } from "@ckb-ccc/connector-react";
import { useCallback, useEffect, useRef, useState } from "react";

export type { UdtBalance } from "@/lib/ckb/udt";

/**
 * The wallet's xUDT holdings, grouped by token.
 *
 * Deliberately separate from useTokens rather than folded into it: a failed *read* (indexer down,
 * wallet mid-swap) has nothing to do with a transaction's TxStatus, and sharing one `error` string
 * would make TxStatusBanner render a send failure for what is only a list that didn't load. It
 * also means useTokens.reset() cannot wipe the balance list.
 */
export function useUdtBalances() {
  const signer = useSigner();
  const network = useNetworkStore((s) => s.network);
  const [balances, setBalances] = useState<UdtBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Same staleness guard the tx hooks use: a network switch mid-query must not let the old
  // network's result land in state.
  const requestId = useRef(0);

  const refresh = useCallback(async () => {
    const myId = ++requestId.current;

    if (!signer) {
      setBalances([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const next = await loadUdtBalances(signer);
      if (myId !== requestId.current) return;
      setBalances(next);
    } catch (err: unknown) {
      if (myId !== requestId.current) return;
      console.error("Failed to load xUDT balances:", err);
      setBalances([]);
      setError(err instanceof Error ? err.message : "Failed to load token balances");
    } finally {
      if (myId === requestId.current) setLoading(false);
    }
  }, [signer]);

  // `network` is a dependency even though refresh() never reads it: the store and the signer's
  // client are updated by CccProvider on a switch, and re-running here is what clears a devnet
  // token off the list after moving to testnet.
  useEffect(() => {
    refresh();
  }, [refresh, network]);

  return { balances, loading, error, refresh };
}
