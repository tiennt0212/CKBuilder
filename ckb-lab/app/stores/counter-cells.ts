"use client";

import {
  loadCounterCells,
  removeCounterCell,
  saveCounterCell,
  type CounterCell,
} from "@/lib/ckb/counter-cells";
import { create } from "zustand";

interface CounterCellsState {
  /** Entries for the network passed to the last refresh(), already sorted newest-first. */
  cells: CounterCell[];
  /** Re-read localStorage for one network into state. Call after mount and on network change. */
  refresh: (network: string) => void;
  add: (entry: CounterCell) => void;
  /**
   * Persist an incremented cell. Every increment spends the prior outpoint and creates a new
   * one, so the id changes on every call — a re-key, same primitive /registry's edit flow uses
   * for DeployedScript. We delete the old id first so the tracked slot moves rather than
   * duplicating.
   */
  update: (oldId: string, entry: CounterCell) => void;
  remove: (id: string, network: string) => void;
}

/**
 * Single source of truth for tracked counter-cell instances on /counter. A singleton store
 * (not per-component hook) so create/increment/destroy on one render are visible everywhere
 * without a reload. localStorage is the durable backing; the store mirrors it and every
 * mutation writes through then refreshes.
 */
export const useCounterCellsStore = create<CounterCellsState>((set) => ({
  cells: [],
  refresh: (network) => set({ cells: loadCounterCells(network) }),
  add: (entry) => {
    saveCounterCell(entry);
    set({ cells: loadCounterCells(entry.network) });
  },
  update: (oldId, entry) => {
    if (oldId !== entry.id) removeCounterCell(oldId);
    saveCounterCell(entry);
    set({ cells: loadCounterCells(entry.network) });
  },
  remove: (id, network) => {
    removeCounterCell(id);
    set({ cells: loadCounterCells(network) });
  },
}));
