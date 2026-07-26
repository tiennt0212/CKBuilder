"use client";

import { RegistryDrawer, type RegistryDrawerMode } from "@/components/RegistryDrawer";
import type { DeployedScript } from "@/lib/ckb/deployed-scripts";
import { useDeployedScriptsStore } from "@/stores/deployed-scripts";
import { useNetworkStore } from "@/stores/network";
import { PlusOutlined } from "@ant-design/icons";
import { Button, Empty } from "antd";
import { useEffect, useState } from "react";
import { RegistryTable } from "./RegistryTable";

const CARD_STYLE = {
  borderRadius: 12,
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow)",
};

interface DrawerState {
  mode: RegistryDrawerMode;
  initial: Partial<DeployedScript> | null;
}

export function RegistryPage() {
  const network = useNetworkStore((s) => s.network);
  const { scripts, refresh, remove, toggleHidden } = useDeployedScriptsStore();
  const [drawer, setDrawer] = useState<DrawerState | null>(null);

  // localStorage is unavailable during SSR, so the store can only be filled after mount.
  // Re-reads on network change because entries are network-scoped.
  useEffect(() => {
    refresh(network);
  }, [network, refresh]);

  return (
    <div className="flex flex-col h-[calc(100vh-var(--height-header)-44px)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-title font-semibold text-text-1">Script Registry</div>
          <div className="text-hint text-text-3">
            Scripts this browser has deployed or saved, on {network}
          </div>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setDrawer({ mode: "create", initial: null })}
        >
          Add script
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-auto bg-bg-elev" style={CARD_STYLE}>
        {scripts.length === 0 ? (
          <div className="py-16">
            <Empty description={`No scripts saved on ${network} yet`} />
          </div>
        ) : (
          <RegistryTable
            scripts={scripts}
            onView={(entry) => setDrawer({ mode: "view", initial: entry })}
            onEdit={(entry) => setDrawer({ mode: "edit", initial: entry })}
            onDelete={(id) => remove(id, network)}
            onToggleHidden={(id) => toggleHidden(id, network)}
          />
        )}
      </div>

      {drawer && (
        <RegistryDrawer
          mode={drawer.mode}
          initial={drawer.initial}
          network={network}
          onClose={() => setDrawer(null)}
        />
      )}
    </div>
  );
}
