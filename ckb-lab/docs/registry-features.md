# Script Registry — Feature Documentation

The Script Registry (`/registry`) is the management UI for the deployed-script registry that
`/deploy` and `/invoke` share. It lists every script this browser has deployed or saved on the
active network, and lets the user view, add, edit, delete, and hide entries.

The registry itself is browser-local (`localStorage` key `ckbuilder:deployedScripts`); there is no
server. Entries are **network-scoped** — the page shows only the active network's entries, because
an outpoint from one network resolves to nothing on another.

## Why this page exists

`/deploy` produces a `code_hash` and an outpoint, and `/invoke` consumes them, but until now the
registry had no UI: a wrong entry (e.g. a bad `hash_type`) could only be fixed by editing
`localStorage` in DevTools. This page makes the registry a first-class, editable object.

## Architecture

Three layers, matching the repo's conventions (see `frontend-exp` → `state-singleton-stores`):

| Layer | File | Role |
|---|---|---|
| Storage | `lib/ckb/deployed-scripts.ts` | Pure functions over `localStorage` (serialize, read/write). Testable, no React. |
| Reactive | `stores/deployed-scripts.ts` | Zustand **singleton** store mirroring storage; every mutation writes through then refreshes. |
| UI | `(shell)/registry/*`, `components/RegistryDrawer.tsx` | Table + drawer reading the store. |

A singleton store (not a per-component hook, not a class) means a save on `/deploy` or `/invoke` is
visible on `/registry` immediately, with no reload — all three read the same instance.

## User Flow

1. Open **Script Registry** (`/registry`). The table lists entries for the active network.
2. **Add** — click "Add script" → the drawer opens in Create mode. Fill code_hash, hash_type,
   outpoint, dep_type, optional label, then "Add to registry".
3. **View** — click a row → the drawer shows the entry read-only, with an Edit button.
4. **Edit** — pencil icon or Edit-in-drawer → change any field. Saving re-keys if the identity
   changed (see below).
5. **Delete** — trash icon → confirm. Removes the registry entry only; the on-chain cell is
   untouched.
6. **Hide/Show** — the Hidden switch (in the row or the edit form) toggles whether the entry
   appears in the `/invoke` picker.

## Table Columns

| Column | Notes |
|---|---|
| Label | User-set name; defaults to the truncated code_hash |
| code_hash | Truncated, with copy button |
| hash_type | `type` / `data` / `data1` / `data2` |
| dep_type | `code` / `dep_group` |
| Hidden | Antd `Switch`; toggles picker visibility |
| Actions | View / Edit / Delete (with `Popconfirm`) |

Hidden entries stay listed but dimmed (opacity), reading as "parked, not active".

## Editing identity — re-key

An entry's `id` is `txHash:index:network`. The Edit form lets you change **all** fields, including
those three. When they change, the id changes, so the store **re-keys**: it deletes the old id and
writes the new entry (`update(oldId, entry)` in `stores/deployed-scripts.ts`), so the entry moves
rather than duplicating. A small edit to identity fields therefore relocates the entry — intended,
but worth knowing.

## Hide vs Delete

- **Hide** keeps the entry (and its metadata) but removes it from the `/invoke` Deployed picker.
  Reversible from this page.
- **Delete** removes the entry from the registry entirely. The on-chain cell is unaffected; the
  script can be re-added manually or by re-deploying.

## Relationship to /invoke and /deploy

- `/deploy` writes a committed deploy into the store via `add()`.
- `/invoke` Deployed mode reads `scripts.filter(s => !s.hidden)` for its picker.
- `/invoke` Manual mode's "Save to registry" opens the **same `RegistryDrawer`** in Create mode,
  prefilled from the manual fields — the drawer is the single place entries are created/edited.

## Edge Cases

- **Empty registry** — the table shows an Empty state scoped to the active network.
- **Network switch** — the store re-reads for the new network; entries from other networks are not
  shown (but not lost).
- **SSR** — `localStorage` is unavailable during server render, so the store is filled in a mount
  effect; the first paint shows an empty table until the effect runs.
- **Delete is registry-only** — it never touches chain state; the wording in the confirm makes this
  explicit.
