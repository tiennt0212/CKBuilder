# Gotchas

Traps where the reasonable assumption is wrong. Every entry was discovered by something
failing, not by reading a spec.

Entries marked `(source: …)` were extracted from an inline comment or a weekly report during
the initial bootstrap of this file. The source is the re-verification handle: open that line,
confirm the trap still holds, delete the entry if the code moved on.

---

## CKB transaction building

- **Setting output capacity by hand looks safe and is wrong** — the formula
  `(lock_script_bytes + 8 + data_bytes) × 10^8` is only correct for a secp256k1 lock, whose
  args happen to be 20 bytes. Leave `capacity` at `0` and let
  `completeInputsByCapacity()` compute the real occupied size from the actual lock + type +
  data. (source: `app/lib/ckb/deploy.ts:68`, `app/lib/ckb/invoke.ts:55`)

- **The three completion calls have a mandatory order, and the wrong order produces an
  underfunded tx rather than an error** — `completeInputsByCapacity()` first (Type ID needs
  `tx.inputs[0]` to exist), then `hashTypeId()`, then `completeFeeBy()` last. Adding the type
  script grows the output's occupied size, which changes the minimum fee; computing the fee
  before that leaves the tx short. (source: `app/lib/ckb/deploy.ts:81`,
  `app/lib/ckb/invoke.ts:77`)

- **A script's `code_hash` is not its Type ID args** — a script is identified by
  `blake2b(code_hash ‖ hash_type ‖ args)`, so the bare Type ID args are a value that *looks*
  like a hash but references a script that does not exist. The resolvable code hash is
  `tx.outputs[0].type.hash()`. The failure surfaces at cell-dep resolution during broadcast,
  far from the UI that handed over the wrong value. (source:
  `app/(shell)/deploy/DeployPreviewCard.tsx:196`, `weekly-report/w10.md:15`)

- **`hash_type` and Type ID are one decision, not two** — a plain data cell can only be
  referenced by its data hash (`data1`/`data2`); referencing it by `type` resolves to nothing.
  A Type ID cell is meant to be referenced by `type`. The impossible pair
  `{ data hash, "type" }` is accepted at deploy time and fails much later at invoke time as
  `ScriptNotFound`. (source: `app/(shell)/deploy/DeployInputCard.tsx:129`,
  `app/(shell)/deploy/DeployScriptForm.tsx:19`)

- **A script payload written to `witnesses[0]` as raw hex is silently overwritten** — input 0
  belongs to the signer, so its secp signature owns `witnesses[0]`, and `signTransaction`
  clobbers whatever was there. Use structured `WitnessArgs` and put the payload in
  `outputType`: the signer fills `lock` and leaves `outputType` intact, and `outputType` is the
  field a type script validating outputs is expected to read. (source:
  `app/lib/ckb/invoke.ts:65`)

- **The local store's cached counter value is not safe to build a transaction from** — the
  store is a display cache that drifts (stale after an external edit, or with multiple tabs
  open). Read the live cell from chain: that is what the type script will actually see as
  `GroupInput` data. (source: `app/lib/ckb/counter.ts:94`)

- **An output's lock/type must be carried forward from the on-chain cell, not rebuilt from the
  registry entry** — the denormalized script fields on a tracked entry identify *which cellDep
  to reference*, never what the output's own lock/type must be. On an increment, only `data`
  changes. (source: `app/lib/ckb/counter.ts:116`)

## CKB client and network state

- **`client.getKnownScript()` is a synchronous local map lookup, so a missing key is a hard
  throw, not a graceful "not found on this chain"** — devnet only deploys 5 scripts in genesis,
  so its script map is layered *on top of* the full testnet set rather than replacing it.
  Without the fallback, a wallet connector probing several lock types (e.g. MetaMask trying
  both OmniLock and PWLock) throws uncaught mid-connection. Update the 5 devnet overrides when
  redeploying devnet. (source: `app/lib/ccc-client.ts:16`)

- **`useCcc().client` is briefly a client this app never built** — before `CccProvider`'s own
  `defaultClient` effect commits, it is a bare library-constructed `ClientPublicTestnet`.
  Identity lookup against `CLIENT_BY_NETWORK` falls through to testnet for that window, which
  flashes the wrong network label even when configured for devnet/mainnet. Skip the transient
  client instead of reacting to it. (source: `app/lib/ccc-client.ts:159`,
  `app/stores/network.ts:32`)

- **Indexer range filters are half-open `[min, max)`** — an inclusive upper bound needs
  `+ 1` (one shannon for capacity, one byte for data length). (source:
  `app/features/wallet/useCellExplorer.ts:272`)

- **Querying by lock *and* type puts the type script in `filter.script`, not alongside the
  lock** — the primary script slot holds the lock; the type goes in the filter. (source:
  `app/features/wallet/useCellExplorer.ts:268`)

## Rust contracts

- **A `riscv64imac` build can emit atomics that CKB-VM will never execute** — LR/SC/AMO
  instructions produce `VM Internal Error: InvalidInstruction` at runtime, on *every*
  `hash_type`, so no deploy-side setting fixes it. The binary itself must be rebuilt with
  `-C target-feature=-a`. Symptom looks like a script-resolution problem and is not one.
  (source: `weekly-report/w11.md:55`; tracked as issue #34)

- **Bare `cargo test` at the workspace root fails to link** — Cargo builds a test harness for
  every member, including the `#![no_std] #![no_main]` contract crates, whose
  `ckb_std::entry!` macro defines its own `_start` that collides with the host's. Always scope:
  `cargo test -p tests`, or `make -C contracts test`, whose `test` target already does this.
  (source: `contracts/Makefile:17`)

- **Crate names do not match their directory names** — `contracts/lesson-10-counter/` builds
  the crate `counter`, and `contracts/lesson-08-hash-lock/` builds `hash-lock`. Cargo `-p`
  takes the crate name: `-p counter`, not `-p lesson-10-counter`. (source:
  `contracts/lesson-10-counter/Cargo.toml:15`, `contracts/lesson-08-hash-lock/Cargo.toml:14`)

- **A crate's own `[profile.*]` is silently ignored once it joins a workspace** — only the
  workspace root's profile tables are honored (Cargo emits a warning, not an error). The
  size-optimizing release profile therefore lives in `contracts/Cargo.toml`. (source:
  `contracts/Cargo.toml:13`)

- **A virtual manifest silently defaults to feature resolver "1"** — with no root `[package]`
  there is no edition to infer the resolver from. This workspace mixes `no_std` riscv64imac
  crates with a `std` native-host test crate, so `resolver = "2"` must be set explicitly for
  correct per-target feature unification. (source: `contracts/Cargo.toml:2`)

- **`ckb-testtool`'s `Context::default()` reads binaries from a path relative to the *tests*
  crate, not the workspace root** — it looks in `../build/release`, i.e.
  `contracts/build/release/`, because Cargo runs test binaries with their package directory as
  the working directory. Run `make -C contracts build` before `cargo test` or the fixtures are
  missing. (source: `contracts/tests/src/counter.rs:4`)

- **`ckb-testtool`'s default `hash_type` is unrelated to what `/deploy` produces** —
  `build_script` defaults to `Type`, keyed by the Type ID `deploy_cell` auto-assigns. That is
  the idiomatic convention for exercising script *logic*; it says nothing about the
  `data1`/`data2` a real deploy would use. `hash_type` only affects how a node resolves
  `code_hash` to a binary, not what the binary does once running. (source:
  `contracts/tests/src/counter.rs:23`)

## Browser persistence

- **`JSON.stringify` throws on a raw `bigint`** — the counter value is stored as a decimal
  *string* and parsed back with `BigInt(entry.count)`. Every other localStorage entry in this
  app is plain-JSON-safe; this one is the exception. (source:
  `app/lib/ckb/counter-cells.ts:29`)

- **localStorage does not exist during SSR, so a store cannot be seeded at module scope** —
  every persisted store fills after mount, and must re-read on network change because entries
  are network-scoped. (source: `app/(shell)/registry/RegistryPage.tsx:28`,
  `app/(shell)/counter/CounterPage.tsx:31`)

- **A registry entry is mutable but an on-chain script is not, so the two must not be joined
  live** — `CounterCell.script` is a denormalized copy pinned at CREATE time. A live join by
  registry id would silently desync from what the cell actually carries on-chain, or break
  entirely when the registry entry is edited, hidden, or deleted. (source:
  `app/lib/ckb/counter-cells.ts:31`)

## UI

- **Tailwind v4's important modifier is a suffix** — `px-2!`, not `!px-2`. The v3 prefix form
  does not error; it silently produces no style.

- **Antd v5 deprecated `bodyStyle` / `headStyle`** — use `styles={{ body: … }}`. The old prop
  is accepted and ignored.

- **Antd's `UploadFile` is not a `File`** — it wraps the native file in `.originFileObj`.
  Call `.arrayBuffer()` on `.originFileObj`, not on the `UploadFile` itself, which does not
  implement the `File` interface in some Antd versions. (source:
  `app/features/deploy/useDeploy.ts:55`)

- **`valuePropName="checked"` is required for a Form.Item wrapping a switch-like control** —
  without it Form.Item passes the field value as `value`, and the Antd `Switch` inside never
  reflects state. (source: `app/(shell)/deploy/DeployInputCard.tsx:108`)

## Repo layout

- **`app/lib/ckb/transfer-status.ts` is a re-export shim, not a module** — all consumers
  already moved to `tx-status.ts`. Import from `tx-status.ts` in new code; the shim exists only
  so stale imports keep resolving. (source: `app/lib/ckb/transfer-status.ts:1`)
