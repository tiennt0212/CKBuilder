import { PageShell } from "../../components/PageShell";

export const metadata = { title: "Transfer CKB — CKBuilder" };

export default function TransferPage() {
  return (
    <PageShell
      title="Transfer CKB"
      description="Send CKB capacity to another address. Builds a SECP256k1 transaction with change output."
      status="designed"
    />
  );
}
