# ckb-lab

The CKBuilder app: a Next.js 15 frontend plus the Rust CKB contracts it deploys.

**Start with the [repository README](../README.md)** — what CKBuilder is, what works today, and
the architecture. This file is the short version for someone already in this directory.

## Commands

```bash
pnpm install
pnpm dev                  # dev server on :3000
pnpm build                # production build — also runs the TypeScript check
pnpm lint
pnpm format               # prettier --write .
pnpm storybook            # component workshop on :6006

rustup target add riscv64imac-unknown-none-elf   # one-time
make -C contracts build   # → contracts/build/release/
make -C contracts test    # builds first, then `cargo test -p tests`
```

`contracts/` is a standalone Cargo workspace — no pnpm command touches it, and a bare
`cargo test` at its root fails to link. Always go through the Makefile.

## Network

Set `NEXT_PUBLIC_NETWORK` in `.env.local` to `testnet` (default), `devnet`, or `mainnet`. It
only picks the *initial* network; the header's picker switches at runtime, which is why code
reads the active network from `useNetworkStore` and never from the env var.

`devnet` needs a local node — `offckb node`, JSON-RPC on `http://localhost:28114`. This works
from the deployed build too, not just from `localhost`: `http://localhost` is a
potentially-trustworthy origin, so it is exempt from mixed-content blocking, and the node answers
with permissive CORS. Chrome 142+ asks for Local Network Access permission the first time. The
picker probes the node before switching, so a missing one says so instead of silently breaking
every page.

## Working on this

`CLAUDE.md` holds the build conventions and the UI component decision order. The deeper context
lives in [`.context/`](.context/INDEX.md) — read `processes/gotchas.md` before debugging
anything CKB-related that "should work", and `glossary/ckb-terms.md` before reasoning about
cells, capacity, scripts, or `hash_type`.

`DESIGN.md` is the design-token reference; `docs/<route>-features.md` describes what a feature
does for the end user.
