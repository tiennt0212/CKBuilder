# ckb-lab

Next.js 15 app + Rust CKB smart contracts — a developer "lab" where each page makes one CKB
concept concrete by building a real transaction. CKB APIs via `@ckb-ccc/core`.

The directory and pnpm package are `ckb-lab`; the app's user-facing brand is **CKBuilder** (page
titles, the Claude Design file `CKBuilder.html`). `CKBuilder` is also the name of the parent
workspace directory — it is not this project.

> **Constraint: this is a browser-only dapp, not a full-stack app.** There are zero route
> handlers, zero server actions, and nothing imports `fs` or `next/server`. Every chain call runs
> in the browser against a CKB node's JSON-RPC, signed by the user's wallet extension; all
> persistence is `localStorage`. That is why there is no auth, no session, no database — and why
> a compiled contract binary reaches the chain by the user *uploading* it on `/deploy`, never by
> the server reading `contracts/build/release/`. If something looks like it needs a route
> handler, raise it; do not add one.

## Context files

Read on demand — start at `.context/INDEX.md`. Two are worth reaching for by default:

- **`.context/processes/gotchas.md`** — CKB failures surface far from their cause. Check here
  before debugging anything that "should work".
- **`.context/glossary/ckb-terms.md`** — before reasoning about cells, capacity, scripts,
  `hash_type`, or Type ID. CKB is UTXO-style; an account/contract-storage mental model is wrong.

Also: `.context/architecture/system-design.md` (structure, state, data flow),
`.context/processes/definition-of-done.md` (**resolve the task tier here before starting**),
`.context/processes/decisions-log.md`, `.context/design/`.

`DESIGN.md` is the full design-token reference. `docs/<route>-features.md` is what a feature does
for the end user.

## MCP servers

Configured in `.mcp.json` at the **workspace root** (one level up), so they are shared with the
other projects there.

- **`mcp__ckb-ai__*`** — CKB RPC and indexer queries, devnet helpers, testnet faucet. Use it to
  check chain state directly instead of writing throwaway script. It uses deferred loading:
  call `search_tools` first. Its CKB knowledge is general — it does **not** override
  `.context/glossary/ckb-terms.md`, which records how *this repo* uses those terms.
- **`mcp__Claude_Design__*`** — the design project. Prefer these over the built-in `DesignSync`
  tool; see `.context/design/claude-design-sync.md` for why and for the API differences.

## Tech stack

| Layer | Library |
|---|---|
| Framework | Next.js 15 (App Router), React 18 |
| UI | Ant Design 5 |
| Styling | Tailwind CSS v4 (no `tailwind.config.ts`) |
| State | Zustand 5 (`app/stores/`) — Context only for theme |
| CKB wallet | `@ckb-ccc/connector-react` |
| CKB transactions | `@ckb-ccc/core` |
| Package manager | pnpm — single package at root, no workspace packages |
| Smart contracts | Rust + `ckb-std`, target `riscv64imac-unknown-none-elf` |
| Contract testing | `ckb-testtool` (native host) |
| TypeScript testing | Vitest — `tests/`, covering `app/lib/` only |
| Component dev | Storybook 8 (Vite builder) |

## Commands

```bash
pnpm dev                  # dev server
pnpm build                # production build — also runs the TypeScript check
pnpm lint                 # lint
pnpm format               # prettier --write .
pnpm test                 # Vitest, once — covers app/lib/ only
pnpm test:watch           # Vitest, watch mode
pnpm storybook            # Storybook on :6006

rustup target add riscv64imac-unknown-none-elf   # one-time
make -C contracts build   # → contracts/build/release/
make -C contracts test    # builds first, then `cargo test -p tests`
```

`contracts/` is a standalone Cargo workspace — no pnpm command touches it. Bare `cargo test` at
its root fails to link; always scope to `-p tests`.

Network comes from `NEXT_PUBLIC_NETWORK` in `.env.local` (defaults to `testnet`). For devnet, set
it to `devnet` and run `offckb node`. Read the active network from `useNetworkStore`, never from
the env var — the user can switch at runtime.

## Constraints

- Do NOT hardcode colors, font sizes, or font weights — use tokens from `app/globals.css`
- Do NOT create `tailwind.config.ts` — all tokens live in `globals.css` `@theme inline`
- Do NOT install a new dependency without asking first
- Do NOT push directly to `canary` — create a branch
- Do NOT refactor code outside the direct scope of the current task
- Import via the `@/` alias (`@/*` → `./app/*`), never a relative climb out of a route directory
- When a session produced several independent changes, split them into one commit per unit of
  change — do not lump them together, even if asked to "commit this" once
- Don't decide alone: new dependencies, adding any server-side code, changing the tx-building
  call order in `app/lib/ckb/`, deleting existing code
- Arbitrary Tailwind values like `px-[5px]`, `size-[7px]`, `py-[22px]` are intentional — they
  have no named token equivalent. Do NOT replace them with approximations

## UI component decision order (follow strictly)

Before writing any UI code, stop at the first match:

1. **Ant Design has it** → use it, with Tailwind `className` or inline `style` for visual tweaks
2. **Ant Design has it but needs heavier restyling** → still use it, with a CSS override on the
   wrapper. Do NOT reimplement Antd's logic in a custom component
3. **`app/components/ui/` has a domain wrapper** → use it. Inventory + purposes:
   `.context/design/component-library.md`
4. **Nothing fits** → build a new `ui/` component composing Antd primitives

```tsx
// Tighten padding on an Antd Button — no custom component needed
<Button size="small" className="px-2! h-7! text-xs">Copy</Button>

// Antd Card background — use `styles`, not `bodyStyle` (deprecated in v5)
<Card className="bg-bg-elev border-app-border" styles={{ body: { padding: 12 } }}>…</Card>
```

Tailwind v4's important modifier is a **suffix**: `px-2!`, not `!px-2`. The prefix form fails
silently.

Consult the relevant `*-exp` skill before writing React/Next.js, Antd, Tailwind, Storybook, or
CKB code — `frontend-exp`, `antd-exp`, `tailwind-v4-exp`, `storybook-exp`, `ckbuilder-exp`. This
is gate 6, not a suggestion.

## Design tokens

All tokens live in `app/globals.css` → `@theme inline`; adding one there creates the Tailwind
utility automatically. Light/dark runtime values are in `.theme-light` / `.theme-dark` in the
same file.

Common: `text-text-1/2/3`, `bg-bg-body`, `bg-bg-elev`, `border-app-border`, `text-primary`,
`bg-primary-tint`, `font-brand` (weight 650), `font-mono`, `text-body` (13.5px), `text-title`
(17px). Full reference: `DESIGN.md`.

## Adding a feature page

1. Create `app/(shell)/<route>/page.tsx` rendering `PageShell`
2. Register the route in **both** `ROUTES` and `PAGE_TITLES` in `app/lib/routes.ts`, and in
   `NAV_ITEMS` in `app/lib/nav-items.tsx` — this is gate 3
3. Non-trivial form → extract it into `<route>/<FeatureName>Form.tsx` beside `page.tsx`
4. Chain logic goes in `app/lib/ckb/` (pure, no React); the hook wrapping it goes in
   `app/features/<domain>/`. A page never builds a transaction itself

```tsx
"use client";
import { useNetworkStore } from "@/stores/network"; // network-aware CKB client
import { useSigner } from "@ckb-ccc/connector-react"; // null while disconnected
```

## Definition of Done

Every task is `lab-spike` or `polished`, set by the GitHub issue label. **No label → treat it as
`lab-spike` and say so.** Never silently apply the polished gates; they roughly double a page's
file count and that cost is the user's call.

Both tiers: `pnpm build`, `pnpm lint` and `pnpm test` pass, routes registered, contracts build,
new tokens synced to both files, `*-exp` skills consulted, non-obvious logic commented with WHY,
and a new or changed pure module under `app/lib/` carries a Vitest test.

Full gate list, the polished-only gates, the promotion path, and the table of which context file
each kind of change invalidates: **`.context/processes/definition-of-done.md`**. Read it before
declaring anything done.
