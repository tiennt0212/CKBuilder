"use client";

import { CounterMode } from "@/features/counter/counter-mode";
import type { CounterCell } from "@/lib/ckb/counter-cells";
import { useCounterCellsStore } from "@/stores/counter-cells";
import { useDeployedScriptsStore } from "@/stores/deployed-scripts";
import { useNetworkStore } from "@/stores/network";
import { PlusOutlined } from "@ant-design/icons";
import { Button, Empty } from "antd";
import { useEffect, useState } from "react";
import { CounterActionModal } from "./CounterActionModal";
import { CounterTable } from "./CounterTable";

const CARD_STYLE = {
  borderRadius: 12,
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow)",
};

interface ModalState {
  mode: CounterMode;
  entry: CounterCell | null;
}

export function CounterPage() {
  const network = useNetworkStore((s) => s.network);
  const { cells, refresh: refreshCounterCells } = useCounterCellsStore();
  const refreshDeployedScripts = useDeployedScriptsStore((s) => s.refresh);
  const [modal, setModal] = useState<ModalState | null>(null);

  // localStorage is unavailable during SSR, so both registries can only be filled after mount.
  // Re-read on network change since every entry is network-scoped. Deployed scripts are needed
  // here too, not just inside the modal, so Create's picker has data the instant it's opened.
  useEffect(() => {
    refreshCounterCells(network);
    refreshDeployedScripts(network);
  }, [network, refreshCounterCells, refreshDeployedScripts]);

  return (
    <div className="flex flex-col h-[calc(100vh-var(--height-header)-44px)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-title font-semibold text-text-1">Counter</div>
          <div className="text-hint text-text-3">
            Counter cells this browser has created, on {network}
          </div>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setModal({ mode: CounterMode.Create, entry: null })}
        >
          Create counter
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-auto bg-bg-elev" style={CARD_STYLE}>
        {cells.length === 0 ? (
          <div className="py-16">
            <Empty description={`No tracked counters on ${network} yet`} />
          </div>
        ) : (
          <CounterTable
            cells={cells}
            onIncrement={(entry) => setModal({ mode: CounterMode.Increment, entry })}
            onDestroy={(entry) => setModal({ mode: CounterMode.Destroy, entry })}
          />
        )}
      </div>

      {modal && (
        <CounterActionModal mode={modal.mode} entry={modal.entry} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
