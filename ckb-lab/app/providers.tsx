"use client";

import { ConfigProvider } from "antd";
import { Provider as CccProvider } from "@ckb-ccc/connector-react";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { CLIENT_BY_NETWORK, NETWORK_LABELS, NETWORKS, readEnvNetwork } from "./lib/ccc-client";
import { NetworkSync } from "./stores/network";
import { WalletAccountSync } from "./stores/wallet";
import { ckbTheme } from "./theme";
import type { ReactNode } from "react";

function AntdThemeProvider({ children }: { children: ReactNode }) {
  const { mode } = useTheme();
  return <ConfigProvider theme={ckbTheme(mode)}>{children}</ConfigProvider>;
}

const clientOptions = NETWORKS.map((n) => ({
  name: NETWORK_LABELS[n],
  client: CLIENT_BY_NETWORK[n],
}));

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AntdThemeProvider>
        <CccProvider
          defaultClient={CLIENT_BY_NETWORK[readEnvNetwork()]}
          clientOptions={clientOptions}
        >
          <NetworkSync />
          <WalletAccountSync />
          {children}
        </CccProvider>
      </AntdThemeProvider>
    </ThemeProvider>
  );
}
