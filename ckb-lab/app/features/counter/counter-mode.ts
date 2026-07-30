/**
 * Where /counter gets a counter cell to act on and what it does with it: mint a new one from a
 * deployed script, increment one already tracked from an earlier session, or destroy one.
 * A single flat, top-level choice — Increment and Destroy both act on a tracked counter cell and
 * share the same "pick a cell" field, differing only in which transaction gets built.
 * Object-as-namespace so modes are compared by name, not magic string — mirrors
 * invoke/script-source.ts. Maps 1:1 to the per-row actions CounterTable offers (Increment/Destroy)
 * plus the page-level Create button, each opening CounterActionModal with this as a fixed mode.
 */
export const CounterMode = {
  Create: "create",
  Increment: "increment",
  Destroy: "destroy",
} as const;

export type CounterMode = (typeof CounterMode)[keyof typeof CounterMode];

/** Shared title/subtitle text — single source so CounterActionModal's title bar and
 * CounterModalForm's card heading can't drift into wording each mode differently. */
export const COUNTER_MODE_META: Record<CounterMode, { title: string; subtitle: string }> = {
  [CounterMode.Create]: {
    title: "Create counter",
    subtitle: "Mint a new on-chain counter cell",
  },
  [CounterMode.Increment]: {
    title: "Increment counter",
    subtitle: "Increment this counter's on-chain value by 1",
  },
  [CounterMode.Destroy]: {
    title: "Destroy counter",
    subtitle: "Consume this cell and reclaim its capacity",
  },
};
