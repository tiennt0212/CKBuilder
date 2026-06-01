# CKBuilder

Next.js 15 frontend + Rust CKB smart contracts. CKB-specific APIs via `@ckb-ccc/core`.

## Repo structure

```
ckb-lab/
├── web/                    # Next.js 15 (App Router) — only JS package
│   ├── app/
│   │   ├── (shell)/        # Route group — wraps all pages in AppLayout
│   │   ├── components/     # AppLayout, Header, Sidebar, PageShell, CubeMark
│   │   ├── contexts/       # NetworkContext (cccClient + network), ThemeContext (light/dark)
│   │   ├── lib/            # CKB utilities — format.ts, ccc-client.ts, index.ts
│   │   ├── globals.css     # @theme inline tokens — single source of truth for design tokens
│   │   └── providers.tsx   # Client root: ThemeProvider > AntdThemeProvider > NetworkProvider > CccProvider
│   └── package.json
└── contracts/              # Rust CKB scripts — Cargo workspace, pnpm does NOT touch this
    ├── Cargo.toml          # [workspace] members = ["contracts/*", "tests"]
    ├── Makefile            # `make build` → riscv64imac-unknown-none-elf binaries
    └── build/release/      # compiled binaries — read by web API routes for on-chain deploy
```

> No `pnpm-workspace.yaml` — single JS package (`web/`), no workspace needed.

## Tech stack

| Layer | Library |
|---|---|
| Framework | Next.js 15 (App Router) |
| UI | Ant Design 5.x |
| Styling | Tailwind CSS v4 (no `tailwind.config.ts`) |
| CKB wallet | `@ckb-ccc/connector-react` |
| CKB transactions | `@ckb-ccc/core` |
| Package manager | pnpm |
| Smart contracts | Rust + `ckb-std` (target: `riscv64imac-unknown-none-elf`) |
| Contract testing | `ckb-testtool` (native host) |

## Commands

```bash
pnpm -C web install      # install deps
pnpm -C web dev          # dev server
pnpm -C web build        # production build (also runs TypeScript check)
pnpm -C web lint         # lint
```

App defaults to testnet (`NEXT_PUBLIC_NETWORK=testnet` in `web/.env.local`).
For devnet: set `NEXT_PUBLIC_NETWORK=devnet` and run `offckb node`.

## Constraints

- Do NOT hardcode colors, font sizes, or font weights — use design tokens from `globals.css`
- Do NOT create `tailwind.config.ts` — all tokens live in `globals.css` `@theme inline` only
- Do NOT install new dependencies without asking first
- Do NOT push directly to `canary` — create a branch
- Do NOT refactor code outside the direct scope of the current task

## Tailwind design tokens

All tokens live in `web/app/globals.css` → `@theme inline`. Adding a token there automatically creates the Tailwind utility class. Runtime values (light/dark) are in `.theme-light` / `.theme-dark` in the same file.

Key classes: `text-text-1/2/3`, `bg-bg-body`, `bg-bg-elev`, `border-app-border`, `text-primary`, `bg-primary-tint`, `font-brand` (weight 650), `font-mono`, `text-body` (13.5px), `text-title` (17px).

See `DESIGN.md` for the full token reference and component patterns.

## Gotchas

- `px-[5px]`, `size-[7px]`, `py-[22px]` — intentional arbitrary values with no named token equivalent. Do NOT replace with approximations.
- `contracts/` is a standalone Cargo workspace — `pnpm` commands do not apply to it.
- `web/app/lib/` was previously named `ckb-utils`. Always import via path alias `@/lib/...`.

## Adding a feature page

1. Create `web/app/(shell)/<route>/page.tsx` using `PageShell`:
   ```tsx
   import { PageShell } from "../../components/PageShell";
   export const metadata = { title: "My Feature — CKBuilder" };
   export default function MyPage() {
     return <PageShell title="My Feature" description="..." status="todo" />;
   }
   ```
2. Add the route to `menuItems` in `web/app/components/Sidebar.tsx`
3. Add a `PAGE_TITLES` entry in `web/app/components/Header.tsx`

For pages that read/write chain state:

```tsx
"use client";
import { useNetwork } from "@/contexts/NetworkContext"; // network-aware CKB client
import { useCcc } from "@ckb-ccc/connector-react";     // wallet signer (null if disconnected)
```

Key lib exports (`@/lib/format`): `shannonToCKB`, `formatCapacity`, `utf8ToHex`, `hexToUtf8`, `truncateAddress`.

## Rust contracts

```bash
rustup target add riscv64imac-unknown-none-elf   # one-time setup
make -C contracts build                           # → contracts/build/release/
cd contracts && cargo test                        # tests run on native host, no RISC-V needed
```

New contract: add crate at `contracts/contracts/<name>/`, register in `contracts/Cargo.toml` workspace members, add build rule to `contracts/Makefile`, add tests in `contracts/tests/src/`.

## Definition of Done

Before ending any task:
1. `pnpm -C web build` — must pass with 0 errors
2. `pnpm -C web lint` — must pass
3. If you added a route: confirm it appears in `Sidebar.tsx` `menuItems` and `Header.tsx` `PAGE_TITLES`
4. If you added a contract: confirm it builds with `make -C contracts build`
