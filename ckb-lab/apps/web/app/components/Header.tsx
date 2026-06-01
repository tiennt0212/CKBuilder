"use client";

import { Button, Select, Divider, Avatar, Tooltip } from "antd";
import {
  WalletOutlined,
  MoonOutlined,
  SunOutlined,
} from "@ant-design/icons";
import { useNetwork } from "../contexts/NetworkContext";
import { useTheme } from "../contexts/ThemeContext";
import type { Network } from "ckb-utils";

const PAGE_TITLES: Record<string, { group: string; title: string }> = {
  "/transfer": { group: "Wallet", title: "Transfer CKB" },
  "/cell-explorer": { group: "Wallet", title: "Cell Explorer" },
  "/tokens": { group: "Wallet", title: "Tokens" },
  "/invoke": { group: "Smart Contracts", title: "Invoke Script" },
  "/deploy": { group: "Smart Contracts", title: "Deploy Script" },
  "/dao": { group: "Advanced", title: "Nervos DAO" },
  "/time-lock": { group: "Advanced", title: "Time Lock" },
  "/multisig": { group: "Advanced", title: "Multisig" },
  "/history": { group: "Activity", title: "Transaction History" },
};

interface HeaderProps {
  pathname: string;
}

export function Header({ pathname }: HeaderProps) {
  const { network, setNetwork } = useNetwork();
  const { mode, toggle } = useTheme();

  const page = PAGE_TITLES[pathname] ?? { group: "CKBuilder", title: "Home" };

  return (
    <div
      className="flex items-center px-6"
      style={{
        height: 64,
        background: "var(--bg-elev)",
        borderBottom: "1px solid var(--border)",
        boxShadow: "var(--shadow)",
      }}
    >
      {/* Left: breadcrumb + title */}
      <div className="flex-1">
        <div
          style={{
            fontSize: 11.5,
            color: "var(--text-3)",
            lineHeight: 1.2,
            marginBottom: 1,
          }}
        >
          {page.group}
        </div>
        <div
          style={{
            fontSize: 17,
            fontWeight: 600,
            color: "var(--text-1)",
            letterSpacing: "-0.01em",
          }}
        >
          {page.title}
        </div>
      </div>

      {/* Right cluster */}
      <div className="flex items-center" style={{ gap: 10 }}>
        {/* Network selector */}
        <Select
          value={network}
          onChange={(v) => setNetwork(v as Network)}
          size="small"
          variant="filled"
          style={{ width: 130, height: 34 }}
          options={[
            {
              value: "devnet",
              label: (
                <span className="flex items-center gap-1.5">
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: "#f59e0b",
                      display: "inline-block",
                    }}
                  />
                  Devnet
                </span>
              ),
            },
            {
              value: "testnet",
              label: (
                <span className="flex items-center gap-1.5">
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: "var(--dot)",
                      display: "inline-block",
                    }}
                  />
                  Testnet
                </span>
              ),
            },
            {
              value: "mainnet",
              label: (
                <span className="flex items-center gap-1.5">
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: "#6366f1",
                      display: "inline-block",
                    }}
                  />
                  Mainnet
                </span>
              ),
            },
          ]}
        />

        {/* Theme toggle */}
        <Tooltip title={mode === "light" ? "Dark mode" : "Light mode"}>
          <Button
            type="text"
            icon={mode === "light" ? <MoonOutlined /> : <SunOutlined />}
            onClick={toggle}
            style={{
              height: 34,
              width: 34,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-2)",
            }}
          />
        </Tooltip>

        <Divider type="vertical" style={{ height: 20, margin: 0 }} />

        {/* Wallet button — user will implement onClick */}
        <Button
          type="primary"
          icon={<WalletOutlined />}
          style={{ height: 38, borderRadius: 10, paddingInline: 16 }}
        >
          Connect Wallet
        </Button>

        {/* Avatar placeholder */}
        <Avatar
          size={34}
          style={{
            background: "var(--primary)",
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            borderRadius: 8,
            flexShrink: 0,
            cursor: "pointer",
          }}
        >
          CK
        </Avatar>
      </div>
    </div>
  );
}
