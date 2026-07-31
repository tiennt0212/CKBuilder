# CKBuilder — workspace

This directory is a workspace of unrelated projects, not a single project and not
a monorepo — the subdirectories share no build and no root manifest ties them
together. Each real project resolves its own tooling and its own context.

| Directory | What it is | Yours? |
|---|---|---|
| `ckb-lab/` | The active project — Next.js 15 app + Rust CKB smart contracts (a CKB developer "lab" dashboard) | yes — see `ckb-lab/CLAUDE.md` |
| `ckb-rust-example/` | Small owned Rust spike driving `ckb-sdk` (capacity transfer, cell queries) | yes — see `ckb-rust-example/CLAUDE.md` |
| `ckb-rust-example/ckb-cli/` | Clone of `nervosnetwork/ckb-cli` (MIT, its own `.git`) | NO — reference only, don't edit as ours |
| `learning-ckb-fundamentals/` | Clone of `RaheemJnr/learning-ckb-fundamentals` (24-lesson course site, its own `.git`) | NO — reference only, don't edit as ours |
| `weekly-report/` | Prose progress reports (`w1.md`…`w11.md`) | n/a — no code, no context layer |

Shared Claude Code tooling lives in `.claude/skills/` (the `*-exp` skills such as
`ckbuilder-exp`, `frontend-exp`, `antd-exp`, `tailwind-v4-exp`, `storybook-exp`,
plus `dev-harness`). It is consumed mainly by `ckb-lab`.

A task usually means `ckb-lab` unless it names another project. Ask if unclear.
The root file only orients — each sub-project's own `CLAUDE.md` instructs.
