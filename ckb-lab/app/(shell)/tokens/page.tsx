import { PageShell } from "../../components/PageShell";

export const metadata = { title: "Tokens — CKBuilder" };

export default function TokensPage() {
  return (
    <PageShell
      title="Tokens"
      description="Issue and transfer xUDT / sUDT fungible tokens. Your token ID is derived from your lock script hash."
      planned={{ milestone: "M1 · Bootcamp demo", issue: 47, designed: true }}
    />
  );
}
