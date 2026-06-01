import { AppLayout } from "../components/AppLayout";
import type { ReactNode } from "react";

export default function ShellLayout({ children }: { children: ReactNode }) {
  return <AppLayout>{children}</AppLayout>;
}
