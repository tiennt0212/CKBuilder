# Header — Detailed Design Spec

Detailed states and dropdown specs for the Header component. See DESIGN.md §5.3 for the high-level overview.

---

## Wallet connection states

| # | State | Right-cluster content |
|---|---|---|
| 1 | **Not connected** | Network pill + theme toggle + divider + `Connect wallet` primary button (44px height) |
| 2 | **Connecting** | Network pill + theme toggle + divider + spinner + `"Connecting to JoyID… / Approve in your wallet"` text, button disabled |
| 3 | **Fetching balance** | Network pill + theme toggle + divider + wallet button with address visible but balance as skeleton pulse |
| 4 | **Connected · JoyID** | Network pill + theme toggle + divider + full wallet button (`JoyID` primary-tint badge + mono address + CKB balance + chevron) |
| 5 | **Connected · MetaMask** | Same as JoyID but badge color `#e2761b` (MetaMask orange), address is `0x…` Ethereum format, network dot amber (Mainnet) |

---

## Network dropdown open state

Pill in open/active state: border turns `--primary`, chevron rotates 180°.

Floating panel (`.ckb-net-panel`): `bg-bg-elev`, `border-border-2`, `border-radius: 12px`, `shadow-app` elevation.

### CSS class reference

| Class | Element |
|---|---|
| `.ckb-net-dd` | The pill trigger button (closed state) |
| `.ckb-net-panel` | Floating dropdown panel container |
| `.ckb-net-opt` | Individual network option row |
| `.ckb-net-sep` | Separator before custom RPC row |
| `.ckb-net-custom` | "Custom RPC…" row (UI only, no-op) |

### Network rows

| Row | Dot color | Content |
|---|---|---|
| Mainnet | `--text-3` (muted) | `Mainnet` + RPC URL in mono (`https://mainnet.ckb.dev/rpc`) |
| Testnet | `--dot` (accent green) | `Testnet` + RPC URL in mono (`https://testnet.ckb.dev/rpc`) — active row: `--primary-tint` bg + checkmark |
| Local Devnet | `#bd8a3a` (amber) | `Local Devnet` + RPC URL in mono (`http://localhost:28114`) |
| — | — | Dashed `Custom RPC…` separator row (`.ckb-net-custom`), UI only, no-op |

### Pill closed-state styling

- Border: `--input-border`
- Hover: border `--primary` + text `--primary`
- Active/open: border `--primary`, chevron rotated 180°

---

## Wallet dropdown open state

Wallet button in open state: border turns `--primary`, chevron rotates 180°.

Floating panel anchored right. Sections:

### Panel header
- Wallet badge (e.g. `JoyID` on `--primary-tint` background)
- Full address — truncatable with a copy button
- Large CKB balance display

### Panel actions
- **Switch wallet** — neutral action, shown with a swap/key icon
- **Disconnect** — danger color (`#c0683a` light / `#e3925f` dark), visually distinct from Switch
