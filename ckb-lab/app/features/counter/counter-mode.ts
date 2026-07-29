/**
 * Where /counter gets a counter cell to act on and what it does with it: mint a new one from a
 * deployed script, increment one already tracked from an earlier session, or destroy one.
 * A single flat, top-level choice — Increment and Destroy both act on a tracked counter cell and
 * share the same "pick a cell" field, differing only in which transaction gets built.
 * Object-as-namespace so modes are compared by name, not magic string — mirrors
 * invoke/script-source.ts. Maps 1:1 to the per-row actions a future Registry table would offer.
 */
export const CounterMode = {
  Create: "create",
  Increment: "increment",
  Destroy: "destroy",
} as const;

export type CounterMode = (typeof CounterMode)[keyof typeof CounterMode];
