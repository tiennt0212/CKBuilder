import { PageShell } from "../../components/PageShell";

export const metadata = { title: "Deploy Script — CKBuilder" };

export default function DeployScriptPage() {
  return (
    <PageShell
      title="Deploy Script"
      description="Upload a compiled Rust/C CKB script binary, configure its cell dep type, and deploy it to the network."
    />
  );
}
