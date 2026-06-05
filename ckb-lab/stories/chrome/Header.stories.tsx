import type { Meta, StoryObj } from "@storybook/react";
import { Button, Select, Divider, Avatar, Tooltip } from "antd";
import { WalletOutlined, MoonOutlined, SunOutlined } from "@ant-design/icons";

interface HeaderPreviewProps {
  group: string;
  title: string;
  network: "devnet" | "testnet" | "mainnet";
  themeMode: "light" | "dark";
  walletConnected: boolean;
  walletAddress?: string;
  walletBalance?: string;
}

const DOT_COLORS = {
  devnet: "#f59e0b",
  testnet: "var(--dot)",
  mainnet: "#6366f1",
};

function HeaderPreview({
  group,
  title,
  network,
  themeMode,
  walletConnected,
  walletAddress = "ckt1qy…m3f9a",
  walletBalance = "1,480.34 CKB",
}: HeaderPreviewProps) {
  const networkOptions = (["devnet", "testnet", "mainnet"] as const).map((n) => ({
    value: n,
    label: (
      <span className="flex items-center gap-1.5 capitalize">
        <span
          className="inline-block size-[7px] rounded-full shrink-0"
          style={{ background: DOT_COLORS[n] }}
        />
        {n.charAt(0).toUpperCase() + n.slice(1)}
      </span>
    ),
  }));

  return (
    <div
      className="flex items-center px-6 bg-bg-elev border-b border-app-border shadow-app"
      style={{ height: 64, width: 1192 }}
    >
      {/* Left */}
      <div className="flex-1">
        <div className="text-hint text-text-3 leading-tight mb-px">{group}</div>
        <div className="text-title font-semibold text-text-1 tracking-tightest">{title}</div>
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-2.5">
        <Select
          value={network}
          size="small"
          variant="filled"
          style={{ width: 130, height: 34 }}
          options={networkOptions}
        />

        <Tooltip title={themeMode === "light" ? "Dark mode" : "Light mode"}>
          <Button
            type="text"
            icon={themeMode === "light" ? <MoonOutlined /> : <SunOutlined />}
            className="text-text-2!"
            style={{ height: 34, width: 34 }}
          />
        </Tooltip>

        <Divider type="vertical" style={{ height: 20, margin: 0 }} />

        {walletConnected ? (
          <div
            className="flex items-center gap-2.5 h-[38px] px-2.5 rounded-[9px] border border-input-border cursor-pointer hover:border-primary transition-colors"
            style={{ background: "var(--wallet-bg)" }}
          >
            <span className="text-2xs font-bold text-white bg-primary px-[7px] py-[3px] rounded-[5px] tracking-[0.02em] flex-shrink-0">
              JoyID
            </span>
            <div className="flex flex-col leading-[1.25] text-left">
              <span className="text-[12.5px] font-semibold text-text-1 font-mono">
                {walletAddress}
              </span>
              <span className="text-[11px] text-text-3 tabular-nums">{walletBalance}</span>
            </div>
          </div>
        ) : (
          <Button
            type="primary"
            icon={<WalletOutlined />}
            style={{ height: 38, borderRadius: 10, paddingInline: 16 }}
          >
            Connect Wallet
          </Button>
        )}

        <Avatar
          size={34}
          className="bg-primary text-white! text-hint font-semibold shrink-0 cursor-pointer"
          style={{ borderRadius: 8 }}
        >
          CK
        </Avatar>
      </div>
    </div>
  );
}

const meta: Meta<typeof HeaderPreview> = {
  title: "Chrome/Header",
  component: HeaderPreview,
  parameters: { layout: "centered" },
  argTypes: {
    network: { control: "select", options: ["devnet", "testnet", "mainnet"] },
    themeMode: { control: "select", options: ["light", "dark"] },
  },
};
export default meta;

type Story = StoryObj<typeof HeaderPreview>;

export const DisconnectedTestnet: Story = {
  args: { group: "Wallet", title: "Transfer CKB", network: "testnet", themeMode: "light", walletConnected: false },
};

export const ConnectedJoyID: Story = {
  args: { group: "Wallet", title: "Transfer CKB", network: "testnet", themeMode: "light", walletConnected: true, walletAddress: "ckt1qy…m3f9a", walletBalance: "1,480.34 CKB" },
};

export const Mainnet: Story = {
  args: { group: "Smart Contracts", title: "Deploy Script", network: "mainnet", themeMode: "light", walletConnected: true, walletAddress: "ckb1qy…3f9a", walletBalance: "500.00 CKB" },
};

export const DarkMode: Story = {
  args: { group: "Advanced", title: "Nervos DAO", network: "testnet", themeMode: "dark", walletConnected: true, walletAddress: "ckt1qy…m3f9a", walletBalance: "2,200.00 CKB" },
};
