import { CellExplorerForm } from "./CellExplorerForm";

export const metadata = { title: "Cell Explorer — CKBuilder" };

export default function CellExplorerPage() {
  return (
    // WHY: Content uses min-h (not h), so percentage heights inside don't resolve.
    // Explicit calc gives the form a real height without touching AppLayout.
    <div style={{ height: "calc(100vh - var(--height-header) - 44px)" }}>
      <CellExplorerForm />
    </div>
  );
}
