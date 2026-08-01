# Tokens — Feature Documentation

The Tokens page issues and transfers **xUDT** fungible tokens. xUDT is a *type* script, so this
page reuses the transaction shape [Counter](./counter-features.md) already proved: attach a type
script to an output, leave your own lock on the cell, and let the wallet sign normally. Unlike
Counter it needs no `/deploy` step — xUDT is a system script already on every network, resolved
per network through CCC's known-script map rather than a code hash written into this app.

## The one idea this page exists to teach

**A token balance is not a number stored anywhere.** It is a sum over live cells.

Nothing on chain records "address X holds N tokens". What exists is a set of cells, each with
your lock on it, each carrying the xUDT type script, and each holding an amount as a 16-byte
little-endian `u128` at the start of its `data`. Your balance is whatever those cells add up to at
the moment you look.

That is why the holdings list shows `3 cells · ≈438 CKB locked` under each amount: the cell count
*is* the balance's structure, not a detail about it. And it is why sending 2,500 of a 10,000
balance consumes whole cells and creates a change cell — exactly like paying with cash, and
nothing like decrementing a field.

If you arrive from an account-based chain, this is the assumption to drop first.

## What issuing an xUDT creates on chain

One cell. That is the entire operation:

| Field | Value | Who decides it |
|---|---|---|
| `lock` | The recipient's lock script | You, via **Mint To** (defaults to yourself) |
| `type` | The network's xUDT script, with your token's `args` | Fixed — resolved from the known-script map |
| `type.args` | Your lock script hash (32 bytes) + `00000000` | Derived from your wallet; not editable |
| `data` | The amount, 16-byte little-endian `u128` | You, via **Amount** |
| `capacity` | ~146–148 CKB | Computed from the three fields above |

The capacity is `8 (capacity field) + lock + 69 (xUDT type) + 16 (data)` bytes, at 1 CKB per byte.
It is **derived, not fixed**, and the lock term is the part that moves:

| Wallet lock | Lock size | Cell capacity |
|---|---|---|
| secp256k1_blake160 (20-byte args) | 53 bytes | **146 CKB** |
| OmniLock (22-byte args) | 55 bytes | **148 CKB** |

So the number you see depends on the wallet, and a *recipient* on a different wallet type changes
it again. The page never assumes: it reads the real figure back off the built transaction, and the
preview's **New cell capacity** row is always the true number.

That CKB is a **deposit, not a fee**. It stays locked inside the cell for as long as the cell
exists and returns in full to whoever spends it. The network fee is the separate, much smaller
row beneath it.

## Why the token's identity is your lock script hash

The xUDT script reads the first 32 bytes of its own `args` as an **owner lock hash**. When any
input cell in a transaction carries a lock hashing to that value, the script enters **owner mode**
and skips its `sum(inputs) >= sum(outputs)` check entirely.

That is the whole minting mechanism. There is no mint function, no admin call, no witness — just
"the owner's lock is present in the inputs, and that lock has already accepted the signature".

Four consequences follow, and all of them are permanent:

- **The issuer can never be changed.** A script's identity is `blake2b(code_hash ‖ hash_type ‖
  args)`, and the args are baked in when the first cell is created. There is no transfer-ownership
  operation because there is nothing to transfer.
- **Two issuers can never mint the same token.** Different wallet, different lock hash, different
  args, different script. Two tokens that look alike in a list are not the same token.
- **Anyone can hold and transfer it; only you can mint it.** Holders' transfers must balance
  exactly, because their transactions contain no owner-locked input.
- **Lose the issuing key and the supply is frozen forever.** Existing tokens keep moving; no new
  ones can ever exist.

One subtlety worth knowing: because *your* transactions usually include one of your own cells to
pay the fee, your transfers run in owner mode too. On chain, an issuer's "transfer" could mint out
of thin air. This page refuses to do that — it will not let you send more than you hold, even
though the chain would accept it. Minting to someone else is the **Issue** action with a **Mint
To** address, which says what it actually does.

## Raw amounts, no decimals

xUDT stores no decimals field. An amount of `50000` means fifty thousand units, and this page
shows and accepts exactly that.

Displaying it as `0.0005` with eight decimals — the way CKB itself is shown — would be a
convention invented by this app with nothing on chain behind it. Two tokens could reasonably
disagree, and a reader would have no way to tell. So the page labels the field **raw units** and
leaves the number alone.

Practical consequence: amounts can legitimately be enormous (a `u128` goes past 10³⁸). The input
handles them as text rather than as JavaScript numbers, so a 30-digit amount reaches the chain
intact.

## User Flow

1. Connect a CKB wallet via the header wallet button.
2. Navigate to **Tokens** (`/tokens`). The holdings list reads your cells directly from the
   indexer — no local registry, nothing to import.
3. With **Issue** selected, enter an **Amount**. Leave **Mint To** empty to mint to yourself.
4. Watch the preview: the new cell's capacity, the network fee, and your CKB after.
5. Submit, and watch the lifecycle banner reach `committed`. The holdings list refreshes itself.
6. Switch to **Transfer**, pick the token in the list, enter a recipient and an amount.
7. Submit. The recipient now has a cell of their own; your remainder comes back as a change cell.

## Form Fields

| Field | Mode | Default | Description |
|---|---|---|---|
| Action | both | Issue | Segmented: `Issue` / `Transfer`. `Transfer` is disabled while you hold no xUDT |
| Token | Transfer | first in list | Selected by clicking a row in the holdings list |
| Mint To | Issue | empty → yourself | Optional recipient. Empty mints the cell to your own lock |
| Recipient Address | Transfer | — | Required. `ckt…` on testnet, `ckb…` on mainnet |
| Amount | both | — | Whole number of raw units. In Transfer mode, capped at your balance, with a `MAX` chip |
| Fee Rate | both | Slow | Segmented: 1,000 / 2,000 / 5,000 shannons per KB |

The token's `args` is not a form field. In Issue mode it is derived from your wallet; in Transfer
mode it comes from the row you selected — never re-derived from the sender, since a holder is
usually not the issuer.

## UI States

### Idle
Nothing built yet. The holdings list is populated; the preview card is empty.

### No tokens yet
The holdings list shows an empty state naming the current network, and **Transfer** is disabled
on the segmented control — there is nothing to transfer, so the mode is unreachable rather than
reachable and broken.

### Building (preview)
Form changes are debounced 400 ms, then a preview transaction is built. The preview shows the
input cells on the left and output cells on the right, with the cells that stay with you
highlighted, plus a summary of amount, cell capacities and fee.

### Raw Tab
The full raw transaction with its byte count. Worth opening at least once: it is where the
16-byte amount, the 36-byte type args, and the xUDT cell dep are all visible.

### Submitting
Button shows `Processing…` and is disabled. The banner is hidden during `building`/`signing`.

### Sent / Pending / Proposed
Amber banner with the transaction hash, polled every 2 s.

### Committed
Green banner with the block number, and the holdings list re-reads from chain.

### Rejected
Rust banner with the node's reason verbatim. For this page that usually means the xUDT script
returned non-zero — either owner mode did not engage on an issue, or inputs and outputs did not
balance on a transfer.

## Edge Cases

- **No wallet** — build throws "Wallet not connected"; surfaces as a build error in the preview.
- **How much *new* CKB a transfer needs** — less than the output capacities suggest, because the
  token cells you spend carry their own capacity forward. Only the shortfall comes from your
  plain CKB:

  | You hold | Inputs collected | Token outputs | New CKB needed |
  |---|---|---|---|
  | 1 token cell, sending part of it | 1 (~148) | recipient + change (~296) | **~148** |
  | 1 token cell, sending all of it | 1 (~148) | recipient only (~148) | **0** |
  | 2+ token cells, sending part | 2 (~296) | recipient + change (~296) | **0** |

  The third row is the common one and it surprises people: the transaction builder deliberately
  pulls a *second* token cell when the first already covers the amount, precisely so that cell's
  capacity funds the change cell. The amount of *token* being sent never affects the CKB cost.
- **Not enough CKB specifically for the change cell** — reported separately, because "you have
  enough for the transfer but not enough to receive your own remainder" is otherwise a baffling
  message.
- **Not enough of the token** — a different error from the one above, and this page names which
  is which. It is refused locally before any transaction is sent.
- **You are the issuer** — owner mode makes the on-chain balance check vacuous, so the chain
  would accept an over-transfer as a disguised mint. The page refuses it anyway; use **Issue**
  with a **Mint To** address if minting to someone else is what you meant.
- **The recipient's wallet is not secp256k1** — their lock args are a different length, so their
  cell's minimum capacity differs again — an OmniLock recipient costs 148 CKB where a
  secp256k1 one costs 146. The preview always shows the real figure.
- **Two input cells when one would have covered it** — deliberate, not a bug. A surplus means a
  change cell is coming, and the second input contributes the capacity that change cell will
  occupy.
- **Balance right after a commit** — the page can show the new cell before the indexer has caught
  up, because the CKB client caches what it just sent. Reloading in that window may briefly show
  the older balance until the indexer catches up. Neither figure is wrong; they are reading
  different sources.
- **Network switched mid-session** — the holdings list is re-read from the new network. A token
  issued on devnet never appears on testnet: the cells are on a different chain, and the xUDT
  script itself has a different code hash there.
- **Reset mid-flight** — an incrementing run id discards stale async callbacks and a cancel token
  stops the poll loop, so a reset during signing or polling cannot resurrect old state (same
  pattern as `/deploy`, `/invoke` and `/counter`).
