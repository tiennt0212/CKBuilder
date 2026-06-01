"use client";

import { Alert, Divider, Typography } from "antd";
import type { ReactNode } from "react";

const { Title, Text } = Typography;

interface PageShellProps {
  title: string;
  description: string;
  status?: "designed" | "todo";
  children?: ReactNode;
}

export function PageShell({
  title,
  description,
  status = "todo",
  children,
}: PageShellProps) {
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Title
          level={4}
          style={{
            margin: 0,
            fontSize: 17,
            fontWeight: 600,
            color: "var(--text-1)",
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </Title>
        <Text style={{ color: "var(--text-2)", fontSize: 13.5 }}>
          {description}
        </Text>
      </div>

      {children ? (
        children
      ) : (
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
