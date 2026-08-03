# System design

## What this is

A CKB developer "lab": a Next.js 15 app where each page makes one CKB concept concrete by
building a real transaction against a real chain, plus the Rust contracts some of those pages
deploy and exercise. It grew out of a 24-lesson course; since 2026-07-31 the roadmap is cut by
product milestone instead, so a page maps to a delivered capability rather than to a lesson.

**Constraint — there is no backend.** Not "the backend is small": there are zero route handlers,
zero server actions, and nothing in the tree imports `fs` or `next/server`. Every chain
interaction runs in the browser against a CKB node's JSON-RPC, signed by the user's wallet
extension, and every piece of persistence is `localStorage`. This is why there is no auth layer,
no session, no database, and no API spec — and why a compiled contract binary reaches the chain
by the user *uploading* it in the browser (`UploadZone` sets `beforeUpload={() => false}` so
Antd never POSTs it anywhere), never by the server reading `contracts/build/release/`.

Do not add a route handler to "simplify" a chain call. If something appears to need one, that is
a design change to raise, not an implementation detail.

## Repo structure

```
ckb-lab/                         # single pnpm package at root — no workspace packages
├── app/                         # Next.js App Router
│   ├── page.tsx                 # redirects "/" → "/transfer"
│   ├── layout.tsx, providers.tsx
│   ├── globals.css              # @theme inline tokens — single source of truth for design tokens
│   ├── theme.ts                 # ckbTheme(mode) — the Antd ConfigProvider theme object
│   │
│   ├── (shell)/                 # route group — every page wrapped in AppLayout
│   │   ├── transfer/  cell-explorer/  tokens/          # group: Wallet
│   │   ├── deploy/  invoke/  registry/  counter/       # group: Smart Contracts
│   │   ├── dao/  time-lock/  multisig/                 # group: Advanced
│   │   └── history/                                    # group: Activity
│   │       └── page.tsx + co-located <Name>Card/Form/Table/Modal .tsx
│   │
│   ├── components/              # AppLayout, Header, Sidebar, PageShell, CubeMark,
│   │   │                        # NetworkPill, WalletButton, RegistryDrawer
│   │   └── ui/                  # reusable domain UI — see ../design/component-library.md
│   │
│   ├── contexts/                # ThemeContext (light/dark) only — all other state is a store
│   ├── stores/                  # Zustand singletons (see "State" below)
│   ├── features/                # feature-scoped React hooks — NOT page components
│   │   ├── common/useRawTx.ts
│   │   ├── counter/  deploy/  invoke/  transfer/  wallet/
│   │
│   └── lib/
│       ├── ccc-client.ts        # Network enum, per-network client singletons, devnet script map
│       ├── network-preference.ts # persisted network choice: shared key, per-tab pin,
│       │                        # ?network= param, startup precedence
│       ├── format.ts            # shannonToCKB, ckbToShannons, utf8ToHex, hexToUtf8,
│       │                        # truncateAddress, formatCapacity
│       ├── routes.ts            # ROUTES + PAGE_TITLES (group + title per route)
│       ├── nav-items.tsx        # NAV_ITEMS — sidebar entries
│       ├── github.ts            # repo URL + issueUrl(n) — links out to the roadmap
│       ├── useDebouncedCallback.ts
│       ├── index.ts             # re-exports ccc-client + format only
│       └── ckb/                 # chain logic — pure functions, no React
│
├── contracts/                   # standalone Cargo workspace — pnpm does NOT touch this
├── stories/                     # Storybook: chrome/, components/, foundations/
├── tests/                       # Vitest — mirrors app/lib/ paths; pure layer only
├── docs/                        # end-user feature docs, one per polished route
├── DESIGN.md                    # full design-token reference (prose)
└── .storybook/                  # Vite + React builder, resolves @/ → app/
```

Path alias: `@/*` → `./app/*` (`tsconfig.json`). Always import via the alias, never a relative
climb out of a route directory.

### `app/lib/ckb/` — the chain-logic layer

Pure TypeScript, no React, no hooks. A page never builds a transaction itself; it calls a hook
in `features/`, which calls one of these.

| File | Responsibility |
|---|---|
| `transfer.ts` | Build a plain capacity-transfer tx |
| `deploy.ts` | Build a script-deployment tx; optional Type ID; returns `dataHash` + `typeIdCodeHash` |
| `invoke.ts` | Build a tx that attaches a deployed script to `outputs[0].type` so the node runs it |
| `counter.ts` | Build create / increment / destroy txs for the lesson-10 counter type script |
| `udt.ts` | Build xUDT issue / transfer txs; u128 LE codec; per-token balance reader over live cells |
| `counter-cells.ts` | `localStorage` layer for tracked counter cells (`CounterCell` shape, network-scoped ids) |
| `deployed-scripts.ts` | `localStorage` layer for the deployed-script registry (`DeployedScript`) |
| `script-actions.ts` | Shared helpers for acting on a registry entry |
| `tx-status.ts` | `TxStatus` enum + `TX_STATUSES` — the canonical tx lifecycle |
| `transfer-status.ts` | Re-export shim onto `tx-status.ts`; do not add to it |
| `hash-type.ts` | `HashType` object-namespace (`data1` / `data2` / `type`) |
| `dep-type.ts` | `DepType` object-namespace (`code` / `dep_group`) |
| `utils.ts` | Small shared chain helpers |

`hash-type.ts` and `dep-type.ts` exist so the JS side has a namespace instead of magic strings;
the wire types stay `ccc.HashType` / `ccc.DepType`.

### `contracts/` — Cargo workspace

```
contracts/
├── Cargo.toml                   # [workspace], resolver "2", root-only [profile.*]
├── Makefile                     # CRATES := hash-lock counter
├── lesson-08-hash-lock/         # crate name: hash-lock
├── lesson-10-counter/           # crate name: counter   ← dir name ≠ crate name
├── tests/                       # crate name: tests — native-host ckb-testtool suite
└── build/release/               # compiled riscv64imac binaries, produced by `make build`
```

`build/release/` is consumed two ways, both local: `ckb-testtool`'s `Context::default()` reads it
during `cargo test`, and the developer picks the binary out of it by hand to upload on `/deploy`.
Nothing in `app/` reads this directory.

## State

Four Zustand singletons in `app/stores/`. React Context is used for the theme and nothing else.

| Store | Holds | Backing |
|---|---|---|
| `network.ts` | Active `network`, `lockLabelMap`, `restorePending`, `pinned` | Derived cache — `CccProvider` is the source of truth; `NetworkSync` mirrors it and is the only writer of the persisted choice; `NetworkRestore` restores it via `setClient` |
| `wallet.ts` | Connected address + balance | Derived from the signer; `WalletAccountSync` refetches on signer change |
| `deployed-scripts.ts` | The script registry read by `/deploy`, `/invoke`, `/registry` | Mirrors `lib/ckb/deployed-scripts.ts`, writes through on every mutation |
| `counter-cells.ts` | Tracked counter cells for `/counter` | Mirrors `lib/ckb/counter-cells.ts`, writes through |

The `*Sync` components and `NetworkRestore` mount once each in `providers.tsx`. The two persisted
stores fill **after mount** (localStorage does not exist during SSR) and re-read on network change,
because every entry is network-scoped. The network choice fills after mount for the same reason —
which is why the pill has a settling state rather than a correct label on the first paint.

Provider chain (`app/providers.tsx`):

```
ThemeProvider > AntdThemeProvider (ConfigProvider + ckbTheme > App) > CccProvider
  ├── NetworkSync
  ├── NetworkRestore
  ├── WalletAccountSync
  └── children
```

Antd's `<App component={false}>` sits inside `ConfigProvider` so `App.useApp()` hands out a
theme-aware `message` — the static one ignores `ConfigProvider`. `NetworkRestore` uses it to
explain a devnet restore that found no node.

## Data flow — building and sending a transaction

Every chain page follows the same shape, and a new one should too:

1. **Page** (`app/(shell)/<route>/page.tsx`) renders `PageShell` + a co-located
   `<Name>InputCard` / `<Name>PreviewCard`, or a `<Name>Form` that owns both.
2. **Hook** (`app/features/<domain>/use<Name>.ts`) owns `TxStatus`, error, fee, txHash, and the
   poll loop. It debounces field changes into a preview build.
3. **Builder** (`app/lib/ckb/<name>.ts`) takes a signer + params and returns a
   `ccc.Transaction`. It never touches React state.
4. The hook signs and broadcasts, then polls until the tx reaches a terminal `TxStatus` and
   renders that through `TxStatusBanner`.

A **preview build** runs on every field change so the user sees fee and capacity before
committing — this is why builders must be callable without side effects, and why they take the
signer rather than reading a store.

Two invariants that hold across all builders and are easy to break:

- Leave output `capacity` at `0`; `completeInputsByCapacity()` computes the real occupied size.
- Call order is `completeInputsByCapacity()` → (`hashTypeId()`) → `completeFeeBy()`.

See `../processes/gotchas.md` for why each of those fails silently rather than loudly.

## Environment

| Variable | Read by | Values |
|---|---|---|
| `NEXT_PUBLIC_NETWORK` | `readEnvNetwork()` in `app/lib/ccc-client.ts` | `devnet` \| `testnet` \| `mainnet` — defaults to `testnet`. Only the default for a **first visit**: a browser that has already chosen a network is restored to it, and `?network=` outranks both |

Set in `.env.local`. Devnet additionally needs `offckb node` running; its RPC is
`http://localhost:28114` (`DEVNET_RPC_URL`).

Because `NEXT_PUBLIC_NETWORK` only picks the *initial* client, the user can still switch networks
at runtime through `CccProvider`'s `clientOptions`. Code must therefore read the network from
`useNetworkStore`, never from the env var.

### Hosting

Deployed to Vercel on `testnet` at **https://ck-builder-bay.vercel.app**, tracking the default
branch. Two settings matter, and both have a failure mode that does not name itself:

- **Root Directory `ckb-lab`** — set in the Vercel dashboard, not in a file. The repo root is a
  workspace with no manifest, so leaving it at the root fails with
  `ERR_PNPM_NO_IMPORTER_MANIFEST_FOUND`.
- **Framework preset `nextjs`** — pinned in `vercel.json` because auto-detection can land on
  Vite: `vite`, `@tailwindcss/vite` and `vite-tsconfig-paths` are devDependencies for
  Storybook's builder. A misdetect fails with `No Output Directory named "dist" found`. Never
  set an Output Directory by hand for Next.js — Vercel derives it from the preset, and pointing
  it at `.next` makes Vercel serve the build folder as static files instead.

`NEXT_PUBLIC_NETWORK` is optional: `readEnvNetwork()` already falls back to `testnet` when the
variable is absent or invalid. Set it anyway, so the target is stated rather than inferred.

Nothing else is configured: there are no secrets, no route handlers, and `next build` prerenders
every route as static content.

Devnet still works from the deployed app: `http://localhost` is a potentially-trustworthy origin
(exempt from mixed-content blocking) and the node answers with permissive CORS, so a developer
running `offckb node` can point the hosted build at their own chain. Chrome 142+ asks for Local
Network Access permission first. What devnet cannot do is *assume* a node is there, so
`NetworkPill` probes it on click via `isDevnetReachable()` and reports the result instead of
switching into a dead network — see `../processes/gotchas.md`.

## Deliberately not done

Listing only what exists reads as an invitation to add more. These are absences by choice:

- **No backend, no API routes, no server actions.** See the constraint at the top.
- **No database.** Persistence is `localStorage`, network-scoped, and disposable by design — this
  is a lab, and losing a registry entry costs a redeploy, not data.
- **No test coverage beyond the pure layer.** Vitest covers `app/lib/` only (`tests/`, mirroring
  its paths) and the Rust contracts have their own suite (`contracts/tests/`). Pages, hooks,
  `app/components/` and the tx builders are deliberately untested — a builder's value is the
  order in which it calls CCC's completion helpers, and asserting that against a hand-rolled fake
  signer tests the fake rather than the chain. Gates are `pnpm build` + `pnpm lint` + `pnpm test`;
  widening what `pnpm test` covers is a decision to raise, not to make in passing.
- **No `tailwind.config.ts`.** Tailwind v4 tokens live in `app/globals.css` `@theme inline` only.
- **No state library beyond Zustand**, and no Context beyond theme.
- **Not every route is implemented.** `dao/`, `time-lock/`, `multisig/` and `history/`
  are `PageShell` placeholders awaiting their course lesson. A placeholder page is not a bug —
  and it says so on the page: each passes a `planned` prop naming its milestone and tracking
  issue, so the screen reads as unbuilt rather than broken. `PageShell` is used by these four
  routes and nothing else; an implemented page renders its own `<Name>Form` directly.
