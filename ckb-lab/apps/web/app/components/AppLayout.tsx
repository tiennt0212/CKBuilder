"use client";

import { Layout } from "antd";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import type { ReactNode } from "react";

const { Sider, Content } = Layout;

export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        width={248}
        style={{
          height: "100vh",
          position: "sticky",
          top: 0,
          overflow: "hidden",
        }}
      >
        <Sidebar />
      </Sider>

      <Layout>
        <Header pathname={pathname} />
        <Content
          style={{
            padding: "22px 24px",
            background: "var(--bg-body)",
            minHeight: "calc(100vh - 64px)",
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
