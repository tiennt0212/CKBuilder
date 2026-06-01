import { PageShell } from "../../components/PageShell";

export const metadata = { title: "Time Lock — CKBuilder" };

export default function TimeLockPage() {
  return (
    <PageShell
      title="Time Lock"
      description="Lock CKB until a specific block number or timestamp using the since field in CKB transaction inputs."
    />
  );
}
