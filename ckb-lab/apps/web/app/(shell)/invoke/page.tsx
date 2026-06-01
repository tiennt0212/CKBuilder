import { PageShell } from "../../components/PageShell";

export const metadata = { title: "Invoke Script — CKBuilder" };

export default function InvokeScriptPage() {
  return (
    <PageShell
      title="Invoke Script"
      description="Call an on-chain CKB script by providing its code hash, hash type, args, and witness data."
      status="designed"
    />
  );
}
