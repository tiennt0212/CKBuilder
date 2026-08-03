"use client";

import { useState } from "react";
import { Button, Dropdown, Skeleton, Tooltip } from "antd";
import { CheckOutlined, DownOutlined, LoadingOutlined, PushpinFilled } from "@ant-design/icons";
import { useCcc } from "@ckb-ccc/connector-react";
import { useNetworkStore } from "@/stores/network";
import {
  CLIENT_BY_NETWORK,
  isDevnetReachable,
  Network,
  NETWORKS,
  NETWORK_LABELS,
  NETWORK_RPC_URLS,
} from "@/lib/ccc-client";

// Dot colors per design spec:
// - mainnet: muted grey (var(--text-3)) — not using indigo to avoid false urgency
// - testnet: green (var(--dot)) — design system active indicator
// - devnet: warm amber (#bd8a3a) — darker than Tailwind amber-400 to pass contrast on bg-elev
const NET_DOT_COLORS: Record<Network, string> = {
  mainnet: "var(--text-3)",
  testnet: "var(--dot)",
  devnet: "#bd8a3a",
};

export function NetworkPill() {
  const network = useNetworkStore((s) => s.network);
  const restorePending = useNetworkStore((s) => s.restorePending);
  const pinned = useNetworkStore((s) => s.pinned);
  const { setClient } = useCcc();
  const [open, setOpen] = useState(false);

  const [devnetProbe, setDevnetProbe] = useState<"idle" | "checking" | "unreachable">("idle");

  async function selectNetwork(n: Network) {
    // Devnet is the only network that can simply not be there — it is a node the user runs.
    // Probe before switching so an absent node produces one legible line here instead of every
    // page failing its queries silently. Probed on click rather than on mount on purpose: from a
    // deployed https origin this is a local-network request, and Chrome 142+ raises a permission
    // prompt for it. That prompt should follow a deliberate user action, not a page load.
    if (n === Network.Devnet) {
      setDevnetProbe("checking");
      if (!(await isDevnetReachable())) {
        setDevnetProbe("unreachable");
        return; // leave the dropdown open so the message is readable and the click retryable
      }
    }
    setDevnetProbe("idle");
    setClient(CLIENT_BY_NETWORK[n]);
    setOpen(false);
  }

  const panel = (
    <div
      className="bg-bg-elev border border-border-2 rounded-xl shadow-app py-1.5 min-w-60"
      style={{ borderRadius: 12 }}
    >
      {(NETWORKS as readonly Network[]).map((n) => {
        const isActive = n === network;
        const probe = n === Network.Devnet ? devnetProbe : "idle";
        return (
          <button
            key={n}
            disabled={probe === "checking"}
            onClick={() => selectNetwork(n)}
            className={[
              "flex items-center gap-2.5 w-full px-3 py-2 text-left transition-colors",
              isActive ? "bg-primary-tint" : "hover:bg-hover-overlay",
            ].join(" ")}
          >
            <span
              className="inline-block size-2 rounded-full shrink-0"
              style={{ background: NET_DOT_COLORS[n] }}
            />
            <span className="flex-1 min-w-0">
              <span
                className={[
                  "block text-body font-medium",
                  isActive ? "text-primary" : "text-text-1",
                ].join(" ")}
              >
                {NETWORK_LABELS[n]}
              </span>
              {probe === "unreachable" ? (
                <span className="block text-micro text-rust leading-snug">
                  No node answered — start one with <span className="font-mono">offckb node</span>
                </span>
              ) : probe === "checking" ? (
                <span className="block text-micro text-text-3 truncate">
                  Looking for a local node…
                </span>
              ) : (
                <span className="block font-mono text-micro text-text-3 truncate">
                  {NETWORK_RPC_URLS[n]}
                </span>
              )}
            </span>
            {probe === "checking" && <LoadingOutlined className="text-text-3 text-xs shrink-0" />}
            {isActive && probe !== "checking" && (
              <CheckOutlined className="text-primary text-xs shrink-0" />
            )}
          </button>
        );
      })}

      <div className="my-1.5 mx-3 border-t border-dashed border-border-2" />
      <Button
        type="text"
        disabled
        icon={
          <span className="inline-block size-2 rounded-full shrink-0 border border-dashed border-text-3" />
        }
        className="w-full! justify-start! px-3! py-2! h-auto! text-body! text-text-3! rounded-none!"
      >
        Custom RPC…
      </Button>
    </div>
  );

  // While a stored choice is being restored, `network` is still the env default and would be a
  // lie — and on the devnet path the probe can take a couple of seconds. Show the pill as
  // unsettled and refuse clicks for that window rather than inviting an action against a chain
  // the app is about to leave. There is nothing to show before mount either way: localStorage
  // cannot be read during render, so the restore can only ever start one commit late.
  const trigger = (
    <button
      disabled={restorePending}
      className={[
        "flex items-center gap-1.5 px-2.5 py-1 rounded-[9px] border transition-colors text-body",
        restorePending
          ? "border-input-border text-text-3 cursor-default"
          : open
            ? "border-primary text-primary"
            : "border-input-border text-text-1 hover:border-primary hover:text-primary",
      ].join(" ")}
      style={{ height: 34 }}
    >
      <span
        className="inline-block size-2 rounded-full shrink-0 transition-opacity"
        style={{
          background: NET_DOT_COLORS[network],
          opacity: restorePending ? 0.35 : 1,
        }}
      />
      {restorePending ? (
        <Skeleton.Input active size="small" style={{ width: 72, height: 14, minWidth: 72 }} />
      ) : (
        <span className="capitalize font-medium">{NETWORK_LABELS[network]}</span>
      )}
      {pinned && !restorePending && (
        // Tooltip wraps the icon rather than the whole trigger on purpose: Dropdown clones its
        // child to attach the click handler, and a Tooltip in between would have to forward it.
        <Tooltip title="This tab is pinned to its own network and will not follow the others.">
          <PushpinFilled className="text-text-3 shrink-0" style={{ fontSize: 10 }} />
        </Tooltip>
      )}
      <DownOutlined
        style={{
          fontSize: 10,
          transition: "transform 0.2s",
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
        }}
      />
    </button>
  );

  return (
    <Dropdown
      open={open && !restorePending}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setDevnetProbe("idle"); // a stale "unreachable" must not outlive the dropdown
      }}
      popupRender={() => panel}
      trigger={["click"]}
      placement="bottomLeft"
    >
      {trigger}
    </Dropdown>
  );
}
