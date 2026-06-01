import { PageShell } from "../../components/PageShell";

export const metadata = { title: "Nervos DAO — CKBuilder" };

export default function NervosDaoPage() {
  return (
    <PageShell
      title="Nervos DAO"
      description="Deposit CKB into the Nervos DAO to earn compensation. Withdraw after the lock period and claim issuance rewards."
    />
  );
}
