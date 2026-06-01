import { PageShell } from "../../components/PageShell";

export const metadata = { title: "Transaction History — CKBuilder" };

export default function HistoryPage() {
  return (
    <PageShell
      title="Transaction History"
      description="Browse all transactions associated with your connected wallet address. Expand any transaction to inspect inputs, outputs, and witnesses."
    />
  );
}
