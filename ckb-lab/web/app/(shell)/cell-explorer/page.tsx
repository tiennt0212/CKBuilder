import { PageShell } from "../../components/PageShell";

export const metadata = { title: "Cell Explorer — CKBuilder" };

export default function CellExplorerPage() {
  return (
    <PageShell
      title="Cell Explorer"
      description="Browse your live cells (unspent outputs). Inspect capacity, lock script, type script, and cell data."
    />
  );
}
