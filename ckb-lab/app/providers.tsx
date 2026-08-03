"use client";

import { App, ConfigProvider } from "antd";
import { Provider as CccProvider } from "@ckb-ccc/connector-react";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { CLIENT_BY_NETWORK, NETWORK_LABELS, NETWORKS, readEnvNetwork } from "./lib/ccc-client";
import { NetworkRestore, NetworkSync, VetDevnetSwitch } from "./stores/network";
import { WalletAccountSync } from "./stores/wallet";
import { ckbTheme } from "./theme";
import type { ReactNode } from "react";

function AntdThemeProvider({ children }: { children: ReactNode }) {
  const { mode } = useTheme();
  return (
    <ConfigProvider theme={ckbTheme(mode)}>
      {/* Antd v5's static message.* / notification.* do not read ConfigProvider context, so they
          render unthemed and warn. <App> is what makes App.useApp() hand out theme-aware ones —
          NetworkRestore needs it to explain a devnet fallback. component={false} keeps it from
          adding a wrapper div around the whole tree. */}
      <App component={false}>{children}</App>
    </ConfigProvider>
  );
}

const clientOptions = NETWORKS.map((n) => ({
  name: NETWORK_LABELS[n],
  client: CLIENT_BY_NETWORK[n],
}));

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AntdThemeProvider>
        {/* `defaultClient` is the first-visit default, not "the network" — a browser that has
            already chosen one is moved off it by NetworkRestore below. It cannot carry the
            restored network itself: CccProvider's own effect has `[setClient]` deps, so changing
            this prop after mount does nothing. */}
        <CccProvider
          defaultClient={CLIENT_BY_NETWORK[readEnvNetwork()]}
          clientOptions={clientOptions}
        >
          <NetworkSync />
          <NetworkRestore />
          <VetDevnetSwitch />
          <WalletAccountSync />
          {children}
        </CccProvider>
      </AntdThemeProvider>
    </ThemeProvider>
  );
}
