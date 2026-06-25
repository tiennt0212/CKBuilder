"use client";

import { useEffect } from "react";
import { ConfigProvider } from "antd";
import { Provider as CccProvider, useCcc } from "@ckb-ccc/connector-react";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { useNetworkStore } from "./stores/network";
import { ckbTheme } from "./theme";
import type { ReactNode } from "react";

function AntdThemeProvider({ children }: { children: ReactNode }) {
  const { mode } = useTheme();
  return <ConfigProvider theme={ckbTheme(mode)}>{children}</ConfigProvider>;
}

function NetworkSync() {
  const cccClient = useNetworkStore((s) => s.cccClient);
  const { setClient } = useCcc();

  useEffect(() => {
    setClient(cccClient);
  }, [cccClient]);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AntdThemeProvider>
        <CccProvider>
          <NetworkSync />
          {children}
        </CccProvider>
      </AntdThemeProvider>
    </ThemeProvider>
  );
}
