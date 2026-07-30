# Counter — Feature Documentation

The Counter page deploys, creates, increments, and destroys an on-chain **counter** — a type
script (`contracts/lesson-10-counter`) that enforces a monotonic state transition on a cell's raw
data: `output.count == input.count + 1`. It is the first type-script lesson in the app that
manages a stateful cell across multiple transactions, rather than exercising a script once.

## The one idea this page exists to teach

A lock script asks "who may spend this cell?" and runs only on inputs. A **type script** asks "is
this state transition valid?" and runs on both inputs and outputs — it is CKB's mechanism for
enforcing rules about how a cell's data may change over time, independent of who owns it.

The counter is the simplest possible demonstration: its `data` field holds a raw 8-byte
little-endian `u64`, and the contract recognizes three scenarios purely from how many cells share
its type script on each side of the transaction:

| Scenario | Group inputs | Group outputs | Rule |
|---|---|---|---|
| **Create** | 0 | 1+ | Every new cell's count must be `0` |
| **Increment** | 1 | 1 | `output.count == input.count + 1`, exactly |
| **Destroy** | 1+ | 0 | Always allowed |

No molecule, no witness — the entire state is 8 raw bytes, and the contract never reads
`script.args()` at all (the earlier hash-lock lesson does; the counter deliberately doesn't, which
is also why it avoids that lesson's atomic-instruction CKB-VM incompatibility, see the contract's
own source comments).

## Why this page is self-contained, not built on `/invoke`

`/invoke`'s `buildTypeInvokeTx` always creates exactly one brand-new output and sources inputs
only from the wallet's own plain cells — there is no path to consume a *specific existing*
outpoint and carry its lock/capacity forward, which is exactly what incrementing a counter
requires. So Counter has its own transaction builders (`app/lib/ckb/counter.ts`) and its own hook
(`app/features/counter/useCounter.ts`); `/invoke`'s action registry (`script-actions.ts`) does not
list the counter — doing so would only duplicate this page's own **Create** button, since
`/invoke` still could not express **Increment** either way.

## Create vs Existing mode

The form has one **Action** segmented at the top:

- **Create new** — pick a script this browser deployed via `/deploy` (the same registry
  `/invoke`'s Deployed mode reads), optionally label it, and submit. Builds a brand-new cell at
  `count = 0`.
- **Increment existing** — pick a counter cell this browser has created, from a separate
  **counter-cells** registry (`localStorage`, key `ckbuilder:counterCells`) distinct from the
  deployed-script registry: it tracks specific *cell instances* you own, not script binaries.
  Once selected, its `code_hash` and current outpoint show read-only, and two actions are
  available: **Increment (+1)** (the form's primary submit) and **Destroy** (a secondary button
  behind a confirmation, since it is irreversible).

## User Flow

1. Connect a CKB wallet via the header wallet button.
2. Deploy the compiled counter binary (`contracts/build/release/counter`) on **Deploy Script**
   (`/deploy`) — hash_type `data1`/`data2`/`type` all work equally, since the counter's logic
   never depends on how it's referenced.
3. Navigate to **Counter** (`/counter`).
4. **Create new** → pick the deployed script → **Create counter (count = 0)**. Watch the
   lifecycle banner reach `committed`; the new counter is now tracked and appears in Existing mode.
5. **Increment existing** → pick the tracked counter → **Increment (+1)**. Repeat as many times as
   desired — each commit re-points the tracked entry at the new outpoint the increment produced.
6. Optionally **Destroy** the counter to reclaim its capacity, once done.

## Form Fields

| Field | Mode | Default | Description |
|---|---|---|---|
| Action | both | Create new | Segmented: `Create new` / `Increment existing` |
| Counter script | Create | — | Dropdown of scripts recorded by `/deploy` on this network |
| Label | Create | empty | Optional free text, shown back in Existing mode's picker |
| Counter cell | Existing | — | Dropdown of counters this browser has created, showing label/count/outpoint |
| code_hash | Existing | from create | Read-only — the script identity pinned when the cell was created |
| outpoint | Existing | current cell | Read-only — the cell's live outpoint, updated after every increment |

`args` is not a form field: the contract reads none, so every counter cell this page creates uses
`0x`.

## The counter-cells registry

Unlike `/deploy`'s registry (which records a *script binary*), this one records a specific *cell
instance* — its outpoint changes on every increment. An entry's script identity (`code_hash`,
`hash_type`, `dep_type`, cell dep outpoint) is captured once at create time and never re-derived:
the on-chain type script a cell carries is fixed forever, but the deployed-script registry entry
it came from can later be edited, hidden, or deleted — this registry must survive both.

Only a **committed** create/increment/destroy is persisted:

- **Create** adds a new tracked entry at count `0`.
- **Increment** re-keys the existing entry to the new outpoint and bumps the count — the same
  re-keying primitive the [Script Registry](./registry-features.md)'s edit flow already uses.
- **Destroy** removes the entry.

Entries are **network-scoped**, same reasoning as the deployed-script registry: a devnet outpoint
means nothing on testnet.

## UI States

### Idle
Nothing built yet. The preview card shows a note to pick a script or a tracked counter.

### Empty registry (Create mode)
A NoteBox links to `/deploy`; the Script dropdown is disabled.

### Empty registry (Existing mode)
A NoteBox suggests switching to Create new; the Counter cell dropdown is disabled.

### Building (preview)
Form changes are debounced 400 ms, then a preview transaction is built. The preview shows a
`CellFlow` (input → output cells, capacity/lock) and a `StatePanel` (decoded before/after count).

### Raw Tab
The full raw transaction with its byte count.

### Submitting
Button shows `Processing…` and is disabled. The banner is hidden during `building`/`signing`.

### Sent / Pending / Proposed
Amber banner with the transaction hash, polled every 2 s.

### Committed
Green banner with the block number. The tracked counter-cells entry is written (add/update/remove
depending on which action ran) so it's immediately available without a reload.

### Rejected
Rust banner with the node's reason verbatim — e.g. `ERROR_COUNTER_NOT_INCREMENTED` if some other
means already changed the cell's count, or `ERROR_INVALID_CELL_COUNT` if more than one counter
cell somehow ended up on one side of the transaction.

## Edge Cases

- **No wallet** — build throws "Wallet not connected"; surfaces as a build error in the preview.
- **Counter cell already spent** — `Increment`/`Destroy` read the *live* cell from chain (not the
  tracked entry's cached count) before building; if it's gone, the build fails with "Counter cell
  not found — it may already be spent" and the preview card offers an inline **Forget this
  entry** action (local cleanup only, no transaction) to drop the stale tracked entry.
- **Network switched mid-session** — both registries are re-read and replaced; a counter created
  on another network never appears.
- **Reset mid-flight** — an incrementing run id discards stale async callbacks and a cancel token
  stops the poll loop, so a reset during signing or polling cannot resurrect old state (same
  pattern as `/deploy` and `/invoke`).
- **Destroy is irreversible** — gated behind a confirmation stating the reclaimed capacity.
