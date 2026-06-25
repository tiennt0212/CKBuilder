# CKBuilder

Next.js 15 frontend + Rust CKB smart contracts. CKB-specific APIs via `@ckb-ccc/core`.

## Repo structure

```
ckb-lab/                    # Next.js 15 (App Router) — single JS package at root
├── .storybook/             # Storybook config (Vite + React, resolves @/ → app/)
├── stories/
│   ├── chrome/             # Header, Sidebar stories
│   ├── components/         # Stories for every ui/ component
│   └── foundations/        # Colors, Spacing, Typography
├── app/
│   ├── (shell)/            # Route group — wraps all pages in AppLayout
│   │   └── <route>/        # Each route may co-locate a <Name>Form.tsx beside page.tsx
│   ├── components/
│   │   ├── ui/             # Reusable domain UI — use these before creating new components
│   │   └── *.tsx           # AppLayout, Header, Sidebar, PageShell, CubeMark
│   ├── contexts/           # ThemeContext (light/dark) — network state lives in stores/
│   ├── stores/             # Zustand stores — network.ts (network + cccClient)
│   ├── features/           # Feature-scoped logic (hooks, utils) — not page components
│   ├── lib/                # CKB utilities — format.ts, ccc-client.ts, routes.ts, nav-items.tsx, index.ts
│   ├── globals.css         # @theme inline tokens — single source of truth for design tokens
│   └── providers.tsx       # Client root: ThemeProvider > AntdThemeProvider > CccProvider > NetworkSync
├── package.json
└── contracts/              # Rust CKB scripts — Cargo workspace, pnpm does NOT touch this
    ├── Cargo.toml          # [workspace] members = ["contracts/*", "tests"]
    ├── Makefile            # `make build` → riscv64imac-unknown-none-elf binaries
    └── build/release/      # compiled binaries — read by web API routes for on-chain deploy
```

## Tech stack

| Layer | Library |
|---|---|
| Framework | Next.js 15 (App Router) |
| UI | Ant Design 5.x |
| Styling | Tailwind CSS v4 (no `tailwind.config.ts`) |
| CKB wallet | `@ckb-ccc/connector-react` |
| CKB transactions | `@ckb-ccc/core` |
| Package manager | pnpm (single package at repo root, no workspace packages) |
| Smart contracts | Rust + `ckb-std` (target: `riscv64imac-unknown-none-elf`) |
| Contract testing | `ckb-testtool` (native host) |
| Component dev | Storybook 8 (Vite, `@storybook/react-vite`) |

## Commands

```bash
pnpm install              # install deps
pnpm dev                  # dev server
pnpm build                # production build (also runs TypeScript check)
pnpm lint                 # lint
pnpm storybook            # Storybook dev server on :6006
pnpm build-storybook      # static Storybook build
```

App defaults to testnet (`NEXT_PUBLIC_NETWORK=testnet` in `.env.local`).
For devnet: set `NEXT_PUBLIC_NETWORK=devnet` and run `offckb node`.

## Constraints

- Do NOT hardcode colors, font sizes, or font weights — use design tokens from `globals.css`
- Do NOT create `tailwind.config.ts` — all tokens live in `globals.css` `@theme inline` only
- Do NOT install new dependencies without asking first
- Do NOT push directly to `canary` — create a branch
- Do NOT refactor code outside the direct scope of the current task

## UI component decision order (follow strictly)

Before writing any UI code, go through this checklist in order — stop at the first match:

1. **Ant Design has it** → use it. Apply Tailwind `className` or inline `style` for visual tweaks.
2. **Ant Design has it but needs heavier restyling** → use it with a CSS override on the wrapping element. Do NOT duplicate Antd's logic in a custom component.
3. **`components/ui/` has a domain-specific wrapper** → use that wrapper.
4. **Nothing fits** → build a new `ui/` component, composing Antd primitives inside it.

CSS tweak examples (preferred over custom components):
```tsx
// Tighten padding on an Antd Button — no custom component needed
<Button size="small" className="px-2! h-7! text-xs">Copy</Button>

// Give an Antd Card a custom background — use `styles` not `bodyStyle` (deprecated in v5)
<Card className="bg-bg-elev border-app-border" styles={{ body: { padding: 12 } }}>…</Card>

// Style an Antd Tag with a token color
<Tag className="border-0 bg-primary-tint text-primary text-xs">Active</Tag>
```

## Tailwind design tokens

All tokens live in `app/globals.css` → `@theme inline`. Adding a token there automatically creates the Tailwind utility class. Runtime values (light/dark) are in `.theme-light` / `.theme-dark` in the same file.

Key classes: `text-text-1/2/3`, `bg-bg-body`, `bg-bg-elev`, `border-app-border`, `text-primary`, `bg-primary-tint`, `font-brand` (weight 650), `font-mono`, `text-body` (13.5px), `text-title` (17px).

See `DESIGN.md` for the full token reference and component patterns.
Component-level design specs live in `docs/design/` (e.g. `docs/design/header.md`).

## Component library (`components/ui/`)

Before building any new UI piece, check if `app/components/ui/` already has it:

| Component | Purpose |
|---|---|
| `Badge` | Status/count badge |
| `CopyText` | Inline text with clipboard copy button (idle/copied/failed states) |
| `CellChip` | CKB cell summary card (capacity, lock, address, optional accent stripe) |
| `CellFlow` | Visual input→output cell flow diagram |
| `DaoPosition` | Nervos DAO deposit/withdraw position card |
| `FormItem` | Form field label with optional right-aligned hint |
| `MultisigParticipant` | Multisig co-signer row (key, weight) |
| `NoteBox` | Info/warning callout box |
| `RawBlock` | Monospace pre-formatted data block (hex, JSON) |
| `StatePanel` | Two-column key-value state display panel |
| `StatusChip` | Small colored chip for on-chain status |
| `SummaryPanel` | Transaction summary row list |
| `SwitchRow` | Labeled toggle row |
| `TokenListItem` | Token balance list item |
| `TxStatusBanner` | Lifecycle banner for CKB tx status: sending → sent → pending → proposed → committed / rejected |
| `UploadZone` | File drag-and-drop upload area |

Every component in `ui/` must have a corresponding story in `stories/components/`.

## Gotchas

- `px-[5px]`, `size-[7px]`, `py-[22px]` — intentional arbitrary values with no named token equivalent. Do NOT replace with approximations.
- Tailwind v4 important modifier is a **suffix**: `px-2!` not `!px-2`. Using `!` prefix will silently fail.
- `contracts/` is a standalone Cargo workspace — `pnpm` commands do not apply to it.
- `app/lib/` was previously named `ckb-utils`. Always import via path alias `@/lib/...`.
- Complex pages extract a co-located `<Name>Form.tsx` (e.g. `TransferForm.tsx` beside `transfer/page.tsx`). Follow this pattern for pages with non-trivial forms.

## Adding a feature page

1. Create `app/(shell)/<route>/page.tsx` using `PageShell`:
   ```tsx
   import { PageShell } from "../../components/PageShell";
   export const metadata = { title: "My Feature — CKBuilder" };
   export default function MyPage() {
     return <PageShell title="My Feature" description="..." status="todo" />;
   }
   ```
2. Add the route constant to `ROUTES` in `app/lib/routes.ts` and add its nav item to `NAV_ITEMS` in `app/lib/nav-items.tsx`
3. Add a `PAGE_TITLES` entry in `app/lib/routes.ts`
4. If the page has a non-trivial form, extract it into `<route>/<FeatureName>Form.tsx`

For pages that read/write chain state:

```tsx
"use client";
import { useNetworkStore } from "@/stores/network"; // network-aware CKB client
import { useCcc } from "@ckb-ccc/connector-react";     // wallet signer (null if disconnected)
```

Key lib exports (`@/lib/format`): `shannonToCKB`, `formatCapacity`, `utf8ToHex`, `hexToUtf8`, `truncateAddress`.

## Adding a UI component

1. Create `app/components/ui/<ComponentName>.tsx`
2. Export it as a named export
3. Create `stories/components/<ComponentName>.stories.tsx` with at least a Default story

## Feature documentation

User-facing feature docs live in `docs/`. When implementing or significantly changing a feature, update (or create) the relevant doc:

| Path | Contents |
|---|---|
| `docs/design/` | Component-level design specs (one file per component, e.g. `header.md`) |
| `docs/<feature>-features.md` | End-user feature description, states, and edge cases (e.g. `cell-explorer-features.md`) |

**When to update docs:**

- New page or route → create `docs/<route>-features.md` describing all UI states and user flows
- New `ui/` component with non-trivial behavior → create `docs/design/<ComponentName>.md` with prop table and state diagram
- Changed user-visible behavior (status transitions, error messages, copy text) → update the relevant `docs/` file

This keeps the `docs/` directory the single source of truth for "what does this feature do" — separate from `DESIGN.md` (token reference) and `CLAUDE.md` (build conventions).

## Rust contracts

```bash
rustup target add riscv64imac-unknown-none-elf   # one-time setup
make -C contracts build                           # → contracts/build/release/
cd contracts && cargo test                        # tests run on native host, no RISC-V needed
```

New contract: add crate at `contracts/contracts/<name>/`, register in `contracts/Cargo.toml` workspace members, add build rule to `contracts/Makefile`, add tests in `contracts/tests/src/`.

## Claude Design integration

The visual design lives in a Claude Design project (accessible via `DesignSync` MCP tool, available in this environment). Project ID: `8e7cfe8c-2db9-4eb1-92d2-6ea76f6a7de6`.

### File map

| Design file | Contents |
|---|---|
| `CKBuilder.html` | All CSS + screen gallery (Transfer, Invoke, Assets) with per-screen state artboards |
| `ckb-screens.jsx` | JSX artboards for every screen state — tab between states using the `S` selector at top |
| `ds-catalog.jsx` | Design System foundations (Brand, Color, Typography, Metrics, Icons) + helper primitives (`Section`, `Spec`, `Stage`, `Var`) |
| `ds-components.jsx` | Design System components (Buttons, Inputs, Badges, `TxStatusBanner`, Cards, Cells…) + app shell |
| `ckb-icons.jsx` | Icon definitions used across all files |

### DesignSync workflow

```
1. DesignSync.get_file(projectId, path)       → read current file content
2. DesignSync.finalize_plan(writes, deletes)  → declare intent (always pass deletes: [])
3. DesignSync.write_files(planId, files)      → push updated content (must pass projectId)
```

Always `get_file` first — write the full file content back (the API replaces, not patches).

### When to update Claude Design

| Action | Files to update |
|---|---|
| New CSS class for a component | `CKBuilder.html` — add the class in the relevant CSS block |
| New screen state or artboard | `ckb-screens.jsx` + update the gallery array in `CKBuilder.html` |
| New `ui/` component | `ds-components.jsx` — add a `<Spec>` with all variants inside the relevant `Section` |
| New design token | `CKBuilder.html` CSS vars + `app/globals.css` (keep both in sync) |

### Workflow convention

Design and code should stay in parallel — update the Claude Design artboard **in the same task** as the code change, not after. The Design System pane (`ds-components.jsx`) is the canonical visual reference; `DESIGN.md` is the prose reference.

## Definition of Done

Before ending any task:
1. `pnpm build` — must pass with 0 errors
2. `pnpm lint` — must pass
3. If you added a route: confirm it appears in `lib/routes.ts` `ROUTES` + `PAGE_TITLES` and `lib/nav-items.tsx` `NAV_ITEMS`
4. If you added a `ui/` component: confirm its story exists in `stories/components/` **and** a `<Spec>` entry exists in `ds-components.jsx`
5. If you added a new screen state or component variant: confirm the Claude Design artboard is updated (`ckb-screens.jsx` and/or `ds-components.jsx`)
6. If you added a new design token: confirm it exists in both `app/globals.css` and `CKBuilder.html` CSS vars
7. If you added a contract: confirm it builds with `make -C contracts build`
8. If you added or changed user-visible behavior: confirm `docs/` is updated (see "Feature documentation" section)
