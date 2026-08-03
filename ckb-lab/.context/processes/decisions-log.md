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

[2026-08-03] **The network choice is persisted, and `NEXT_PUBLIC_NETWORK` now means "the default
for a first visit"** — amends the two `bootstrap` entries above without reversing them. The store
is still a derived cache and still never a source of truth: `NetworkRestore` restores by calling
`setClient(CLIENT_BY_NETWORK[n])` and waits for `NetworkSync` to mirror the result. Reason: the
selection survived nothing, and because every registry is network-scoped, a reload emptied
`/registry` and `/counter` and read as data loss rather than as a network change. Seeding
`useNetworkStore` directly was rejected as strictly worse than the bug — the pill would say devnet
while every RPC still went to testnet, with no visible symptom until a transaction failed. The
restore waits for a *canonical* client rather than for a moment in time, because CccProvider's
`defaultClient` effect has `[setClient]` deps and belongs to the parent component; see
`processes/gotchas.md` → "CKB client and network state" for why that is race-free.
(source: issue #86, `app/stores/network.ts`, `app/lib/network-preference.ts`)

[2026-08-03] **`NetworkSync` is the single place the network is written, not `NetworkPill`** —
Reason: `providers.tsx` passes `clientOptions`, so CCC's own connected-wallet modal has a network
picker too; writing at the click site would cover one surface and silently miss the other. The
first canonical client of a page's life is skipped, because it is always `defaultClient` rather
than a user choice — persisting it would freeze `NEXT_PUBLIC_NETWORK` at whatever it was on a
browser's first visit and make every later change to that env var inert.
(source: issue #86, `app/stores/network.ts`)

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

[2026-07-31] **An unbuilt route states its milestone and tracking issue, in `info` tone** —
`PageShell`'s placeholder no longer renders an amber `warning` reading "Connect your wallet to
get started". Reason: that copy addressed the developer, not the person clicking, and named the
wallet on pages that have nothing to do with it — a reviewer read it as a broken app or a broken
wallet. An unbuilt feature is not an error condition, so it renders `info` and says which
milestone it belongs to and where to follow it.
(source: issue #50, `app/components/PageShell.tsx`)

[2026-07-31] **`/tokens` and `/history` are marked `designed`, contradicting issue #50's text** —
#50 asserts only `/dao` and `/multisig` have artboards. The `SCREENS` object in Claude Design's
`ckb-app.jsx` and the gallery `SCREENS` array in `CKBuilder.html` both also carry `tokens` and
`history` with light + dark artboards, so four of the five placeholders are designed. Only
`/time-lock` is genuinely undesigned — the `lock` gallery entry is titled "Time Lock · Multisig"
but renders `MultisigScreen`. Reason: the human chose the artboards over the issue text, because
the epic's whole point is that the app tells the truth. The route ↔ design drift itself stays
tracked in #75.

[2026-07-31] **The devnet entry in the network picker is disabled on an https origin** — Reason:
a devnet node serves plain `http://localhost:28114`, which a browser blocks from an https page
as active mixed content. Offering the switch on the deployed app would hand the user a network
where every RPC call fails with no explanation. Detected after mount rather than during render,
because `NetworkPill` is server-rendered inside the header and reading `window` during render
breaks hydration.
(source: issue #52, `app/components/NetworkPill.tsx`)
**Superseded the same day by the entry below — its premise was factually wrong.**

[2026-07-31] **Devnet is probed on click, not gated on `location.protocol`** — supersedes the
entry directly above. Its premise does not hold: `http://localhost` is a potentially-trustworthy
origin and is exempt from mixed-content blocking in all three engines, CKB's RPC server mounts
`CorsLayer::permissive()`, and offckb's 28114 proxy forwards those headers — so a deployed https
app *can* drive a local devnet. The only real gate is Chrome 142+ Local Network Access, a
permission prompt rather than a block. Reason the human gave for reversing: disabling the entry
removed a capability that works, and the demo should not cost a developer their local node.
`NetworkPill` now calls `isDevnetReachable()` on click and reports what actually happened, which
also fixes the same silent breakage on localhost when `offckb node` is not running. Probed on
click rather than on mount so Chrome's permission prompt follows a user action instead of a page
load. See `processes/gotchas.md` → "CKB client and network state".
(source: `app/lib/ccc-client.ts`, `app/components/NetworkPill.tsx`)

[2026-07-31] **The README lives at the repository root, with a short pointer in `ckb-lab/`** —
Reason: the GitHub repo is `tiennt0212/CKBuilder` and its root page is the first thing a reviewer
opens; a README only inside `ckb-lab/` would be invisible there. The root file carries the full
document, `ckb-lab/README.md` carries only the commands and links back.
(source: issue #51)

[2026-08-01] **`/tokens` lists every xUDT the wallet holds, not only the one it issued** — the
balance list groups by `type.args` across all matching cells. Reason: the indexer prefix-matches
`filter.script`, so one query with empty args covers every token at a cost of a few lines, and it
is the only version where the transfer form means anything — a recipient who cannot see a token
they were sent has no reason to be on the page. `buildTransferUdtTx` takes `udtArgs` as a
parameter either way, so the narrow choice would never have reached the builder layer.
(source: issue #47)

[2026-08-01] **Token amounts are raw `u128` integers with no decimal scaling** — the UI shows and
accepts `50000` as `50000`, labelled "raw units". Reason: xUDT carries no decimals field on chain.
Displaying 8 decimals like CKB would be a convention invented by this app with nothing backing it,
and teaching a wrong mental model is the specific failure `docs/` exists to prevent. Consequence:
the amount input must run in Antd's `stringMode`, since a u128 past 2^53 does not survive a JS
`number`.
(source: issue #47)

[2026-08-01] **`/tokens` takes the Claude Design artboard's content but keeps the repo's column
convention** — the artboard merges the form, the capacity note, the summary rows and the
Summary/Raw tabs into a single right-hand card beside the holdings list. The page instead puts
holdings + form left and the preview right. Reason: four shipped pages (`/transfer`, `/deploy`,
`/invoke`, `/counter`) already separate input from preview, and the merged card leaves the raw
transaction JSON nowhere to go. The artboard's copy, the `≈ N CKB locked` sub-line, the capacity
note and the `⚡ Issue` affordance are all kept. The artboard was not re-synced — a `lab-spike`
skips Claude Design, so `/tokens` is knowingly left drifted.
(source: issue #47)

[2026-08-01] **`docs/tokens-features.md` was written even though `lab-spike` skips `docs/`** —
Reason: epic #47's own Definition of Done names the file, and sub-issue #55 carries the
`documentation` label rather than `lab-spike`. The more specific instruction wins over the tier
default. This is a documented exception, not a precedent for writing `docs/` on other spikes.
(source: issues #47, #55)

[2026-08-03] **Cross-tab: mirror by default, but a tab can pin itself with `?network=`** — an
unpinned tab follows the shared `ckbuilder:network` key live via a `storage` listener; a tab
opened at `?network=devnet` copies that into its own `sessionStorage` key and then neither
follows nor writes the shared value. Reason the human gave: running devnet in one tab and testnet
in another *to compare them* is a real workflow for a developer lab, so hard-mirroring would have
removed a capability. Persist-only was rejected because already-open tabs would only diverge
further, and an action taken in a stale tab hits the wrong chain. The mirror path deliberately
does **not** re-probe devnet — the tab that switched already did, and probing in every background
tab would raise Chrome 142+'s Local Network Access prompt with no user gesture behind any of them,
which is exactly what the 2026-07-31 "probe on click, not on load" decision exists to avoid.
(source: issue #86, `app/stores/network.ts` `NetworkRestore`)

[2026-08-03] **The pill shows a settling state only while a restore is actually pending, and a
failed devnet restore is reported with an Antd toast** — Reason: `localStorage` cannot be read
during render, so the restore always lands a commit late and the pill would otherwise show, and
accept clicks against, a network the app is about to leave; on the devnet path that window is as
long as the reachability probe. Gating it on a pending restore keeps an ordinary load flicker-free.
The toast was chosen over an inline dropdown message because the fallback happens at load, before
the user has any reason to open the dropdown — it required introducing `<App>` in `providers.tsx`,
since Antd v5's static `message.*` does not read `ConfigProvider` context.
(source: issue #86, `app/components/NetworkPill.tsx`, `app/providers.tsx`)

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
