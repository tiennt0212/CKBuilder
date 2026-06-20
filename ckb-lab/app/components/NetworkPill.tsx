"use client";

import { useState } from "react";
import { Button, Dropdown } from "antd";
import { CheckOutlined, DownOutlined } from "@ant-design/icons";
import { useNetworkStore } from "@/stores/network";
import {
  NETWORKS,
  NETWORK_LABELS,
  NETWORK_RPC_URLS,
  type Network,
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
  const { network, setNetwork } = useNetworkStore();
  const [open, setOpen] = useState(false);

  const panel = (
    <div
      className="bg-bg-elev border border-border-2 rounded-xl shadow-app py-1.5 min-w-60"
      style={{ borderRadius: 12 }}
    >
      {(NETWORKS as readonly Network[]).map((n) => {
        const isActive = n === network;
        return (
          <button
            key={n}
            onClick={() => {
              setNetwork(n);
              setOpen(false);
            }}
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
              <span className="block font-mono text-micro text-text-3 truncate">
                {NETWORK_RPC_URLS[n]}
              </span>
            </span>
            {isActive && (
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

  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      popupRender={() => panel}
      trigger={["click"]}
      placement="bottomLeft"
    >
      <button
        className={[
          "flex items-center gap-1.5 px-2.5 py-1 rounded-[9px] border transition-colors text-body",
          open
            ? "border-primary text-primary"
            : "border-input-border text-text-1 hover:border-primary hover:text-primary",
        ].join(" ")}
        style={{ height: 34 }}
      >
        <span
          className="inline-block size-2 rounded-full shrink-0"
          style={{ background: NET_DOT_COLORS[network] }}
        />
        <span className="capitalize font-medium">{NETWORK_LABELS[network]}</span>
        <DownOutlined
          style={{
            fontSize: 10,
            transition: "transform 0.2s",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>
    </Dropdown>
  );
}
