# Definition of Done

Not every page earns the same build cost. This repo is a learning lab: most pages exist to make
a CKB concept concrete, and only a subset ships as a main-track feature. Every task is therefore
either **`lab-spike`** or **`polished`**.

## Picking the tier

Course issues carry a `lab-spike` or `polished` GitHub label — **that label is the source of
truth**. If a task arrives with no tier, treat it as `lab-spike` and say so in your response.

Never silently apply the polished gates. They roughly double the file count of a page, and that
cost is the user's decision, not yours to assume.

| | `lab-spike` | `polished` |
|---|---|---|
| Intent | Build to understand a concept | Build to ship |
| Reader | The maintainer, while learning | Someone using ckb-lab |
| Claude Design artboard | skip | required |
| Storybook story | skip | required for new `ui/` components |
| `docs/<route>-features.md` | skip | required |
| New `ui/` component | optional — inline JSX in the page is fine | extract reusable pieces into `ui/` |
| Design tokens, no hardcoded values | required | required |

## Gates 1–7 — every task, both tiers

1. `pnpm build` passes with 0 errors (this also runs the TypeScript check)
2. `pnpm lint` passes
3. Added a route → it appears in `ROUTES` **and** `PAGE_TITLES` in `app/lib/routes.ts`, and in
   `NAV_ITEMS` in `app/lib/nav-items.tsx`
4. Added a contract → it builds with `make -C contracts build`, and its crate is registered in
   `contracts/Cargo.toml` members **and** in `CRATES` in `contracts/Makefile`
5. Added a design token → it exists in **both** `app/globals.css` `@theme inline` and the
   `CKBuilder.html` CSS vars in Claude Design. A `lab-spike` should rarely need a new token —
   reach for an existing one first; if you genuinely need one, sync both files even though the
   spike skips every other Claude Design step
6. **Exp skills consulted** — before writing React/Next.js, Antd, Tailwind, Storybook, or CKB
   code, the relevant skill has been read: `frontend-exp`, `antd-exp`, `tailwind-v4-exp`,
   `storybook-exp`, `ckbuilder-exp`. Do not skip because a change "looks trivial" — known
   gotchas live there
7. **Non-obvious logic is commented** — any workaround, CKB-specific invariant, subtle state
   transition, or behaviour that would surprise a future reader carries an inline comment
   explaining WHY, not what. Code that reads straightforwardly from its identifiers needs none

**A `lab-spike` is done here — stop.** Do not open Claude Design, do not write a story, do not
create a `docs/` file. Skipping those is the entire point of the tier, not a corner cut; a spike
that quietly grows the polished artifacts has spent the budget the tier exists to protect. If
the work genuinely warrants them, say so and let the user promote the issue rather than deciding
unilaterally.

## Gates 8–10 — `polished` only

8. Added a `ui/` component → its story exists in `stories/components/` **and** a `<Spec>` entry
   exists in `ds-components.jsx`
9. Added a screen state or component variant → the Claude Design artboard is updated
   (`ckb-screens.jsx` / `ckb-screens-2.jsx` and/or `ds-components.jsx`)
10. Changed user-visible behaviour → the relevant `docs/` file is updated (see the table below)

### `docs/` map

| Path | Contents |
|---|---|
| `docs/design/` | Component-level design specs, one file per component (e.g. `header.md`) |
| `docs/<route>-features.md` | End-user feature description, states, and edge cases |

- New page or route → create `docs/<route>-features.md` covering every UI state and user flow
- New `ui/` component with non-trivial behaviour → create `docs/design/<ComponentName>.md` with
  a prop table and state diagram
- Changed user-visible behaviour (status transitions, error messages, copy text) → update the
  relevant `docs/` file

`docs/` is the single source of truth for "what does this feature do" — separate from
`DESIGN.md` (token reference) and `CLAUDE.md` (build conventions).

## Consistency table — update in the same session

If this session changed any of the following, update the corresponding file **before finishing**.
Deferred context updates are never made.

| What changed | File to update |
|---|---|
| Added a directory under `app/` or `contracts/`, or moved a subsystem | `.context/architecture/system-design.md` |
| Added or removed a component in `app/components/ui/` | `.context/design/component-library.md` |
| Hit a trap where the reasonable assumption was wrong | `.context/processes/gotchas.md` |
| The human confirmed a decision, with a reason | `.context/processes/decisions-log.md` |
| Answered one of the Open questions | `.context/processes/decisions-log.md` (move it up as a dated entry) |
| Introduced a CKB term this repo uses in a narrow sense | `.context/glossary/ckb-terms.md` |
| Changed the Claude Design file map or sync workflow | `.context/design/claude-design-sync.md` |
| Changed commands, constraints, or the UI decision order | `CLAUDE.md` |

`component-library.md` is the one file here that mirrors something the filesystem already knows
(`ls app/components/ui/`). Its row is not optional: without it that table drifts silently, and a
stale entry is worse than no table, because the agent will build against a component that no
longer exists.

## Session summary format

End a session with this, not a prose paragraph:

```
### Session Summary — [task]
**Tier:** lab-spike | polished (and where that came from)
**Done:**
**Incomplete / not done:** [with reason]
**Questions for the human before next session:**
**New decisions settled this session:** [→ decisions-log.md]
**Context files updated:** [or "none"]
```

The Questions line does real work — it is the sanctioned place to surface uncertainty instead of
resolving it silently, which is where most quiet wrong turns start.

## Promotion path: `lab-spike` → `polished`

A spike graduates when it stops being a scratchpad and takes a main-track slot. Promotion is
**its own task** — never fold it into an unrelated feature change, because the diff is large and
reviewing it alongside behaviour changes hides both.

1. Swap the issue label: drop `lab-spike`, add `polished`
2. Extract the page's repeated or reusable JSX into `app/components/ui/` components
3. Add a story in `stories/components/` for each extracted component, plus a `<Spec>` entry in
   `ds-components.jsx`
4. Add the screen and its states to `ckb-screens-2.jsx`, and register it in the gallery array in
   `CKBuilder.html`
5. Write `docs/<route>-features.md` covering every UI state and user flow
6. Re-run gates 1–10

The reverse never happens: a `polished` page does not get demoted to shed its artifacts.
