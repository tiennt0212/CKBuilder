"use client";

import { useEffect, useState } from "react";
import { Button, Select, Divider, Avatar, Tooltip } from "antd";
import { WalletOutlined, MoonOutlined, SunOutlined } from "@ant-design/icons";
import { useCcc, useSigner } from "@ckb-ccc/connector-react";
import { useNetworkStore } from "@/stores/network";
import { useTheme } from "../contexts/ThemeContext";
import { PAGE_TITLES } from "@/lib/routes";
import { NETWORKS, NETWORK_DOT_COLORS, type Network } from "@/lib/ccc-client";
import { truncateAddress } from "@/lib/format";

interface HeaderProps {
  pathname: string;
}

export function Header({ pathname }: HeaderProps) {
  const { network, setNetwork } = useNetworkStore();
  const { mode, toggle } = useTheme();
  const { open, disconnect, wallet } = useCcc();
  const signer = useSigner();

  const [address, setAddress] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!signer) {
      setAddress(undefined);
      return;
    }
    signer.getRecommendedAddress().then(setAddress).catch(() => setAddress(undefined));
  }, [signer]);

  const isConnected = !!signer;
  const truncated = address ? truncateAddress(address) : undefined;
  const avatarLabel = truncated ? truncated.slice(0, 2).toUpperCase() : "CK";

  const page = PAGE_TITLES[pathname as keyof typeof PAGE_TITLES] ?? {
    group: "CKBuilder",
    title: "Home",
  };

  const networkOptions = (NETWORKS as readonly Network[]).map((n) => ({
    value: n,
    label: (
      <span className="flex items-center gap-1.5 capitalize">
        <span
          className="inline-block size-1.75 rounded-full shrink-0"
          style={{ background: NETWORK_DOT_COLORS[n] }}
        />
        {n.charAt(0).toUpperCase() + n.slice(1)}
      </span>
    ),
  }));

  return (
    <div className="flex items-center px-6 h-header bg-bg-elev border-b border-app-border shadow-app shrink-0">
      {/* Left: breadcrumb + page title */}
      <div className="flex-1">
        <div className="text-hint text-text-3 leading-tight mb-px">
          {page.group}
        </div>
        <div className="text-title font-semibold text-text-1 tracking-tightest">
          {page.title}
        </div>
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-2.5">
        {/* Network selector */}
        <Select
          value={network}
          onChange={(v) => setNetwork(v as Network)}
          size="small"
          variant="filled"
          style={{ width: 130, height: 34 }}
          options={networkOptions}
        />

        {/* Theme toggle */}
        <Tooltip title={mode === "light" ? "Dark mode" : "Light mode"}>
          <Button
            type="text"
            icon={mode === "light" ? <MoonOutlined /> : <SunOutlined />}
            onClick={toggle}
            className="text-text-2!"
            style={{ height: 34, width: 34 }}
          />
        </Tooltip>

        <Divider type="vertical" style={{ height: 20, margin: 0 }} />

        {/* Wallet button */}
        <Button
          type="primary"
          icon={<WalletOutlined />}
          onClick={isConnected ? () => disconnect() : () => open()}
          style={{ height: 38, borderRadius: 10, paddingInline: 16 }}
        >
          {isConnected ? (wallet?.name ?? "Connected") : "Connect Wallet"}
        </Button>

        {/* Avatar */}
        <Tooltip title={truncated ?? "Not connected"}>
          <Avatar
            size={34}
            className="bg-primary text-white! text-hint font-semibold shrink-0 cursor-pointer"
            style={{ borderRadius: 8 }}
          >
            {avatarLabel}
          </Avatar>
        </Tooltip>
      </div>
    </div>
  );
}
