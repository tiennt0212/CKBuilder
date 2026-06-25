"use client";

import { Alert } from "antd";
import type { ReactNode } from "react";

interface PageShellProps {
  title: string;
  description: string;
  status?: "designed" | "todo";
  children?: ReactNode;
}

export function PageShell({ title, description, status = "todo", children }: PageShellProps) {
  return (
    <div>
      <div className="mb-5">
        <h2 className="m-0 text-title font-semibold text-text-1 tracking-tightest">{title}</h2>
        <p className="m-0 text-body text-text-2">{description}</p>
      </div>

      {children ?? (
        <Alert
          message={
            status === "designed"
              ? "Screen designed — implementation coming soon."
              : "Connect your wallet to get started."
          }
          description={
            status === "designed"
              ? "This screen has a completed design spec. You can implement it following DESIGN.md."
              : "This feature page is a placeholder. Implement the CKB logic to activate it."
          }
          type={status === "designed" ? "info" : "warning"}
          showIcon
        />
      )}
    </div>
  );
}
