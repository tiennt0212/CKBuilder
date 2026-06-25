"use client";

import { Divider, Tooltip, Button } from "antd";
import { MoonOutlined, SunOutlined } from "@ant-design/icons";
import { useTheme } from "../contexts/ThemeContext";
import { PAGE_TITLES } from "@/lib/routes";
import { NetworkPill } from "./NetworkPill";
import { WalletButton } from "./WalletButton";

interface HeaderProps {
  pathname: string;
}

export function Header({ pathname }: HeaderProps) {
  const { mode, toggle } = useTheme();
  const page = PAGE_TITLES[pathname as keyof typeof PAGE_TITLES] ?? {
    group: "CKBuilder",
    title: "Home",
  };

  return (
    <div className="flex items-center px-6 h-header bg-bg-elev border-b border-app-border shadow-app shrink-0">
      {/* Left: breadcrumb + page title */}
      <div className="flex-1">
        <div className="text-hint text-text-3 leading-tight mb-px">{page.group}</div>
        <div className="text-title font-semibold text-text-1 tracking-tightest">{page.title}</div>
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-2.5">
        <NetworkPill />
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
        <WalletButton />
      </div>
    </div>
  );
}
