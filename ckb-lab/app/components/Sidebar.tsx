"use client";

import { usePathname } from "next/navigation";
import { Menu } from "antd";
import { SettingOutlined, ApiOutlined } from "@ant-design/icons";
import { CubeMark } from "./CubeMark";
import { NAV_ITEMS } from "@/lib/nav-items";

const settingsItems = [{ key: "settings", icon: <SettingOutlined />, label: "Settings" }];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full bg-sidebar-bg">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 h-header border-b border-app-border shrink-0">
        <CubeMark size={26} />
        <div>
          <div className="text-subhead font-brand text-text-1 leading-tight">CKBuilder</div>
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
          items={NAV_ITEMS}
          style={{ border: "none" }}
        />
      </div>

      {/* Footer */}
      <div className="border-t border-app-border shrink-0">
        <div className="px-3 py-2">
          <Menu mode="inline" selectedKeys={[]} items={settingsItems} style={{ border: "none" }} />
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
