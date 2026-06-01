import { PageShell } from "../../components/PageShell";

export const metadata = { title: "Multisig — CKBuilder" };

export default function MultisigPage() {
  return (
    <PageShell
      title="Multisig"
      description="Create M-of-N multisig addresses using secp256k1-blake160-multisig. Collect and combine signatures from multiple participants."
    />
  );
}
