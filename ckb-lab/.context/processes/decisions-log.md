# Decisions log

> Records decisions **confirmed by the human**.
> Update this file **after** the human confirms in conversation.
> Do NOT add entries without explicit confirmation.
> Never invent a reason. A decision whose reason is written nowhere goes under
> **Open questions** with the reason blank.

Append only. When a decision is reversed, add a new entry naming the one it supersedes —
do not edit history, or the old option gets re-proposed as if it were fresh.

Entries tagged `bootstrap` were transcribed during the initial build of this context layer
from a source that states both the decision *and* its reason — a weekly report written by the
maintainer, or an inline comment recording a resolved decision. They are cited so they can be
sanity-checked and corrected. Everything after the bootstrap block is normal practice.

---

## Architecture

[2026-07-21 → 07-26] **Deployed-script registry: pure localStorage layer + a Zustand singleton
that mirrors it** (bootstrap) — `lib/ckb/deployed-scripts.ts` stays a pure storage layer;
`stores/deployed-scripts.ts` mirrors it and writes through on every mutation. Reason: `/deploy`,
`/invoke` and `/registry` all read the one store instance, so a save on any page shows on the
others with no reload; before the singleton each page had its own read path into the same key
and any registry bug fix had to be replicated per page. Not a class, because a class does not
integrate with React's render cycle and would need wrapping in state anyway. Follows the
`frontend-exp` → state-singleton-stores rule.
(source: `weekly-report/w11.md:41`, `weekly-report/w11.md:101`)

[bootstrap] **The network store is a derived cache, never a source of truth** — `CccProvider`
(via `defaultClient` / `clientOptions` in `providers.tsx`) owns the active client. The store
never builds or pushes a client; it only mirrors whichever client `useCcc()` reports, via
`NetworkSync`. Reason: stated at the source.
(source: `app/stores/network.ts:19`)

[bootstrap] **Wallet account state lives in its own store, separate from the network store** —
Reason: network and wallet-account are different domains — the network can change without the
wallet reconnecting, and vice versa. It also centralizes what `useWalletAccount.ts` and
`WalletButton.tsx` each used to fetch independently (two `getRecommendedAddress()` /
`getBalance()` calls per signer change).
(source: `app/stores/wallet.ts:13`)

[bootstrap] **One CKB client instance per network, built once** (`CLIENT_BY_NETWORK`) — Reason:
a fresh instance per call gives every reselect a new object identity, which defeats the
identity-based reverse lookup in `networkOfClient()` and needlessly re-triggers the connector's
internal signer refresh, which reacts to `client` changing.
(source: `app/lib/ccc-client.ts:149`)

[bootstrap] **Devnet's script map is layered on top of the full testnet set, not substituted
for it** — Reason: only 5 scripts exist in offCKB's devnet genesis, and `getKnownScript()` is a
pure local lookup where a missing key is a hard synchronous throw. Wallet connectors that probe
several lock types would otherwise throw uncaught mid-connection for any devnet-omitted script.
(source: `app/lib/ccc-client.ts:16`)

[bootstrap] **`CounterCell.script` is a denormalized copy pinned at CREATE time, deliberately
not a live join into the deployed-scripts registry** — Reason: the on-chain type script a cell
carries is fixed forever once created, but a registry entry can later be edited, hidden, or
deleted. A live join would silently desync from what is actually on-chain, or break entirely if
the registry entry disappears; this store has to survive both.
(source: `app/lib/ckb/counter-cells.ts:31`)

[bootstrap] **`contracts/` sets `resolver = "2"` explicitly** — Reason: a virtual manifest has no
root package to infer an edition (and therefore a resolver) from, so it silently defaults to
resolver "1". This workspace mixes `no_std` riscv64imac contract crates with a `std`
native-host test crate, which needs correct per-target feature unification.
(source: `contracts/Cargo.toml:2`)

## Product / UX

[2026-07-14 → 07-19] **Two-tier Definition of Done: `lab-spike` vs `polished`** (bootstrap,
commit `722b41b`, closes #28) — Reason: one uniform 10-gate DoD cost 4–5 files plus design and
docs sync per course; at that rate the remaining 21 courses did not fit the bootcamp window.
Tiering it — and threading `tier` through the `dev-harness` skill so the split was not cosmetic
— was cheaper than either dropping the gates or dropping the courses.
(source: `weekly-report/w10.md:63`, `weekly-report/w10.md:127`)

[2026-07-14 → 07-19] **`/deploy` shows Type ID args and the Type ID code hash as two separate
rows, with the code hash marked as the one to copy** (bootstrap) — Reason: a script is
identified by `blake2b(code_hash ‖ hash_type ‖ args)`, so the bare args reference a script that
does not exist. Anyone copying the old value out of the UI got a reference that could never
resolve, and the failure surfaced at cell-dep resolution during broadcast, far from the UI that
handed it over.
(source: `weekly-report/w10.md:15`)

[2026-07-21 → 07-26] **`hash_type` is coupled to the Type ID toggle rather than being an
independent control** (bootstrap) — Type ID off restricts the choice to `data1`/`data2`; on
forces `type`. The registry also rejects the impossible pair on write. Reason: as independent
controls, a plain data cell could be recorded with `hash_type: "type"` — a pair that never
resolves and fails at `/invoke` as `ScriptNotFound`, far from where the bad value was chosen.
(source: `weekly-report/w11.md:20`)

[bootstrap] **The Type ID toggle sits above Hash Type in the deploy form** — Reason: it is the
higher-level decision (fixed vs upgradeable reference) and it determines which `hash_type`
options are even valid below.
(source: `app/(shell)/deploy/DeployInputCard.tsx:105`)

[2026-07-21 → 07-26] **`/invoke` Deployed mode shows `hash_type` read-only** (bootstrap) —
Reason: `hash_type` is a property of how the script was actually deployed, not a free choice;
the registry already holds the `(code_hash, hash_type)` pair that resolves. Showing it
read-only removes the trap of picking a value that yields `ScriptNotFound`. Manual mode remains
available for referencing a script with an arbitrary `hash_type`.
(source: `weekly-report/w11.md:26`, `app/(shell)/invoke/InvokeInputCard.tsx:134`)

[2026-07-21 → 07-26] **A script rejection on `/invoke` is a first-class outcome, not an error
state** (bootstrap) — the node's own reason is shown verbatim. Reason: there is no way to
"call" a CKB script — no entry point, no function selector, no return value. A script is a
RISC-V binary that receives the whole transaction and returns 0 or non-zero, so the page's job
is to construct a transaction that gives it a reason to run and report what the node decided.
(source: `weekly-report/w11.md:15`, `weekly-report/w10.md:120`,
`app/features/invoke/useInvoke.ts:113`)

[bootstrap] **The counter action modal cannot be dismissed by outside-click or Esc while
Signing or Sending** — Reason: an accidental dismissal must not silently abandon an in-flight
wallet interaction, which cannot be undone once the wallet prompt is open.
(source: `app/(shell)/counter/CounterActionModal.tsx:58`)

[bootstrap] **Registry entries get a Hidden toggle instead of only delete** — a parked entry
drops out of the `/invoke` picker without being destroyed. Editing an identity field
(`txHash` / `index` / `code_hash`) re-keys the entry (delete old id, write new) rather than
duplicating it. Reason: stated in the report as the intended behaviour of a parked entry.
(source: `weekly-report/w11.md:36`, `app/components/RegistryDrawer.tsx:64`)

## Verified constraints

These are not choices — they are limitations found while investigating, recorded so a later
reconsideration does not pay to rediscover them.

[2026-07-21 → 07-26] **`riscv64imac` binaries can fail on CKB-VM regardless of `hash_type`**
(bootstrap) — `lesson-08-hash-lock`, built in June, failed with `VM Internal Error:
InvalidInstruction` on every `hash_type` when driven through `/invoke` Manual mode. Root cause:
`riscv64imac` can still emit native atomics (LR/SC/AMO), and CKB-VM does not execute atomics on
*any* VM version. No deploy-side setting fixes it; the binary needs rebuilding with
`-C target-feature=-a`. Filed as **#34** (deploy-time ELF `.riscv.attributes` parsing to catch
this and the related B-extension → `hash_type: data2` requirement) and deliberately left
unbuilt: it is a Deploy-page enhancement, orthogonal to Course 07/08.
(source: `weekly-report/w11.md:55`)

---

## Open questions

Decisions visible in the code whose **reason is recorded nowhere**. Do not guess at these —
answer one and it graduates into a dated entry above.

- **Zustand for app state, React Context only for theme.** `app/contexts/` holds `ThemeContext`
  alone while everything else is a Zustand store. The store-vs-class reason is recorded
  (`w11.md:41`); the Context-vs-Zustand one is not.
- **Ant Design 5 *and* Tailwind v4 together**, rather than committing to one. The UI decision
  order encodes how they coexist, but not why both were adopted.
- **React 18 on Next.js 15**, which supports React 19. Deliberate pin or not yet revisited?
- **Both `@storybook/nextjs` and `@storybook/react-vite` are installed**, and `.storybook/`
  uses the Vite builder. Reason for keeping the Next.js builder as a dependency is unrecorded.
- **The split between `app/features/<domain>/` and `app/lib/ckb/`.** In practice `lib/ckb/`
  holds pure tx builders and storage layers while `features/` holds React hooks, but the rule
  is not written down anywhere and is not enforced.
- **`NEXT_PUBLIC_NETWORK` defaults to `testnet`, not `devnet`**, even though devnet needs no
  faucet and no network. Unrecorded.
- **`contracts/` is a sibling Cargo workspace rather than a member of the pnpm workspace.**
  The separation is asserted throughout, never justified.
- **`stories/` is excluded from `tsconfig.json` `include` but has its own
  `tsconfig.storybook.json`.** Reason unrecorded.
