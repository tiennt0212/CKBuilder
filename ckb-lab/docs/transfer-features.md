# Transfer CKB — Feature Documentation

## Overview

The Transfer page lets users send CKB to any address. It builds a CKB UTXO transaction, requests wallet signing, submits it to the node, and tracks confirmation through the full lifecycle.

## Form states

The transfer form has two cards:

| Card | Purpose |
|---|---|
| **TransferInputCard** | Recipient address, amount, fee rate, send button |
| **TransferPreviewCard** | Live transaction preview (cell flow, summary panel, raw JSON) |

### Preview behavior

- Preview builds automatically as the user types, debounced **400 ms** after the last keystroke.
- While building, the preview card shows a loading skeleton.
- If the build fails (e.g. insufficient balance, invalid address), an **inline error** appears below the form — the form stays editable.
- Preview is suppressed while a transfer is in progress (`isInProgress = true`).

### Submit button states

| Condition | Submit button |
|---|---|
| Wallet not connected | Disabled |
| Address or amount empty | Disabled |
| Transfer in progress | Disabled + shows progress spinner |
| Status = Committed | Disabled (use "New Transfer" instead) |
| Otherwise | Enabled |

## Transfer status lifecycle

Once the user clicks "Send", the status progresses through these states. The `TxStatusBanner` component is hidden during `idle`, `building`, and `signing`; it appears for all subsequent states.

```
idle → building → signing → sending → sent → pending → proposed → committed
                                                                  ↘ rejected
                                                                  ↘ error
```

| Status | Banner variant | Title | Notes |
|---|---|---|---|
| `idle` | — (hidden) | — | Form is editable |
| `building` | — (hidden) | — | Preview building, inline error shown on failure |
| `signing` | — (hidden) | — | Wallet signing modal open |
| `sending` | amber | "Submitting transaction…" | RPC call in-flight |
| `sent` | amber | "Submitted — broadcasting" | txHash known, propagating to peers |
| `pending` | amber | "Pending" | In mempool, awaiting block inclusion |
| `proposed` | primary (green) | "Proposed" | In block proposal, confirming in ~2 blocks |
| `committed` | green | "Transaction confirmed ✓" | On-chain; block number shown |
| `rejected` | rust (orange) | "Transaction failed" | Rejected by node; error code shown |
| `error` | rust (orange) | "Error" | Unexpected error during send/poll |

## Actions per state

| State | Available actions |
|---|---|
| `sent`, `pending`, `proposed` | Pending badge (display only) |
| `committed` | "Explorer ↗" link (mainnet/testnet only — suppressed on devnet); "New Transfer" button |
| `rejected`, `error` | "← Retry" button (calls `onRetry` / `reset()`) |

### Devnet behavior

On `Network.Devnet`, the Explorer link is **not shown** even when the transaction is committed — there is no public explorer for devnet.

## Error recovery

- **RPC errors during polling**: up to **3 automatic retries** before the banner enters `error` state.
- **Concurrent resets**: a generation counter (`transferId`) prevents stale poll callbacks from writing state after `reset()` is called.
- **Retry / New Transfer**: calling `reset()` clears `txHash`, `blockNumber`, `fee`, and `error`, returns status to `idle`, and cancels any active poll.

## Poll loop

After `sent`, `useTransfer` polls `client.getTransaction(txHash)` every ~3 s:

1. First check runs immediately on entering `sent`.
2. Each cycle: `null` response → sleeps 3 s, then continues. `pending` / `proposed` → updates status. `committed` → sets block number and stops. `rejected` → stops with error.
3. A 100 ms sleep before each `continue` prevents a hot loop on null responses.
