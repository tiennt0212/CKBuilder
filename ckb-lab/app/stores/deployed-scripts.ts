"use client";

import {
  loadDeployedScripts,
  readAllDeployedScripts,
  removeDeployedScript,
  saveDeployedScript,
  type DeployedScript,
} from "@/lib/ckb/deployed-scripts";
import { create } from "zustand";

interface DeployedScriptsState {
  /** Entries for the network passed to the last refresh(), already sorted newest-first. */
  scripts: DeployedScript[];
  /** Re-read localStorage for one network into state. Call after mount and on network change. */
  refresh: (network: string) => void;
  add: (entry: DeployedScript) => void;
  /**
   * Persist an edited entry. The id is derived from txHash:index:network, so an edit that
   * changes any of those changes the id — a re-key. We delete the old id first so the entry
   * moves rather than duplicating.
   */
  update: (oldId: string, entry: DeployedScript) => void;
  remove: (id: string, network: string) => void;
  toggleHidden: (id: string, network: string) => void;
}

/**
 * Single source of truth for the deployed-script registry across /deploy, /invoke and
 * /registry. A singleton store (not per-component hook) so a save on one page is visible on
 * the others without a reload. localStorage is the durable backing; the store mirrors it and
 * every mutation writes through then refreshes.
 */
export const useDeployedScriptsStore = create<DeployedScriptsState>((set) => ({
  scripts: [],
  refresh: (network) => set({ scripts: loadDeployedScripts(network) }),
  add: (entry) => {
    saveDeployedScript(entry);
    set({ scripts: loadDeployedScripts(entry.network) });
  },
  update: (oldId, entry) => {
    if (oldId !== entry.id) removeDeployedScript(oldId);
    saveDeployedScript(entry);
    set({ scripts: loadDeployedScripts(entry.network) });
  },
  remove: (id, network) => {
    removeDeployedScript(id);
    set({ scripts: loadDeployedScripts(network) });
  },
  toggleHidden: (id, network) => {
    const entry = readAllDeployedScripts().find((s) => s.id === id);
    if (!entry) return;
    saveDeployedScript({ ...entry, hidden: !entry.hidden });
    set({ scripts: loadDeployedScripts(network) });
  },
}));
