"use client";

import { usePathname, useRouter } from "next/navigation";
import { Menu } from "antd";
import type { MenuProps } from "antd";
import {
  SwapOutlined,
  SearchOutlined,
  GoldOutlined,
  CodeOutlined,
  CloudUploadOutlined,
  BankOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  HistoryOutlined,
  SettingOutlined,
  ApiOutlined,
} from "@ant-design/icons";
import { CubeMark } from "./CubeMark";

const TAG_XUDT = (
  <span className="text-2xs font-semibold px-[5px] py-px rounded bg-primary-tint text-primary tracking-[0.02em]">
    xUDT
  </span>
);

const TAG_RUST = (
  <span className="text-2xs font-semibold px-[5px] py-px rounded bg-rust-tint text-rust tracking-[0.02em]">
    Rust
  </span>
);

const menuItems: MenuProps["items"] = [
  {
    type: "group",
    label: "Wallet",
    children: [
      { key: "/transfer", icon: <SwapOutlined />, label: "Transfer CKB" },
      { key: "/cell-explorer", icon: <SearchOutlined />, label: "Cell Explorer" },
      {
        key: "/tokens",
        icon: <GoldOutlined />,
        label: <span className="flex items-center gap-2">Tokens {TAG_XUDT}</span>,
      },
    ],
  },
  {
    type: "group",
    label: "Smart Contracts",
    children: [
      { key: "/invoke", icon: <CodeOutlined />, label: "Invoke Script" },
      {
        key: "/deploy",
        icon: <CloudUploadOutlined />,
        label: <span className="flex items-center gap-2">Deploy Script {TAG_RUST}</span>,
      },
    ],
  },
  {
    type: "group",
    label: "Advanced",
    children: [
      { key: "/dao", icon: <BankOutlined />, label: "Nervos DAO" },
      { key: "/time-lock", icon: <ClockCircleOutlined />, label: "Time Lock" },
      { key: "/multisig", icon: <TeamOutlined />, label: "Multisig" },
    ],
  },
  {
    type: "group",
    label: "Activity",
    children: [
      { key: "/history", icon: <HistoryOutlined />, label: "Transaction History" },
    ],
  },
];

const settingsItems: MenuProps["items"] = [
  { key: "settings", icon: <SettingOutlined />, label: "Settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="flex flex-col h-full bg-sidebar-bg">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 h-header border-b border-app-border shrink-0">
        <CubeMark size={26} />
        <div>
          <div className="text-subhead font-brand text-text-1 leading-tight">
            CKBuilder
          </div>
          <div className="text-micro text-sidebar-group uppercase tracking-widest2 font-semibold">
            Bootcamp Console
          </div>
        </div>
      </div>

      {/* Menu */}
      <div className="flex-1 overflow-y-auto py-3 px-3">
        <Menu
          mode="inline"
          selectedKeys={[pathname]}
          items={menuItems}
          onClick={({ key }) => router.push(key)}
          style={{ border: "none" }}
        />
      </div>

      {/* Footer */}
      <div className="border-t border-app-border shrink-0">
        <div className="px-3 py-2">
          <Menu
            mode="inline"
            selectedKeys={[]}
            items={settingsItems}
            style={{ border: "none" }}
          />
        </div>

        {/* Node status row */}
        <div className="flex items-center gap-2 px-5 py-3 text-hint border-t border-app-border">
          <span className="size-[7px] rounded-full bg-dot shrink-0" />
          <ApiOutlined className="text-text-3 text-hint" />
          <span className="text-text-2 flex-1">RPC · testnet.ckb.dev</span>
          <span className="text-primary text-hint tabular-nums">—</span>
        </div>
      </div>
    </div>
  );
}
