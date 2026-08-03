# .context — reading order

`ckb-lab` is a Next.js 15 browser-only app plus Rust CKB contracts. It grew out of a 24-part CKB
course; the roadmap is now cut by product milestone, tracked in GitHub. `CLAUDE.md` at the repo
root is always read; these files are read on demand.

## Read first, on any task

1. **`processes/gotchas.md`** — traps where the reasonable assumption is wrong. Highest value in
   this repo: CKB's failure modes surface far from their cause, so an agent that skips this
   loses time to a bug the codebase already solved once.
2. **`glossary/ckb-terms.md`** — if you are about to reason about cells, capacity, scripts,
   `hash_type`, or Type ID. CKB is UTXO-style; an Ethereum mental model produces confidently
   wrong code here.

## Read when the task calls for it

| File | Read it when |
|---|---|
| `architecture/system-design.md` | Adding a page, a store, or a contract; or before assuming anything about a backend (there is none) |
| `processes/definition-of-done.md` | Before declaring a task finished, and to resolve the `lab-spike` vs `polished` tier |
| `processes/decisions-log.md` | About to change something that looks arbitrary — check whether it was settled and why. Also holds Open questions: decisions whose reason is unrecorded |
| `design/component-library.md` | Step 3 of the UI component decision order — before building any new UI |
| `design/claude-design-sync.md` | `polished` tasks only, when the artboard needs updating |

## Canonical locations

Anything below is stated in exactly one place. Link to it; do not restate it.

| Subject | Lives in |
|---|---|
| Directory tree | `architecture/system-design.md` |
| `app/components/ui/` inventory | `design/component-library.md` |
| Design tokens (full reference) | `../DESIGN.md` |
| End-user feature behaviour | `../docs/<route>-features.md` |
| Commands, constraints, UI decision order | `../CLAUDE.md` |

## Maintenance

The consistency table in `processes/definition-of-done.md` maps each kind of change to the file
it invalidates. That table is the only mechanism keeping these files true — a context file that
has gone stale misleads worse than no file at all.
