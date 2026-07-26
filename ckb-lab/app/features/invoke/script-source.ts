/**
 * Where /invoke gets a script's identity: a saved registry entry, or hand-entered fields.
 * Object-as-namespace so the two modes are compared by name, not magic string.
 */
export const ScriptSource = {
  Deployed: "deployed",
  Manual: "manual",
} as const;

export type ScriptSource = (typeof ScriptSource)[keyof typeof ScriptSource];
