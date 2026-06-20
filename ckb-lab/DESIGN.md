# CKBuilder — Design System

A hi-fi design spec for **CKBuilder**, a CKB (Nervos) Bootcamp console: a fullstack
Next.js app (monorepo with Rust smart contracts) that bundles wallet operations and
on-chain script interactions. Frontend stack: **Next.js + Ant Design (v5) + Tailwind CSS**.

This document is the single source of truth for the visual system. Two themes only:
**Light** and **Dark** (no hybrid sidebar). Feed this file to your code agent before
generating components.

---

## 1. Design principles

- **Clean enterprise, developer-facing.** Ant Design defaults, restrained, lots of breathing room.
- **The Cell model is a feature, not a leak.** Every action that builds a transaction shows a
  human summary *and* a "Raw" inspector (inputs/outputs/cell_deps/witnesses). Balance both —
  summary first, raw on demand.
- **One layout rhythm:** the primary working surface is a **2-column** split —
  *form on the left, live preview on the right*.
- **Numbers are tabular.** Use `font-variant-numeric: tabular-nums` for all capacities, balances, fees.
- **No gradients, no emoji, no decorative illustration.** Accent color is used sparingly for primary
  actions, active state, and positive/output emphasis only.
- **Accent = CKB green.** It is the only chromatic color in the UI.

---

## 2. Color tokens

Defined as CSS custom properties, scoped by a theme class (`.theme-light` / `.theme-dark`)
on the app root. Map these to Ant Design `ConfigProvider` theme tokens and Tailwind theme vars.

### 2.1 Light (`.theme-light`)

| Token | Value | Use |
|---|---|---|
| `--bg-body` | `#f4f5f6` | App background (content area) |
| `--bg-elev` | `#ffffff` | Cards, header, sidebar, raised surfaces |
| `--border` | `#eef0f2` | Hairline dividers, card borders |
| `--border-2` | `#e3e6e9` | Stronger borders (cell chips, vertical rules) |
| `--input-border` | `#d6dadf` | Input / control outline |
| `--input-bg` | `#ffffff` | Input fill |
| `--text-1` | `rgba(17,24,28,0.92)` | Primary text |
| `--text-2` | `rgba(17,24,28,0.60)` | Secondary / labels |
| `--text-3` | `rgba(17,24,28,0.40)` | Tertiary / hints / mono addresses |
| `--primary` | `#0a9d6c` | Buttons, active, links, accent |
| `--primary-press` | `#08855b` | Primary hover/pressed |
| `--primary-tint` | `rgba(10,157,108,0.10)` | Active-item bg, badges, MAX chip |
| `--dot` | `#13c08a` | Online/status dot |
| `--seg-bg` | `#f1f3f4` | Segmented control / tab track |
| `--panel-bg` | `#f8f9fa` | Inset panels (summary, cells, state) |
| `--code-bg` | `#fbfcfc` | Raw/code block bg |
| `--code-text` | `rgba(17,24,28,0.72)` | Code text |
| `--shadow` | `0 1px 2px rgba(16,24,40,.04), 0 1px 3px rgba(16,24,40,.05)` | Card/elevation |

Sidebar (light): bg `--bg-elev`, border `--border`, item text `rgba(17,24,28,0.66)`,
group label `rgba(17,24,28,0.36)`, hover `rgba(17,24,28,0.04)`, active bg `--primary-tint`,
active text `--primary`.

### 2.2 Dark (`.theme-dark`)

| Token | Value | Use |
|---|---|---|
| `--bg-body` | `#121315` | App background |
| `--bg-elev` | `#1c1d1f` | Cards, header, sidebar |
| `--border` | `#2a2c2f` | Hairline dividers |
| `--border-2` | `#34373b` | Stronger borders |
| `--input-border` | `#3a3d41` | Input outline |
| `--input-bg` | `#202123` | Input fill |
| `--text-1` | `rgba(255,255,255,0.90)` | Primary text |
| `--text-2` | `rgba(255,255,255,0.56)` | Secondary / labels |
| `--text-3` | `rgba(255,255,255,0.40)` | Tertiary / hints |
| `--primary` | `#2bd396` | Accent (brighter for dark) |
| `--primary-press` | `#22bd85` | Primary hover/pressed |
| `--primary-tint` | `rgba(43,211,150,0.14)` | Active bg, badges |
| `--dot` | `#2bd396` | Status dot |
| `--seg-bg` | `#26282b` | Segmented / tab track |
| `--panel-bg` | `#202123` | Inset panels |
| `--code-bg` | `#18191b` | Code block bg |
| `--code-text` | `rgba(255,255,255,0.70)` | Code text |
| `--shadow` | `0 1px 2px rgba(0,0,0,0.30)` | Elevation |

Sidebar (dark): bg `#161719`, border `#2a2c2f`, item text `rgba(255,255,255,0.56)`,
group label `rgba(255,255,255,0.34)`, hover `rgba(255,255,255,0.05)`, active bg `rgba(43,211,150,0.14)`,
active text `#3fd49b`.

### 2.3 Special-purpose color

- **Rust badge** (Deploy/Invoke): light `#c0683a` on `rgba(192,104,58,.12)`; dark `#e3925f` on `rgba(227,146,95,.15)`.
- **Brand mark** (cube): front `--primary`, top `#27c08a`/`#54e0b0`, side `#077a55`/`#1aa874`.

### 2.4 Ant Design ConfigProvider mapping

```ts
// theme.ts
export const ckbTheme = (mode: 'light' | 'dark') => ({
  algorithm: mode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
  token: {
    colorPrimary: mode === 'dark' ? '#2bd396' : '#0a9d6c',
    colorInfo:    mode === 'dark' ? '#2bd396' : '#0a9d6c',
    borderRadius: 9,
    fontFamily: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`,
    colorBgLayout:    mode === 'dark' ? '#121315' : '#f4f5f6',
    colorBgContainer: mode === 'dark' ? '#1c1d1f' : '#ffffff',
    colorBorderSecondary: mode === 'dark' ? '#2a2c2f' : '#eef0f2',
  },
});
```

---

## 3. Typography

- **Font family:** system stack — `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Helvetica, Arial, sans-serif`. (Ant Design default — do not swap in Inter/Roboto Google fonts.)
- **Mono:** `ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace` — for all addresses, hashes, hex, code.
- Antialiased; base size 14px / line-height 1.45.

| Role | Size | Weight | Notes |
|---|---|---|---|
| Page title (header) | 17px | 600 | letter-spacing -0.01em |
| Crumb (above title) | 11.5px | 400 | `--text-3` |
| Card title | 15px | 600 | |
| Card subtitle | 12px | 400 | `--text-3` |
| Field label | 12.5px | 550 | `--text-2` |
| Field hint | 11.5px | 400 | `--text-3`, tabular |
| Body / input | 13.5px | 400–500 | |
| Big amount input | 20px | 600 | tabular |
| Summary value (hero) | 18px | 600 | `--primary` |
| Group label (sidebar) | 10.5px | 600 | uppercase, letter-spacing .07em |
| Mono / hash | 11–12.5px | 400 | mono stack |
| Code block | 11.5px | 400 | line-height 1.65 |

---

## 4. Spacing, radius, elevation

- **Radius:** controls/inputs `9px`; buttons `10px`; cards `12px`; panels `10–11px`; chips/badges `5–7px`.
- **Card:** `1px` border `--border`, `--shadow`, header padding `16px 18px` with bottom border, body padding `16px 18px`, body gap `14px`.
- **Content area padding:** `22px 24px`.
- **Header height:** `64px`. **Sidebar width:** `248px`.
- **Control height:** inputs `42px`; header pills/icon buttons `34px`; wallet button `38px`; primary button `44px`; menu item `37px`.
- **Gaps:** form fields `14px`; field label↔control `7px`; header right cluster `10px`.

---

## 5. App shell

### 5.1 Layout
```
┌────────────┬─────────────────────────────────────────────┐
│  Sidebar   │  Header (64px)                               │
│  (248px)   ├─────────────────────────────────────────────┤
│            │  Content (padding 22/24)                     │
│  brand     │  ┌─────────────┐ ┌─────────────────────────┐ │
│  menu      │  │ Form card   │ │ Preview card            │ │
│  groups    │  │ (1fr)       │ │ (1.07fr)                │ │
│            │  └─────────────┘ └─────────────────────────┘ │
│  foot/node │                                              │
└────────────┴─────────────────────────────────────────────┘
```
Design frame reference size: **1440 × 920**. Real app is fluid; keep the 2-col grid
`grid-template-columns: 1fr 1.07fr; gap: 20px; align-items: start`.

### 5.2 Sidebar
- **Brand:** cube mark (24–26px) + `CKBuilder` (15px/650) over `Bootcamp Console` (11px, group-label color).
- **Menu** grouped with uppercase group labels. Items: 18px icon + label, optional right tag chip
  (`xUDT`, `Rust`). Active item = `--primary-tint` bg + `--primary` text + weight 550.
- **Foot:** Settings item + a node-status row (green dot + `RPC · testnet.ckb.dev` + latency in `--primary`).

**Menu structure (8 items, 4 groups):**
| Group | Items |
|---|---|
| Wallet | Transfer CKB · Cell Explorer · Tokens `xUDT` |
| Smart Contracts | Invoke Script · Deploy Script `Rust` |
| Advanced | Nervos DAO · Time Lock · Multisig |
| Activity | Transaction History |

### 5.3 Header
- Left: crumb (group name) above page title.
- Right cluster (gap 10px): **Network selector** pill (green dot + `Testnet` + chevron) →
  **theme toggle** icon button (moon in light / sun in dark) → vertical divider →
  **Wallet button** (`JoyID` badge + mono short address + balance + chevron).
- Supported wallets: **JoyID** and **MetaMask** (via CKB `ccc` connector). Connected state shows the wallet badge.

> Detailed Header states and dropdown specs: see [docs/design/header.md](docs/design/header.md)

---

## 6. Components

All components are Ant Design primitives restyled with the tokens above. Class names below are the
reference design's; in code use AntD components + Tailwind utilities mapped to the same values.

- **Card** — title + optional subtitle + optional right slot (Tabs). AntD `Card` with custom head.
- **Field** — label row (label left, hint right) + control + optional error. AntD `Form.Item`.
- **Input** — 42px, `--input-border`, radius 9, focus/hover border `--primary`. Variants:
  - *Select-style*: content + chevron, whole row clickable.
  - *Amount*: large 20px number + `CKB` suffix + `MAX` chip (primary-tint).
  - *Address*: mono, truncated, trailing copy button.
  - *KV*: 2-col grid (key pill on `--panel-bg` + value input).
- **Segmented** — equal-width track on `--seg-bg`, active segment lifts to `--bg-elev` + shadow + `--primary` text. Used for fee rate (Slow/Standard/Fast with shannon sublabels) and `hash_type` (type/data1/data2).
- **Button** — primary = `--primary` fill, white text, hover `--primary-press`, height 44, often full-width with a trailing icon (arrow / bolt).
- **Tabs** (preview header) — `Summary` / `Raw`, pill style on `--seg-bg`.
- **Summary rows** — inset panel `--panel-bg`; key (`--text-2`) ↔ value (tabular). A `.is-strong` row renders value at 18px in `--primary`. Hairline divider before the final "balance after" row.
- **Cell chip** — capacity (14px) + lock label + mono out-point/address. Output cells get a 2.5px left accent in `--primary`; change/self cells a neutral left accent.
- **Cell flow** — 3-col grid: Inputs column → arrow → Outputs column, each headed `INPUTS · N CELLS` / `OUTPUTS · N CELLS`.
- **Raw block** — `<details>` (default open) titled with byte count; mono `<pre>` of the JSON transaction (`version`, `cell_deps`, `inputs`, `outputs`, `outputs_data`, `witnesses`).
- **State panel** (script results) — before/after data rows; the `after` row in `--primary`.
- **Badges** — account/wallet `JoyID` (primary-tint); `Rust` (orange special-purpose).

---

## 7. CKB domain conventions

Encode these so generated screens stay technically honest:

- **Addresses:** bech32m, `ckt1…` (testnet) / `ckb1…` (mainnet). Always render mono; truncate middle
  (`ckt1qy…m3f9a`). Provide copy affordance.
- **Capacity = bytes.** Native unit **CKB**; 1 CKB = 10⁸ **shannons**. Standard cell minimum **61 CKB**.
  Show amounts with up to 8 decimals, tabular, thousands-separated.
- **Fee rate** in **shannons/KB** (Slow 1000 / Standard 2000 / Fast 5000 presets).
- **Cell model:** a tx has `cell_deps`, `inputs` (consumed live cells), `outputs` (new cells, each with
  `capacity` + `lock` + optional `type` + `data`), `outputs_data`, `witnesses`. Capacities shown as hex
  in raw, decimal CKB in summary.
- **Scripts:** identified by `code_hash` + `hash_type` (`type` / `data1` / `data2`) + `args`; deployed as
  cells referenced via `out_point` + `dep_type` (`code` / `dep_group`). Default lock = `secp256k1_blake160`;
  JoyID lock for JoyID accounts.
- **Tokens:** xUDT / sUDT live in a cell's `type` script; balance = sum of matching cells' data.
- **Nervos DAO:** deposit/withdraw cells with the DAO type script; show compensation/epoch context.

---

## 8. Screens (status)

| Screen | Menu | Layout | Status |
|---|---|---|---|
| **Transfer CKB** | Wallet | form + cell-flow + raw preview | ✅ designed |
| **Invoke Script** | Smart Contracts | form + state + type_script/cell_deps preview | ✅ designed |
| **Assets** | Wallet | hero strip (total CKB + breakdown chips) + FT holdings list + NFT grid (3-col) | ✅ designed |
| Cell Explorer | Wallet | table/grid of live cells + detail panel | ⏳ to build |
| Tokens (xUDT/sUDT) | Wallet | holdings list + issue/transfer form + preview | ⏳ to build |
| Deploy Script | Smart Contracts | upload binary + config form + deployment preview | ⏳ to build |
| Nervos DAO | Advanced | deposit/withdraw form + positions + yield | ⏳ to build |
| Time Lock · Multisig | Advanced | participants/threshold form + lock preview | ⏳ to build |
| Transaction History | Activity | filterable tx table + expandable detail | ⏳ to build |

Every "build a transaction" screen reuses the **left form / right preview** pattern with the
**Summary + Raw** toggle. List-style screens (Cell Explorer, History) use a table + side detail panel
but keep the same card, type, and color system.

---

## 9. Do / Don't

- ✅ Use `--primary` only for actions, active state, and positive/output emphasis.
- ✅ Keep one accent (green); everything else neutral.
- ✅ Tabular numerals for every on-chain figure; mono for every hash/address.
- ✅ Show a Raw inspector wherever you build a transaction.
- ❌ No gradients, emoji, drop shadows beyond `--shadow`, or hand-drawn illustration.
- ❌ Don't introduce a second brand color or swap the font family.
- ❌ Don't hide the technical detail entirely — this is a learning console.
