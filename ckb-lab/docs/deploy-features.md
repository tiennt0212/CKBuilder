# Deploy Script — Feature Documentation

The Deploy Script page lets a user upload a compiled RISC-V binary, configure fee settings, build a CKB transaction that stores the binary as cell data, sign and broadcast it, then display the resulting outpoint for use as a cell dep in subsequent scripts.

## User Flow

1. Connect a CKB wallet via the header wallet button.
2. Navigate to **Deploy Script** (`/deploy`).
3. Upload a compiled binary (`.bin`, `.so`, or any file) via the upload zone.
4. Optionally adjust the fee rate (Slow / Standard / Fast).
5. The preview card auto-builds a preview transaction and shows capacity and fee.
6. Click **Deploy Script** to sign and broadcast.
7. Monitor the lifecycle banner until the transaction is committed.
8. Copy the deployed outpoint from the **Outpoint** tab.

## UI States

### Idle

- Upload zone shows "No file selected".
- Summary panel is empty.
- Submit button is enabled once a file is selected.

### Building (preview)

- Triggered automatically when a file is selected or fee rate changes (debounced 400 ms).
- The preview card's Summary tab updates with **Cell Capacity**, **Binary Size**, **Fee**, and **Balance after** once the build completes.
- A build error message appears in the preview card if the wallet is disconnected or the balance is insufficient.

### Submitting (Building → Signing → Sending)

- `TxStatusBanner` is hidden during Building and Signing phases.
- Submit button shows a loading spinner and "Processing…" label.
- All form fields are disabled while in-progress.

### Sent / Pending / Proposed

- `TxStatusBanner` appears with appropriate amber or primary-blue styling.
- Displays a short tx hash excerpt and propagation/mempool status.

### Committed

- `TxStatusBanner` shows "Transaction confirmed ✓" with the block number.
- The preview card's **Outpoint** tab replaces the Summary tab and shows:
  - **TX HASH** — full hash with copy button (truncated display).
  - **DEPLOYED OUTPOINT (cell dep)** — `txHash:0x0`, copyable.
  - Script binary size in bytes.
- The Outpoint can be pasted directly into a cell dep `outPoint` field in future transactions.

### Rejected / Error

- `TxStatusBanner` shows a rust-red error banner with the rejection reason.
- A "← Retry" button resets the form to Idle so the user can try again.

## Capacity Calculation

The minimum capacity for the deployed cell is:

```
(lock_script_bytes + 8 + binary_size_bytes) × 10^8  shannons
```

- `lock_script_bytes` = serialised lock script (varies by wallet type; secp256k1 is 53 bytes).
- `8` = the capacity field itself.
- `binary_size_bytes` = the uploaded file size.

CKB's SDK (CCC) computes this automatically via `completeInputsByCapacity` + `completeFeeBy` — the UI shows the actual computed value, not an estimate.

## Outpoint Format

The deployed script cell is always at output index 0 of the deploy transaction. Its outpoint is:

```json
{
  "txHash": "0x<deploy-tx-hash>",
  "index": "0x0"
}
```

Copy the `txHash:0x0` string from the Outpoint tab to reference this cell as a `code` or `depGroup` cell dep.

## Edge Cases

- **No wallet** — `buildTx` throws "Wallet not connected"; the error surfaces in the preview card's build error banner.
- **Insufficient balance** — CCC's `completeInputsByCapacity` throws if the wallet has less CKB than the minimum cell capacity; the error surfaces in the build error banner.
- **File too large** — No explicit size limit enforced in the UI; the limiting factor is wallet balance (more bytes = more capacity required).
- **Re-deploy** — The "← Retry" / reset button clears state so the user can deploy another binary without reloading the page.
