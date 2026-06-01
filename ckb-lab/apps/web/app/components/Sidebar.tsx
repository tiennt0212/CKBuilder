"use client";

import { usePathname, useRouter } from "next/navigation";
import { Menu, Divider } from "antd";
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
  <span
    style={{
      fontSize: 10,
      fontWeight: 600,
      padding: "1px 5px",
      borderRadius: 4,
      background: "var(--primary-tint)",
      color: "var(--primary)",
      letterSpacing: "0.02em",
    }}
  >
    xUDT
  </span>
);

const TAG_RUST = (
  <span
    style={{
      fontSize: 10,
      fontWeight: 600,
      padding: "1px 5px",
      borderRadius: 4,
      background: "rgba(192,104,58,.12)",
      color: "#c0683a",
      letterSpacing: "0.02em",
    }}
  >
    Rust
  </span>
);

const menuItems: MenuProps["items"] = [
  {
    type: "group",
    label: "Wallet",
    children: [
      {
        key: "/transfer",
        icon: <SwapOutlined />,
        label: "Transfer CKB",
      },
      {
        key: "/cell-explorer",
        icon: <SearchOutlined />,
        label: "Cell Explorer",
      },
      {
        key: "/tokens",
        icon: <GoldOutlined />,
        label: (
          <span className="flex items-center gap-2">
            Tokens {TAG_XUDT}
          </span>
        ),
      },
    ],
  },
  {
    type: "group",
    label: "Smart Contracts",
    children: [
      {
        key: "/invoke",
        icon: <CodeOutlined />,
        label: "Invoke Script",
      },
      {
        key: "/deploy",
        icon: <CloudUploadOutlined />,
        label: (
          <span className="flex items-center gap-2">
            Deploy Script {TAG_RUST}
          </span>
        ),
      },
    ],
  },
  {
    type: "group",
    label: "Advanced",
    children: [
      {
        key: "/dao",
        icon: <BankOutlined />,
        label: "Nervos DAO",
      },
      {
        key: "/time-lock",
        icon: <ClockCircleOutlined />,
        label: "Time Lock",
      },
      {
        key: "/multisig",
        icon: <TeamOutlined />,
        label: "Multisig",
      },
    ],
  },
  {
    type: "group",
    label: "Activity",
    children: [
      {
        key: "/history",
        icon: <HistoryOutlined />,
        label: "Transaction History",
      },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: "var(--sidebar-bg)" }}
    >
      {/* Brand */}
      <div
        className="flex items-center gap-3 px-5"
        style={{ height: 64, borderBottom: "1px solid var(--border)" }}
      >
        <CubeMark size={26} />
        <div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 650,
              color: "var(--text-1)",
              lineHeight: 1.2,
            }}
          >
            CKBuilder
          </div>
          <div
            style={{
              fontSize: 11,
              color: "var(--sidebar-group-label)",
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
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
      <div style={{ borderTop: "1px solid var(--border)" }}>
        <div className="px-3 py-2">
          <Menu
            mode="inline"
            selectedKeys={[]}
            items={[
              {
                key: "settings",
                icon: <SettingOutlined />,
                label: "Settings",
              },
            ]}
            style={{ border: "none" }}
          />
        </div>
        {/* Node status */}
        <div
          className="flex items-center gap-2 px-5 py-3"
          style={{
            borderTop: "1px solid var(--border)",
            fontSize: 12,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "var(--dot)",
              flexShrink: 0,
            }}
          />
          <ApiOutlined style={{ color: "var(--text-3)", fontSize: 12 }} />
          <span style={{ color: "var(--text-2)", flex: 1 }}>
            RPC · testnet.ckb.dev
          </span>
          <span
            style={{
              color: "var(--primary)",
              fontVariantNumeric: "tabular-nums",
              fontSize: 11.5,
            }}
          >
            —
          </span>
        </div>
      </div>
    </div>
  );
}
