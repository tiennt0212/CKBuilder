# CKB glossary

Only terms that are ambiguous, CKB-specific, or used here in a narrower sense than the general
meaning. Terms a model already knows correctly are deliberately absent — adding them dilutes the
entries that matter.

CKB is a UTXO-style chain, not an account chain. If you find yourself reasoning about balances,
contract storage slots, or calling a method on a deployed contract, you have imported an
Ethereum mental model and it will produce wrong code here.

## The cell model

**Cell** — the only storage primitive. A cell has four fields: `capacity`, `lock` (a script),
`type` (an optional script), and `data` (arbitrary bytes). Cells are immutable: "updating" state
means consuming an input cell and creating an output cell in the same transaction.

**Capacity** — a cell's size budget *and* its balance, in one number. 1 CKB = 10^8 **shannons**
= 1 byte of on-chain storage. A cell must have at least as much capacity as it occupies
(`lock` + `type` + `data` + the 8-byte capacity field itself). This is why "how much CKB does
this cost" and "how big is this cell" are the same question.

**Occupied capacity** — the minimum a cell needs to exist. Computed, never guessed: the lock's
args length varies by wallet, so a formula assuming secp256k1's 20 bytes is wrong for anything
else.

**Lock script** — controls **who** can spend a cell. Runs only for **input** cells.

**Type script** — controls **what** a cell may contain and **how** it may change. Runs for both
**input and output** cells. This is the closest thing CKB has to a smart contract, and it is a
validator, not a callable object.

**Script** — `{ code_hash, hash_type, args }`. A script's identity is
`blake2b(code_hash ‖ hash_type ‖ args)` — all three fields. Two scripts differing only in `args`
are different scripts.

**GroupInput / GroupOutput** — when a script runs, it sees only the cells sharing its *exact*
script (all three fields), not every cell in the transaction. Cells with different `args` are
validated independently, in their own execution.

**Cell dep** — a transaction must explicitly list the cells holding the script binaries it
needs; the node will not go find them. A missing cell dep means the script cannot be loaded at
all, which is a different failure from the script running and rejecting.

**OutPoint** — `{ txHash, index }`, the address of a specific cell. This app uses
`${txHash}:${index}:${network}` as a localStorage key.

**Live cell** — a cell that exists and has not been consumed. The chain is the only authority on
this; a local cache can be stale.

## Script deployment and reference

**`hash_type`** — how a node resolves `code_hash` to a binary. Three values, and the choice is
not cosmetic:

| Value | `code_hash` means | Reference is |
|---|---|---|
| `data1`, `data2` | the hash of the binary's bytes | **fixed** — a new deploy is a new code hash |
| `type` | the hash of the cell's **Type ID type script** | **upgradeable** — redeploy under the same Type ID keeps the code hash |

`data` (VM0) also exists and is legacy; Manual mode on `/invoke` accepts it.

**Type ID** — a CKB convention giving a deployed cell a stable identity across redeploys, so a
script can be upgraded without every consumer changing its `code_hash`. Implemented as a type
script whose args are derived from `inputs[0]` + the output index, which is why it can only be
computed after inputs are known.

**Type ID args vs Type ID code hash** — the trap. The args are *not* the code hash. The value
that resolves is `tx.outputs[0].type.hash()`. See `../processes/gotchas.md`.

**`dep_type`** — `code` (the dep cell holds the binary directly) or `dep_group` (the dep cell
holds a list of further outpoints). This app deploys with `code`.

**`ScriptNotFound`** — the node could not resolve a `code_hash`/`hash_type` pair to a binary.
Almost always means an impossible pair was recorded at deploy time, or a cell dep is missing —
not that the script failed.

## Transactions

**"Invoking" a script** — there is no such operation. No entry point, no function selector, no
return value. A script is a RISC-V binary handed the whole transaction, returning 0 or non-zero.
To exercise one you construct a transaction that gives it a reason to run, then read the node's
verdict. A rejection is a normal outcome, not an error state.

**Witness / `WitnessArgs`** — per-input auxiliary data. `WitnessArgs` has three fields: `lock`
(the signature — owned by the signer), `inputType`, and `outputType`. A type script validating
outputs reads `outputType`. Writing raw bytes into `witnesses[0]` instead gets them overwritten
by signing.

**`completeInputsByCapacity()`** — CCC helper: sources enough of the signer's cells to cover the
outputs' occupied capacity, and sets that capacity on outputs left at `0`.

**`completeFeeBy()`** — CCC helper: tops up for the fee. Must run **after** everything that can
grow the transaction's occupied size, or the tx is left underfunded.

**Fee rate** — shannons per KB of serialized transaction. CCC computes the actual fee.

## Networks

**mainnet / testnet / devnet** — devnet is a local node run by **offCKB**, whose genesis deploys
only 5 system scripts. That is why `DEVNET_SCRIPTS` in `app/lib/ccc-client.ts` is layered over
the full testnet map rather than replacing it.

**Known script** — a system script CCC can look up by name (`Secp256k1Blake160`, `OmniLock`, …).
The lookup is a local map read, not an RPC call, so an unlisted name throws synchronously.

**offCKB** — the local CKB devnet toolchain. `offckb node` starts the chain this app talks to
when `NEXT_PUBLIC_NETWORK=devnet`.

**Indexer** — the RPC surface for querying cells by lock/type with filters. Its range filters are
half-open `[min, max)`.

## This repo's own terms

**`lab-spike` / `polished`** — the two Definition-of-Done tiers, set by a GitHub issue label.
See `../processes/definition-of-done.md`. Not CKB terminology.

**Script registry** — this app's `localStorage` record of scripts *this browser* deployed, shared
by `/deploy`, `/invoke`, and `/registry`. It is a local convenience index, not anything on-chain.

**Counter cell** — a cell carrying the `lesson-10-counter` type script, whose `data` is a raw
8-byte little-endian `u64`. No molecule encoding, no witness.
