import { ccc } from "@ckb-ccc/core";

/**
 * Registry of scripts this browser has deployed via /deploy.
 *
 * /deploy produces a code_hash and an outpoint but had nowhere to put them, so the
 * only way to use a freshly deployed script on /invoke was to copy both by hand.
 * This registry closes that loop.
 *
 * Mirrors the localStorage shape already used for type script presets in
 * features/wallet/useCellExplorer.ts — same guards, same failure behaviour.
 */

export const LS_DEPLOYED_KEY = "ckbuilder:deployedScripts";

export interface DeployedScript {
  /** `${txHash}:${index}:${network}` */
  id: string;
  /** Filename of the uploaded binary. Shown in the /invoke script picker. */
  label: string;
  txHash: string;
  /** Always 0 — buildDeployTx pins the script cell to output index 0. */
  index: number;
  /** Data hash, or the Type ID code hash when the deploy enabled Type ID. */
  codeHash: string;
  hashType: ccc.HashType;
  /**
   * How the cell dep is read. Omitted for /deploy entries (always "code"); set explicitly
   * when a script is saved from /invoke Manual mode, which can reference a "depGroup" cell.
   */
  depType?: ccc.DepType;
  /**
   * Entries are network-scoped and filtered on read: a devnet outpoint resolves to
   * nothing on testnet, so surfacing it in the picker would only produce a
   * confusing "cell dep not found" rejection at broadcast time.
   */
  network: string;
  /** ISO8601 */
  deployedAt: string;
}

export function deployedScriptId(txHash: string, index: number, network: string): string {
  return `${txHash}:${index}:${network}`;
}

function readAll(): DeployedScript[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(LS_DEPLOYED_KEY) ?? "[]") as DeployedScript[];
  } catch {
    return [];
  }
}

export function loadDeployedScripts(network: string): DeployedScript[] {
  return readAll()
    .filter((s) => s.network === network)
    .sort((a, b) => b.deployedAt.localeCompare(a.deployedAt));
}

export function saveDeployedScript(entry: DeployedScript): void {
  if (typeof window === "undefined") return;
  const all = readAll();
  // Re-deploying the same binary yields a new txHash, so collisions only happen when
  // the same commit is recorded twice (e.g. a re-render). Replace rather than append.
  const next = [entry, ...all.filter((s) => s.id !== entry.id)];
  localStorage.setItem(LS_DEPLOYED_KEY, JSON.stringify(next));
}

export function removeDeployedScript(id: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_DEPLOYED_KEY, JSON.stringify(readAll().filter((s) => s.id !== id)));
}
