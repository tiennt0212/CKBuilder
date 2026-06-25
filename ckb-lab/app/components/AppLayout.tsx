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
    <Layout className="min-h-screen">
      <Sider width={248} className="h-screen sticky top-0 overflow-hidden">
        <Sidebar />
      </Sider>

      <Layout>
        <Header pathname={pathname} />
        <Content className="bg-bg-body px-6 py-[22px] min-h-[calc(100vh-var(--height-header))]">
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
