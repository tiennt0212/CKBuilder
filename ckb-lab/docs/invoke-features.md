# Invoke Script — Feature Documentation

The Invoke Script page builds a CKB transaction that exercises a previously deployed script as a **type script**. The user picks a script this browser deployed via `/deploy`, supplies its `args`, optional witness data and cell data, and the page builds, signs and broadcasts a transaction whose output cell carries that script. The node runs the script during verification; the page reports whether it accepted the transaction.

## The one idea this page exists to teach

You do not call a CKB script. There is no entry point, no function selector, no return value you can read. A script is a RISC-V binary that receives the whole transaction and returns 0 (accept) or non-zero (reject).

So "invoking" a script means: build a transaction that gives the script a reason to run, and see whether the node accepts it. Concretely, this page attaches the script to an output cell as its **type script**, and includes the deployed cell in `cell_deps` so the node can find the binary.

A rejected transaction is therefore a first-class outcome, not a bug. When the script returns non-zero the banner shows `rejected` with a decoded explanation — what failed, why, and where there is one, a next step — keeping the node's own wording underneath, collapsed. `/invoke` runs arbitrary scripts, so it deliberately passes no exit-code table: the number is shown bare, labelled as contract-defined, because reading one contract's code through another's table would be a confident lie.

## Lock vs Type

| | Lock script | Type script |
|---|---|---|
| Answers | "Who may spend this cell?" | "Is this state transition valid?" |
| Runs on | **input** cells only | **input and output** cells |
| Optional? | No — every cell has one | Yes |
| Witness | Needed, to prove authorisation | Only if the script chooses to read one |

This page implements the **Type** path only. Attaching a type script to an output is a single transaction and needs nothing to exist beforehand, which makes it the smallest complete demonstration.

The **Lock** path needs two transactions — one to create a cell locked by the script, another to spend it supplying a witness — and is deferred to issues #62 (the lock path itself) and #63 (hash-lock end-to-end), where the hash lock gives a witness something real to prove.

## Script source: Deployed vs Manual

The form has two sources, chosen by a **Script source** segmented at the top:

- **Deployed** — pick a script this browser deployed via `/deploy`, from a dropdown. Its
  `(code_hash, hash_type, outpoint)` come from the registry, so nothing can be mistyped. In this
  mode **hash_type is read-only** — it is a property of the deployed script, not a choice, and
  fixing it removes the trap of selecting a value that yields `ScriptNotFound`. The dropdown lists
  only **non-hidden** registry entries (hide/unhide from the [Script Registry](./registry-features.md)).
- **Manual** — enter `code_hash`, `hash_type`, the cell dep outpoint (`tx hash` + `index`) and
  `dep_type` by hand. This references *any* script, including ones you did not deploy and legacy
  `data` (VM0) cells. hash_type is fully editable here. A **Save to registry** button opens the
  registry drawer (Create mode) prefilled from these fields, where you set a label and confirm —
  the drawer is the single place registry entries are created and edited.

## User Flow

1. Connect a CKB wallet via the header wallet button.
2. Deploy a script on **Deploy Script** (`/deploy`), or have its code hash + outpoint ready for Manual mode.
3. Navigate to **Invoke Script** (`/invoke`).
4. Choose **Deployed** and pick a script, or **Manual** and enter the script's identity by hand.
5. Supply **Script args** if the script expects any.
6. Supply **Witness data** and **Cell data** if the script reads them.
7. Optionally attach extra capacity beyond the computed minimum.
8. The preview card auto-builds a preview transaction showing the code hash, capacity and fee.
9. Click **Build & send transaction** to sign and broadcast.
10. Watch the lifecycle banner: `sending → sent → pending → proposed → committed`, or `rejected`.

## Form Fields

| Field | Mode | Default | Description |
|---|---|---|---|
| Script source | both | Deployed | Segmented: `Deployed` / `Manual` |
| Script | Deployed | — | Dropdown of scripts recorded by `/deploy` on this network |
| hash_type | Deployed | from the deploy record | **Read-only** — the value the script was deployed with |
| dep_type | Deployed | from the deploy record | **Read-only** — `code` for `/deploy` entries; shown for parity with Manual |
| code_hash | Manual | — | 32-byte hex identifying the script code |
| hash_type | Manual | `data1` | Segmented: `type` / `data` / `data1` / `data2`; editable |
| Cell dep | Manual | index `0` | Outpoint of the code cell: `tx hash` + output `index` |
| dep_type | Manual | `code` | Segmented: `code` / `dep_group` — see Cell Deps below |
| Script args | both | `0x` | The script's own `args` field |
| Action | both | hidden | Only shown when the script is in the action registry — see below |
| Witness data | both | empty | Hex placed in `WitnessArgs.outputType` |
| Cell data | both | empty | Hex stored as the output cell's data |
| Attach capacity | both | 0 | CKB added on top of the computed minimum |

## The deployed-script registry

`/deploy` produced a code hash and an outpoint but had nowhere to put them, so using a freshly deployed script meant copying both by hand. Committed deploys are now recorded in `localStorage` under `ckbuilder:deployedScripts` and offered here as a dropdown.

Entries record whichever `(code_hash, hash_type)` pair actually resolves:

- Type ID enabled → the **hash of the Type ID type script**, at `hash_type: "type"`
- Type ID disabled → the **data hash**, at the `hash_type` chosen during deploy

Entries are **network-scoped** and filtered on read. A devnet outpoint resolves to nothing on testnet, so offering it would only produce a confusing "cell dep not found" rejection at broadcast time.

Only committed deploys are recorded — a rejected transaction leaves no live cell for a cell dep to resolve against.

## Witness data

The witness payload goes into `WitnessArgs.outputType`, not into `witnesses[0]` as raw bytes.

Input 0 belongs to the signer, so its secp256k1 signature owns `witnesses[0]`; raw hex written there is overwritten by `signTransaction`. The structured `WitnessArgs` lets the signer fill the `lock` field while leaving `outputType` intact, and `outputType` is the field a type script validating outputs is expected to read.

Note this is the opposite of the Lock path: there the custom-locked cell *is* input 0, so a raw witness at `witnesses[0]` is correct.

## Action registry

The artboard shows an **Action** dropdown, but CKB has no ABI — there is no on-chain metadata describing what a script accepts, so an action list can never be derived from a `code_hash` alone.

`lib/ckb/script-actions.ts` is therefore a client-side map keyed by `code_hash`. It is still **empty**: no script with a known action set has been registered, and inventing entries for scripts that do not exist would be fiction. Every script currently falls back to the raw witness hex field, which is the only input that works for an arbitrary script.

The counter ships as its own self-contained [Counter](./counter-features.md) page instead of registering here: `/invoke` can express the counter's *creation* step but has no path to express *increment* (it always sources inputs from the wallet's own plain cells, never a specific existing outpoint), so a "create" entry here would only duplicate Counter's own button.

Epic #88 reframes this whole model: the current `ScriptAction.encode()` shape assumes an action is a different witness payload — Ethereum's calldata picture — whereas on CKB an action lives in the *shape* of the transaction. Both `counter.ts` and `udt.ts` already had to hand-write builders because they could not be expressed through this page's single template. Read #88 before filling this map in.

## Cell Deps

Without a cell dep pointing at the deployed cell, the node cannot load the script binary and fails to resolve the type script — regardless of whether the script itself would have passed.

`dep_type` controls **what the referenced cell's data holds**:

| dep_type | The cell dep's data is | The node |
|---|---|---|
| `code` | the RISC-V binary itself | runs it directly |
| `dep_group` | a molecule list of outpoints (`OutPointVec`) | loads *every* cell in the list |

`dep_group` bundles several cell deps behind a single outpoint. The classic example is the
built-in **secp256k1-blake160** lock, which needs both its binary and a pre-computed group table;
CKB packages them into one `dep_group` cell so every transaction references just one outpoint.

Deployed mode always uses `code`, because `/deploy` writes a plain script cell. Manual mode
exposes the choice, so a script bundled as a `dep_group` (e.g. a system script) can be referenced
too. Rule of thumb: **a script you deployed yourself → `code`; a bundled system script → `dep_group`.**

Cell deps must reference **live** cells. If the deployed cell is ever consumed, every transaction referencing it starts failing.

## Capacity Calculation

The output capacity is left at 0 and computed by `completeInputsByCapacity` from the real lock + type + data bytes. A hardcoded formula would be wrong for any wallet whose lock args are not the secp256k1 default of 20 bytes.

**Attach capacity** adds on top of that minimum, for a cell whose data is expected to grow later. It is applied *before* `completeFeeBy`, because raising the output capacity increases what the inputs must cover and `completeFeeBy` is what tops up the shortfall.

## UI States

### Idle
No script selected. The preview card shows a note explaining that the script runs as a validator during verification. Submit is disabled when the registry is empty.

### Empty registry
A NoteBox links to `/deploy` and explains that entries are network-scoped. The Script dropdown is disabled.

### Building (preview)
Form changes are debounced 400 ms, then a preview transaction is built. Summary rows appear individually as their data becomes available. Build failures show inline in rust-tinted text rather than as a banner.

### Raw Tab
Two blocks: `type_script + cell_deps` (with witnesses) showing exactly what makes the script run, and the full raw transaction with its byte count.

### Submitting
Button shows `Processing…` and is disabled. The banner is hidden during `building` and `signing` — those states are conveyed by the button's loading state.

### Sent / Pending / Proposed
Amber banner (primary for `proposed`) with the transaction hash. Polled every 2 s.

### Committed
Green banner with the block number and an Explorer link (omitted on devnet). The preview card confirms **"Script returned 0 — transaction committed"** — the script accepted the transaction.

### Rejected / Error
Rust banner carrying the node's reason verbatim. For this page a rejection usually means the script itself returned non-zero, which is the lesson rather than a failure of the app.

## Edge Cases

- **No wallet** — build throws "Wallet not connected"; the message surfaces as a build error in the preview card.
- **Empty registry** — the Script dropdown is disabled and a NoteBox points at `/deploy`.
- **Network switched mid-session** — the registry is re-read and the list is replaced; a script deployed on another network never appears.
- **Deployed cell consumed** — the cell dep no longer resolves and the node rejects the transaction; the reason appears in the banner.
- **Wrong hash_type** — `hash_type` is prefilled correctly but editable, so choosing a mismatched one produces a resolution failure. This is deliberate: seeing it fail is how the field's meaning lands.
- **Empty hex fields** — blank or `0x` is normalised to "not supplied" rather than sent as an empty witness, so a script that reads no witness is unaffected.
- **Reset mid-flight** — an incrementing run id discards stale async callbacks and a cancel token stops the poll loop, so a reset during signing or polling cannot resurrect old state.
