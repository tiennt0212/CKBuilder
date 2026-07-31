# ckb-rust-example

A single-binary Rust spike that drives the CKB **testnet** through `ckb-sdk`:
fetch a block timestamp, then build → sign → broadcast a capacity transfer, plus
a helper to page live cells. A learning scratchpad, not a shipped library.

## Tech stack

- Rust, edition 2024 (`cargo`)
- `ckb-sdk` 3.2.0, `ckb-types` 0.200.0, `secp256k1` 0.30.0 — the module paths and
  types referenced in the gotchas below are pinned to these versions; a different
  `ckb-sdk` major moves them.

## Commands

```bash
cargo run     # runs src/main.rs against testnet (https://testnet.ckb.dev)
cargo build
```

## Layout

- `src/main.rs` — entry point; selects the RPC endpoint (testnet default; devnet
  `http://127.0.0.1:8114` and mainnet lines are commented) and calls the helpers.
- `src/utils.rs` — the reusable pieces: `CkbClient`, `transfer_capacity`,
  `get_live_cells`, `get_block_timestamp_by_number`.

## Constraints

- The private key and both addresses in `src/main.rs` are throwaway **testnet**
  values. Never repoint `main.rs` at mainnet with a key committed in source.
- `ckb-cli/` in this directory is a clone of `nervosnetwork/ckb-cli` (its own
  `.git`, MIT) — NOT part of this crate, not a Cargo workspace member, and not
  ours to edit. Treat it as read-only reference.

## Gotchas

Extracted from inline comments; sources cited so each stays re-verifiable.

- `CkbRpcClient` hides its URL as `pub(crate)`, but every `Default*` helper
  (`DefaultCellCollector`, `DefaultHeaderDepResolver`,
  `DefaultTransactionDependencyProvider`) needs the URL as a `&str`, not the
  client. That is the only reason `CkbClient` bundles `rpc` + `url` together —
  don't "simplify" it away. Source: `src/utils.rs:19`, `src/utils.rs:93`.
- Signing needs a placeholder witness of exactly **65 zero bytes** (the size of a
  real secp256k1 signature) inserted *before* signing, so the fee estimator sizes
  the transaction correctly. Source: `src/utils.rs:73`.
- `HumanCapacity.0` is already in **shannons** (1 CKB = 1e8 shannons), not CKB.
  `.pack()` turns the `u64` into `packed::Uint64`. Source: `src/utils.rs:85`.
- `DefaultCellDepResolver::from_genesis` wants a `ckb_types::core::BlockView`, but
  RPC returns the jsonrpc block type — bridge with `.into()`. The same conversion
  applies to `send_transaction` (`tx.data().into()`). Source: `src/utils.rs:98`,
  `src/utils.rs:120`.
- `h256!("0x…")` parses the hex at compile time into `H256`; `.0` extracts the
  inner `[u8; 32]` the signer expects. Source: `src/main.rs:18`.
