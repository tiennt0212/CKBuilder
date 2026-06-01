"use client";

import { ConfigProvider } from "antd";
import { Provider as CccProvider } from "@ckb-ccc/connector-react";
import { NetworkProvider } from "./contexts/NetworkContext";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { ckbTheme } from "./theme";
import type { ReactNode } from "react";

function AntdThemeProvider({ children }: { children: ReactNode }) {
  const { mode } = useTheme();
  return (
    <ConfigProvider theme={ckbTheme(mode)}>{children}</ConfigProvider>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AntdThemeProvider>
        <NetworkProvider>
          <CccProvider>{children}</CccProvider>
        </NetworkProvider>
      </AntdThemeProvider>
    </ThemeProvider>
  );
}
