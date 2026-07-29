import { ccc } from "@ckb-ccc/core";

/**
 * Named actions for known scripts.
 *
 * CKB has no ABI. A script is a RISC-V binary that reads the transaction and returns
 * 0 or non-zero — there is no on-chain metadata describing what it accepts, so an
 * action list can never be discovered from a code_hash alone. This map is therefore
 * client-side knowledge, keyed by the code_hash of scripts we happen to know about.
 *
 * A script that is not in this map is not an error: the form falls back to a raw
 * witness hex field, which is the only input that works for an arbitrary script.
 *
 * The on-chain counter (Course 10 / issue #8) is deliberately NOT registered here: it ships as
 * its own self-contained /counter page instead. Registering a "create" action here would only
 * duplicate that page's own Create button, and /invoke still could not express "increment"
 * either way — buildTypeInvokeTx always builds a brand-new output and has no path to consume a
 * specific existing outpoint as an input. See docs/counter-features.md.
 */

export interface ScriptActionArg {
  name: string;
  type: "u64" | "hex";
}

export interface ScriptAction {
  /** Stable key, e.g. "increment" */
  key: string;
  label: string;
  args: ScriptActionArg[];
  /** Encodes arg values into the payload placed in WitnessArgs.outputType. */
  encode(values: Record<string, string>): ccc.Hex;
}

/**
 * code_hash → actions.
 *
 * Deliberately empty in Course 07 — no script with a known action set has been written
 * yet, and inventing entries for scripts that do not exist would be fiction. Course 10
 * (issue #8) registers the on-chain counter here, at which point the Action dropdown
 * starts returning results with no change to the form layout.
 */
export const SCRIPT_ACTIONS: Record<string, ScriptAction[]> = {};

export function actionsForScript(codeHash: string): ScriptAction[] {
  return SCRIPT_ACTIONS[codeHash] ?? [];
}

/** Little-endian u64, the encoding CKB scripts read integers with. */
export function encodeU64LE(value: bigint): ccc.Hex {
  const bytes = new Uint8Array(8);
  let v = value;
  for (let i = 0; i < 8; i++) {
    bytes[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return ccc.hexFrom(bytes);
}
