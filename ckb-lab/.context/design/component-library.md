# Component library — `app/components/ui/`

Read this at step 3 of the UI component decision order in `CLAUDE.md`, before building anything
new.

> **Source of truth is `ls app/components/ui/`.** This table exists for the *Purpose* column,
> which a directory listing cannot give you. It is a mirror and it will drift — adding or
> removing a component under `ui/` requires updating this table in the same session
> (`../processes/definition-of-done.md`, consistency table). If the table and the directory
> disagree, the directory wins.

## Domain components

| Component | Purpose |
|---|---|
| `Badge` | Status / count badge |
| `CapacityInfoPanel` | Total CKB a deploy needs (capacity + fee) with a green/red balance-sufficiency chip once a preview build lands; neutral placeholder row until `required` is known |
| `CellChip` | CKB cell summary card — capacity, lock, address, optional accent stripe |
| `CellFlow` | Visual input → output cell flow diagram |
| `CopyText` | Inline text with a clipboard copy button (idle / copied / failed states) |
| `DaoPosition` | Nervos DAO deposit/withdraw position card |
| `FormItem` | Form field label with an optional right-aligned hint |
| `MultisigParticipant` | Multisig co-signer row (key, weight) |
| `NoteBox` | Info / warning callout box |
| `RawBlock` | Monospace pre-formatted data block (hex, JSON) |
| `StatePanel` | Two-column key-value state display panel |
| `StatusChip` | Small coloured chip for on-chain status |
| `SummaryPanel` | Transaction summary row list |
| `SwitchRow` | Labelled toggle row |
| `TokenListItem` | Token balance list item |
| `TxStatusBanner` | Tx lifecycle banner: sending → sent → pending → proposed → committed / rejected. On a failure, pass `decoded` (from `decodeTxError`) to get the plain-language cause, exit code and next step, with the node's raw message kept in a collapsed panel |
| `UploadZone` | File drag-and-drop upload area. Sets `beforeUpload={() => false}` internally, so the file never leaves the browser |

## Chrome (`app/components/`, not `ui/`)

`AppLayout`, `Header`, `Sidebar`, `PageShell`, `CubeMark`, `NetworkPill`, `WalletButton`,
`RegistryDrawer`. These are app-specific and single-use; do not generalise them into `ui/`.

## Adding a component

1. Create `app/components/ui/<ComponentName>.tsx`, exported as a **named** export
2. Add its row to the table above
3. `polished` only — create `stories/components/<ComponentName>.stories.tsx` with at least a
   Default story, and add a `<Spec>` entry in `ds-components.jsx`
   (see `claude-design-sync.md`)

On a `lab-spike`, **prefer not to create a `ui/` component at all** — keep the markup inline in
the page until a second page needs it.

## Storybook

`stories/components/` also holds stories for plain Antd primitives as this project styles them
(`Button`, `Card`, `Input`, `Segmented`, `Tabs`). Those have no counterpart under `ui/` — they
document the themed defaults from `app/theme.ts`. Do not "fix" the mismatch by creating `ui/`
wrappers for them; per the UI decision order, an Antd component with a `className` tweak is the
correct outcome, not a gap.

`stories/foundations/` (Colors, Spacing, Typography) and `stories/chrome/` (Header, Sidebar)
round out the set.
