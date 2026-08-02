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

**Script exit code / `ValidationFailure`** — the non-zero value a rejecting script returns. CKB
assigns it no meaning beyond "rejected": the numbers are defined by the contract, so the same
code means different things in different scripts and is worthless without that script's source.
The node reports it as `ValidationFailure: see error code N on page …`. This is why
`decodeTxError` takes an exit-code map from its caller instead of holding a global table —
`/counter` supplies `COUNTER_EXIT_CODES` because it knows which contract ran, `/invoke` supplies
nothing because it does not.

**Witness / `WitnessArgs`** — per-input auxiliary data. `WitnessArgs` has three fields: `lock`
(the signature — owned by the signer), `inputType`, and `outputType`. A type script validating
outputs reads `outputType`. Writing raw bytes into `witnesses[0]` instead gets them overwritten
by signing.

**`completeInputsByCapacity()`** — CCC helper: sources enough of the signer's cells to cover the
outputs' capacity. It only ever collects cells with **no type script and no data** (its default
filter is `{ scriptLenRange: [0,1], outputDataLenRange: [0,1] }`), so it can never spend a cell
that is carrying state or tokens. It does **not** compute occupied size — `addOutput` does, at the
moment the output is added. See `../processes/gotchas.md`.

**`completeFeeBy()`** — CCC helper: tops up for the fee. Must run **after** everything that can
grow the transaction's occupied size, or the tx is left underfunded. Uses the same type-less,
data-less input filter.

**`completeInputsByUdt()`** — CCC helper: collects the signer's cells of one exact type script
until they cover the UDT amount already on the output side. It adds **no change output** — the
caller must compute the remainder and add it. Must therefore run *before* the change output
exists, or its target would include the change and it would over-collect.

**Fee rate** — shannons per KB of serialized transaction. CCC computes the actual fee.

## User-defined tokens

**xUDT** — the "extensible User-Defined Token" standard. A **type** script, not a lock: a holding
is an ordinary cell with the holder's own lock, the xUDT type script, and the amount in `data`.
There is no token contract and no balance table.

**sUDT** — xUDT's predecessor. Same data layout; xUDT accepts a bare 32-byte args as an
sUDT-compatible mode. This repo issues the 36-byte xUDT form.

**UDT cell** — a cell whose `data` **begins with** a 16-byte little-endian `u128` amount. Begins
with, not equals: xUDT may carry extension data after the amount, so a length check here is
`>= 16`, unlike the counter cell's exact `== 8`. `/cell-explorer` classifies a 16-byte-data typed
cell as `UdtCell`, which is a heuristic, not proof.

**Token identity / `type.args`** — the issuer's lock script hash (32 bytes) plus 4 flag bytes.
Since a script's identity is `blake2b(code_hash ‖ hash_type ‖ args)`, two issuers can never mint
the same token and an issued token's issuer can never change. Lose the issuing key and the supply
is frozen permanently.

**Owner mode** — the xUDT script reads `args[0..32)` as an owner lock hash. When **any input cell**
in the transaction carries a lock hashing to that value, the script skips its
`sum(inputs) >= sum(outputs)` check entirely. That is the whole minting mechanism: there is no
mint opcode and no witness. It also means an issuer's own "transfer" is validated under different
rules than a holder's, despite identical-looking raw JSON.

**Token info cell / `UniqueType`** — where a token's **decimals, name and symbol** live: a
separate cell carrying the `UniqueType` script, data laid out as
`decimals u8 | name_len u8 | name | symbol_len u8 | symbol` (verified against testnet cells). It
is tied to a token by being created in the same transaction, not by a pointer in the xUDT cell.
CCC resolves `KnownScript.UniqueType` on testnet and mainnet; this repo has **no devnet override**
for it, and the fallback is worse than an error — see `../processes/gotchas.md`. `/tokens`
neither reads nor writes it.

**Balance** — a **sum over live cells**, never a stored number. Nothing on chain records
"address X holds N tokens"; the wallet's balance is whatever its matching cells add up to right
now. This is the single idea `/tokens` exists to teach.

**Occupied capacity of a token cell** — `8 + lock + 69 type + 16 data` bytes. **146 CKB** with a
secp256k1_blake160 lock (53 bytes), **148 CKB** with OmniLock (55 bytes — 22-byte args), which is
what offckb's devnet wallet uses. Derived, not fixed: read it back off the built transaction
rather than hardcoding a figure. The CKB is a deposit returned when the cell is spent, not a fee.

**How much *new* CKB a UDT transfer needs** — usually far less than the output capacities suggest,
because the token cells being spent carry their own capacity forward. Only the shortfall comes
from plain CKB: one token cell in and two out needs one cell's worth; two in and two out needs
nothing. `completeInputsByUdt` pulls that second input on purpose (see `gotchas.md`).

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
