import { ccc } from "@ckb-ccc/core";

/**
 * xUDT (extensible User-Defined Token) chain logic — issue, transfer, and read balances.
 *
 * An xUDT holding is an ordinary cell with three things set: the holder's own lock, the xUDT
 * *type* script, and a 16-byte little-endian u128 amount at the start of `data`. There is no
 * token contract holding a balance table — a holder's balance is a SUM over their live cells,
 * and nothing on chain records "address X holds N tokens".
 *
 * The token's identity is `type.args` = the issuer's lock script hash + 4 flag bytes. Because a
 * script's identity is blake2b(code_hash ‖ hash_type ‖ args), two different issuers can never
 * produce the same token, and an issued token's issuer can never be changed.
 *
 * Deliberately not using @ckb-ccc/udt: only `core` and `connector-react` are installed here, and
 * CLAUDE.md lists adding a dependency as a don't-decide-alone item. Everything this file needs
 * (Script.fromKnownScript, addCellDepsOfKnownScripts, completeInputsByUdt) is already in `core`.
 */

/**
 * The 4 xUDT extension flag bytes, all zero = "no extension". The xUDT script also accepts a bare
 * 32-byte args (sUDT-compatible mode), but the 36-byte form is what the Nervos docs, explorers and
 * offckb tooling assume, so tokens issued here stay legible to other tools.
 */
const XUDT_NO_EXTENSION_FLAGS = "0x00000000";

/** Byte length of the u128 amount prefix in an xUDT cell's data field. */
const UDT_AMOUNT_BYTES = 16;

const U128_MAX = 2n ** 128n - 1n;

export function encodeUdtAmount(amount: bigint): ccc.Hex {
  // Guard before numLeToBytes, whose own overflow error is a bare "number overflow" with no clue
  // which value or which field caused it.
  if (amount < 0n || amount > U128_MAX) {
    throw new Error(`xUDT amount must fit in a u128 — got ${amount}`);
  }
  return ccc.hexFrom(ccc.numLeToBytes(amount, UDT_AMOUNT_BYTES));
}

/**
 * Read the amount from an xUDT cell's data.
 *
 * The length check is `< 16`, NOT `!== 16` as in decodeCounterData — and that difference is
 * load-bearing. A counter cell's data IS its 8-byte state, so any other length is corrupt. An
 * xUDT cell is allowed to carry extension data after the 16-byte amount, so rejecting a 20-byte
 * cell would make a perfectly valid token invisible in the balance list.
 */
export function decodeUdtAmount(data: ccc.HexLike): bigint {
  const bytes = ccc.bytesFrom(data);
  if (bytes.length < UDT_AMOUNT_BYTES) {
    throw new Error(
      `xUDT cell data must be at least ${UDT_AMOUNT_BYTES} bytes, got ${bytes.length}`
    );
  }
  return ccc.numFromBytes(bytes.slice(0, UDT_AMOUNT_BYTES));
}

/** The xUDT type-script args identifying the token issued by `ownerLock`. */
export function udtArgsFromOwnerLock(ownerLock: ccc.ScriptLike): ccc.Hex {
  return ccc.hexFrom(ccc.bytesConcat(ccc.Script.from(ownerLock).hash(), XUDT_NO_EXTENSION_FLAGS));
}

/** The issuer's lock hash carried by a token's args — the leading 32 bytes. */
export function ownerLockHashFromUdtArgs(args: ccc.HexLike): ccc.Hex {
  return ccc.hexFrom(ccc.bytesFrom(args).slice(0, 32));
}

/**
 * Resolve the network's xUDT script for a token. A local map read, not an RPC — an unlisted name
 * throws synchronously, which is why devnet layers its overrides on top of the testnet set in
 * ccc-client.ts rather than replacing it.
 *
 * Kept as the single place KnownScript.XUdt is named, so no hook or page ever has to know which
 * known script backs this page.
 */
export async function resolveUdtType(client: ccc.Client, args: ccc.HexLike): Promise<ccc.Script> {
  return ccc.Script.fromKnownScript(client, ccc.KnownScript.XUdt, args);
}

/**
 * Guarantee the issuer's lock appears among the inputs. This is the ONLY thing that puts the xUDT
 * script into owner mode: it reads args[0..32) as an owner lock hash, and when any input cell
 * carries a lock hashing to that value it skips the sum(inputs) >= sum(outputs) check entirely.
 * There is no mint opcode and no witness — minting from nothing is legal precisely because the
 * owner lock is present and has already accepted the signature.
 *
 * completeInputsByCapacity *usually* achieves this as a side effect, because Signer.findCells
 * iterates getAddressObjs() in order and getRecommendedAddressObj() is index 0. But "usually" is
 * no basis for a consensus check: a multi-lock wallet whose recommended lock holds no plain cells
 * would be funded entirely from lock #2, and the node would reject with an opaque xUDT script
 * error at broadcast, far from the cause.
 */
async function ensureOwnerInput(
  tx: ccc.Transaction,
  signer: ccc.Signer,
  ownerLock: ccc.Script
): Promise<void> {
  const ownerLockHash = ownerLock.hash();

  // completeInputs adds inputs via addInput(cell) with the full Cell, so getCell() here resolves
  // from the already-populated input rather than re-querying the node.
  for (const input of tx.inputs) {
    const { cellOutput } = await input.getCell(signer.client);
    if (cellOutput.lock.hash() === ownerLockHash) {
      return;
    }
  }

  // Same type-less, data-less filter completeInputsByCapacity uses, so this can only ever pull a
  // plain CKB cell — never one of the wallet's own token cells.
  for await (const cell of signer.client.findCells(
    {
      script: ownerLock,
      scriptType: "lock",
      scriptSearchMode: "exact",
      filter: { scriptLenRange: [0, 1], outputDataLenRange: [0, 1] },
    },
    "asc",
    1
  )) {
    tx.addInput(cell);
    return;
  }

  throw new Error(
    "No plain CKB cell found under your issuing address — owner-mode minting requires the issuing lock among the inputs, so send some CKB to that address first"
  );
}

export interface BuildIssueUdtTxParams {
  signer: ccc.Signer;
  /** Raw u128 amount to mint. Not scaled by any decimals — xUDT stores none. */
  amount: bigint;
  /** Recipient address. Defaults to the issuer's own address when omitted. */
  to?: string;
  feeRate?: number;
}

export interface IssueUdtTxResult {
  tx: ccc.Transaction;
  /** The type script the new cell carries. Its args are this token's identity, permanently. */
  type: ccc.Script;
  ownerLockHash: ccc.Hex;
  /** Occupied capacity of the new token cell, in shannons — CKB the issuer locks up, not a fee. */
  udtCellCapacity: bigint;
}

/**
 * Mint `amount` of the signer's own token into a single new cell.
 *
 * Call order is addOutput → addCellDepsOfKnownScripts → completeInputsByCapacity →
 * ensureOwnerInput → completeFeeBy. ensureOwnerInput sits between the two completion calls
 * deliberately: it only ever ADDS an input, so it cannot invalidate the capacity arithmetic above
 * it, and it must run before completeFeeBy because an extra input changes the serialized size and
 * therefore the fee.
 */
export async function buildIssueUdtTx({
  signer,
  amount,
  to,
  feeRate,
}: BuildIssueUdtTxParams): Promise<IssueUdtTxResult> {
  if (amount <= 0n) {
    throw new Error(
      "Issue amount must be greater than zero — a zero-amount cell would still occupy ~146-148 CKB and carry nothing"
    );
  }

  const { script: ownerLock } = await signer.getRecommendedAddressObj();
  const type = await resolveUdtType(signer.client, udtArgsFromOwnerLock(ownerLock));

  // Minting to yourself is the common case, so `to` is optional. Address.fromString throws on a
  // malformed or wrong-network address; that error is left to propagate untranslated so the hook
  // can attribute it to the address field rather than to the chain call that follows.
  let recipientLock = ownerLock;
  if (to) {
    recipientLock = (await ccc.Address.fromString(to, signer.client)).script;
  }

  const tx = ccc.Transaction.from({});

  // Capacity is intentionally omitted: CellOutput.from computes it as occupiedSize + data length
  // when capacity is 0/absent AND the data argument is passed. Passing the data argument is not
  // optional — omit it and the cell stays at 0 capacity and the whole tx silently under-funds.
  tx.addOutput({ lock: recipientLock, type }, encodeUdtAmount(amount));

  // Resolves the network's xUDT dep for us instead of a hardcoded outpoint. On testnet the dep is
  // pinned by Type ID, so this costs one extra indexer lookup on first use (client-cached after).
  await tx.addCellDepsOfKnownScripts(signer.client, ccc.KnownScript.XUdt);

  await tx.completeInputsByCapacity(signer);
  await ensureOwnerInput(tx, signer, ownerLock);
  await tx.completeFeeBy(signer, feeRate);

  return {
    tx,
    type,
    ownerLockHash: ownerLock.hash(),
    udtCellCapacity: tx.outputs[0].capacity,
  };
}

export interface BuildTransferUdtTxParams {
  signer: ccc.Signer;
  /**
   * The token to move, by its xUDT type-script args. Comes from the balance list and is never
   * re-derived from the sender — a holder is usually not the issuer.
   */
  udtArgs: ccc.Hex;
  /** Recipient CKB address. */
  to: string;
  /** Raw u128 amount. */
  amount: bigint;
  feeRate?: number;
}

export interface TransferUdtTxResult {
  tx: ccc.Transaction;
  type: ccc.Script;
  /** Token returned to the sender; 0n when the collected inputs matched the amount exactly. */
  changeAmount: bigint;
  /** Capacity of the recipient's new token cell — CKB that leaves the sender with the tokens. */
  recipientCellCapacity: bigint;
  /** Capacity of the sender's token change cell, or 0n when there is none. */
  changeCellCapacity: bigint;
}

/**
 * Move `amount` of an existing token to another address, returning the remainder to the sender.
 *
 * The ordering below IS the builder — every step depends on the one before it:
 *
 *   1. add the recipient output first, because completeInputsByUdt reads getOutputsUdtBalance()
 *      as its collection target.
 *   2. completeInputsByUdt BEFORE the change output. With the change output already present its
 *      target would include the change, and it would collect roughly double — silently
 *      over-collecting rather than erroring.
 *   3. the change output BEFORE completeInputsByCapacity, because the change cell adds its own
 *      ~146-148 CKB of occupied capacity. Adding it afterwards leaves the tx short by exactly one
 *      cell minimum — the same bug class as hashTypeId() after completeFeeBy().
 *   4. completeInputsByCapacity and completeFeeBy last, and they cannot touch the tokens: both
 *      default their cell filter to { scriptLenRange: [0,1], outputDataLenRange: [0,1] }, i.e.
 *      cells with no type script and no data. The wallet's token cells are structurally invisible
 *      to them, which is why fee collection can never silently spend the user's balance.
 */
export async function buildTransferUdtTx({
  signer,
  udtArgs,
  to,
  amount,
  feeRate,
}: BuildTransferUdtTxParams): Promise<TransferUdtTxResult> {
  if (amount <= 0n) {
    throw new Error("Transfer amount must be greater than zero");
  }

  const type = await resolveUdtType(signer.client, udtArgs);
  const { script: senderLock } = await signer.getRecommendedAddressObj();
  const recipientLock = (await ccc.Address.fromString(to, signer.client)).script;

  const tx = ccc.Transaction.from({});
  tx.addOutput({ lock: recipientLock, type }, encodeUdtAmount(amount));

  // Collects the sender's cells for this exact type script until they cover the outputs. It stops
  // on an exact match OR on an overshoot with at least two inputs — so when one cell already
  // covers the amount with surplus it deliberately pulls a second. That is not waste: a surplus
  // means a change cell is coming, and the second input contributes the ~146-148 CKB that change cell
  // will occupy. Two inputs fund two outputs exactly.
  //
  // Throws ErrorTransactionInsufficientCoin when the wallet is short of THIS TOKEN (not of CKB).
  await tx.completeInputsByUdt(signer, type);

  // getInputsUdtBalance matches the type script exactly, while the indexer filter behind
  // completeInputsByUdt matches args by PREFIX. A hostile token whose args merely extend ours
  // would therefore be collected but not counted, understating the change. That needs an attacker
  // to craft args extending a 36-byte owner-hash-plus-flags, so it is noted rather than defended
  // against — a filter here would be dead code in every realistic case.
  const changeAmount =
    (await tx.getInputsUdtBalance(signer.client, type)) - tx.getOutputsUdtBalance(type);

  if (changeAmount > 0n) {
    tx.addOutput({ lock: senderLock, type }, encodeUdtAmount(changeAmount));
  }

  await tx.addCellDepsOfKnownScripts(signer.client, ccc.KnownScript.XUdt);

  await tx.completeInputsByCapacity(signer);
  await tx.completeFeeBy(signer, feeRate);

  return {
    tx,
    type,
    changeAmount,
    recipientCellCapacity: tx.outputs[0].capacity,
    changeCellCapacity: changeAmount > 0n ? tx.outputs[1].capacity : 0n,
  };
}

export interface UdtBalance {
  /** The token's xUDT type-script args — its stable identity on this chain. */
  args: ccc.Hex;
  /** Issuer's lock hash, the leading 32 bytes of `args`. */
  ownerLockHash: ccc.Hex;
  /** Resolved type script, ready to hand back to a builder. */
  type: ccc.Script;
  /** Sum of the u128 amounts across every live cell the wallet holds for this token. */
  amount: bigint;
  /** How many live cells back that sum — the balance IS this sum, not a stored number. */
  cellCount: number;
  /** Total CKB capacity locked inside those cells, in shannons. */
  capacity: bigint;
  /** True when this wallet's own lock issued the token. */
  isIssuer: boolean;
}

/**
 * Every xUDT the signer holds, grouped by token.
 *
 * One indexer query covers all tokens at once: the indexer prefix-matches `filter.script`, so an
 * xUDT script with empty args matches every xUDT cell regardless of which token it is.
 *
 * `maxCells` is a hard stop, not a nicety. client.findCells' `limit` is the PAGE size and the
 * generator pages until exhaustion, so an unbounded loop here would run on a code path the page
 * re-enters after every commit.
 */
export async function loadUdtBalances(signer: ccc.Signer, maxCells = 500): Promise<UdtBalance[]> {
  const addresses = await signer.getAddressObjs();
  const myLockHashes = new Set(addresses.map((a) => a.script.hash()));

  const probe = await resolveUdtType(signer.client, "0x");

  const groups = new Map<string, UdtBalance>();
  let scanned = 0;

  // Note this spans ALL the signer's locks, matching how the wallet reports its CKB balance —
  // while transfer change always goes to getRecommendedAddressObj(). A multi-lock wallet can
  // therefore see a balance under one lock and receive change under another.
  for await (const cell of signer.findCells(
    { script: probe, outputDataLenRange: [UDT_AMOUNT_BYTES, "0xffffffff"] },
    true,
    "asc",
    100
  )) {
    if (++scanned > maxCells) break;

    const cellType = cell.cellOutput.type;
    if (!cellType) continue;

    const args = ccc.hexFrom(cellType.args);
    const existing = groups.get(args);
    if (existing) {
      existing.amount += decodeUdtAmount(cell.outputData);
      existing.cellCount += 1;
      existing.capacity += cell.cellOutput.capacity;
      continue;
    }

    const ownerLockHash = ownerLockHashFromUdtArgs(args);
    groups.set(args, {
      args,
      ownerLockHash,
      type: cellType,
      amount: decodeUdtAmount(cell.outputData),
      cellCount: 1,
      capacity: cell.cellOutput.capacity,
      isIssuer: myLockHashes.has(ownerLockHash),
    });
  }

  return [...groups.values()].sort((a, b) => {
    if (a.isIssuer !== b.isIssuer) return a.isIssuer ? -1 : 1;
    return a.amount === b.amount ? 0 : a.amount > b.amount ? -1 : 1;
  });
}
