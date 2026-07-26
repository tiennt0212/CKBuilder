# Deploy Script — Feature Documentation

The Deploy Script page lets a user upload a compiled RISC-V binary, configure deploy options (hash type, Type ID), build a CKB transaction that stores the binary as cell data, sign and broadcast it, then display the data hash / code hash and outpoint for use in subsequent scripts.

## User Flow

1. Connect a CKB wallet via the header wallet button.
2. Navigate to **Deploy Script** (`/deploy`).
3. Upload a compiled binary (`.bin`, `.so`, or any file) via the upload zone.
4. Optionally adjust the fee rate (Slow / Standard / Fast).
5. Select the **Hash Type** (`type`, `data1`, `data2`) — this determines how referencing scripts
   will look up the deployed binary.
6. Optionally enable **Type ID** to make the script upgradeable at a stable `code_hash`.
7. The **CapacityInfoPanel** shows the total CKB required (capacity + fee) and a Sufficient /
   Insufficient chip based on your wallet balance.
8. The preview card auto-builds a preview transaction and shows Data Hash, Code Hash (when Type ID
   is enabled), Capacity, and Network Fee.
9. Click **Deploy to Testnet** to sign and broadcast.  The button is disabled if balance is
   insufficient.
10. Monitor the lifecycle banner until the transaction is committed.
11. Copy the deployed outpoint from the **Outpoint** tab.

## Form Fields

| Field | Default | Description |
|---|---|---|
| Script Binary | — | Upload zone; any compiled binary file |
| Fee Rate | Slow (1,000 sh/KB) | Segmented: Slow / Standard / Fast |
| Hash Type | `data1` | Segmented: `type` / `data1` / `data2`; options are gated by Type ID (see below) |
| Enable Type ID | Off | SwitchRow; attaches a Type ID type script so `code_hash` stays stable |

## Hash Type

The `hash_type` field in CKB Script structs controls how `code_hash` is resolved:

| Value | Resolves to | Use case |
|---|---|---|
| `data` | Blake2b-256 of cell data | Legacy VM0 scripts |
| `data1` | Blake2b-256 of cell data | CKB VM1 scripts (recommended) |
| `data2` | Blake2b-256 of cell data | CKB VM2 scripts |
| `type` | Type hash of cell type script | Requires Type ID to be enabled |

`data` is omitted from the Deploy control on purpose — there is no reason to publish a new VM0
script. (Invoke keeps `data` so it can still reference older cells deployed with it.)

### hash_type and Type ID are one decision

`hash_type` and the Type ID toggle are **not** independent. A plain data cell has no type
script, so referencing it by `type` resolves to nothing — the node fails with `ScriptNotFound`
at invoke time. The Deploy form therefore couples them:

- **Type ID off** → only `data1` / `data2` are selectable; `type` is disabled.
- **Type ID on** → `hash_type` is forced to `type`.

The deployed-script registry records whichever `(code_hash, hash_type)` pair actually resolves,
so `/invoke` never inherits an impossible combination.

## Type ID

Enabling Type ID attaches a Type ID contract type script to the deployed cell at output index 0.
The Type ID args (`typeIdArgs`) are computed as:

```
typeIdArgs = hashTypeId(tx.inputs[0], outputIndex: 0)
```

This computation must occur **after** `completeInputsByCapacity` (so `tx.inputs[0]` exists) and
**before** `completeFeeBy` (so the type script's additional occupied bytes are counted in the fee).

Once deployed, the **hash of the Type ID type script** becomes the permanent `code_hash` for all
scripts that reference this cell using `hash_type: "type"`. Even if you upgrade the binary
(replace the cell data), the `code_hash` stays the same.

Note the distinction the UI now makes explicit:

| Value | What it is | Use it as |
|---|---|---|
| Type ID args | `hashTypeId(tx.inputs[0], 0)` — identifies the cell | The type script's `args` |
| Code Hash (Type ID) | `blake2b(code_hash ‖ hash_type ‖ args)` of that type script | The referencing script's `code_hash` |

A script is identified by the hash of all three of its fields, so passing the bare args as a
`code_hash` references a script that does not exist. Committed deploys record the correct pair
in the deployed-script registry — see `invoke-features.md`.

## CapacityInfoPanel

The `CapacityInfoPanel` component replaces the static NoteBox from phase 1.  It shows:

- **Required capacity** = `cellCapacity + fee` (in CKB), computed from the preview build result.
- **Balance chip**: green "Sufficient" when `balance >= required`, red "Insufficient" when
  `balance < required`, neutral placeholder before a preview build has run.
- The submit button is disabled when balance is insufficient
  (`isBalanceInsufficient = balance != null && required != null && balance < required`).

## UI States

### Idle

- Upload zone shows "No file selected".
- CapacityInfoPanel shows "— CKB" placeholder, no chip.
- Submit button is disabled until a file is selected.

### Building (preview)

- Triggered automatically when any form field changes (debounced 400 ms).
- After build completes, the preview card's Summary tab updates with:
  - **Data Hash** — Blake2b-256 of the binary, truncated + copyable.
  - **Code Hash (Type ID)** — only when Type ID is enabled; strong primary style, copyable.
  - **Capacity** — minimum capacity for the script cell in CKB.
  - **Network Fee** — estimated fee in CKB.
  - **Balance after** — remaining balance after the deploy (shown when all values available).
  - NoteBox: "Reference via out_point in cell_deps and code_hash in lock/type script."
- CapacityInfoPanel shows the Sufficient / Insufficient chip.
- A build error message appears in the preview card if the wallet is disconnected.

### Raw Tab

The Raw tab shows the **output cell JSON** (`{ capacity, lock, type, data }` from `tx.outputs[0]`
+ `tx.outputsData[0]`) — not the full transaction. This is the data stored on-chain.

### Submitting (Building → Signing → Sending)

- `TxStatusBanner` is hidden during Building and Signing phases.
- Submit button shows a loading spinner and "Processing…" label.
- All form fields are disabled while in-progress.

### Sent / Pending / Proposed

- `TxStatusBanner` appears with appropriate amber or primary-blue styling.

### Committed

- `TxStatusBanner` shows "Transaction confirmed ✓" with the block number.
- The preview card's **Outpoint** tab replaces the Summary tab and shows:
  - **TX HASH** — full hash with copy button (truncated display).
  - **DEPLOYED OUTPOINT (cell dep)** — `txHash:0x0`, copyable.
  - Script binary size in bytes.

### Rejected / Error

- `TxStatusBanner` shows a rust-red error banner with the rejection reason.
- A "← Retry" button resets the deploy state so the user can try again.

## Capacity Calculation

The minimum capacity for the deployed cell is:

```
(lock_script_bytes + 8 + binary_size_bytes [+ type_script_bytes if Type ID]) × 10^8 shannons
```

- `lock_script_bytes` = serialised lock script (varies by wallet type; secp256k1 is 53 bytes).
- `8` = the capacity field itself.
- `binary_size_bytes` = the uploaded file size.
- `type_script_bytes` ≈ 53 bytes when Type ID is enabled (adds a full type script struct).

CKB's SDK (CCC) computes this automatically via `completeInputsByCapacity` + `completeFeeBy` — the
UI shows the actual computed value, not an estimate.

## Outpoint Format

The deployed script cell is always at output index 0 of the deploy transaction. Its outpoint is:

```json
{
  "txHash": "0x<deploy-tx-hash>",
  "index": "0x0"
}
```

Copy the `txHash:0x0` string from the Outpoint tab to reference this cell as a `code` or
`depGroup` cell dep.

## Edge Cases

- **No wallet** — `buildTx` throws "Wallet not connected"; the error surfaces in the build error
  banner.
- **Insufficient balance** — CapacityInfoPanel shows the red "Insufficient" chip and the submit
  button is disabled. CCC's `completeInputsByCapacity` would also throw if forced, but the UI gate
  prevents reaching that path.
- **File too large** — No explicit size limit enforced in the UI; the limiting factor is wallet
  balance (more bytes = more capacity required).
- **Re-deploy** — The "← Retry" reset button clears state (including `dataHash`, `typeIdArgs`) so
  the user can deploy another binary without reloading the page.
- **Type ID with `hash_type: "type"` selection** — The user can select `hash_type: "type"` in the
  Segmented control and enable Type ID simultaneously; this is the intended combination for
  upgradeable scripts referenced by type hash.
