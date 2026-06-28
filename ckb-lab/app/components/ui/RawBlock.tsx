"use client";

import { Collapse } from "antd";

export interface RawBlockItem {
  key: string;
  label: string;
  data: object;
  defaultOpen?: boolean;
}

interface RawBlockProps {
  items: RawBlockItem[];
}

export function RawBlock({ items }: RawBlockProps) {
  const defaultActiveKey = items
    .filter((item) => item.defaultOpen !== false)
    .map((item) => item.key);

  return (
    <Collapse
      ghost
      defaultActiveKey={defaultActiveKey}
      items={items.map(({ key, label, data }) => ({
        key,
        label: (
          <span style={{ fontSize: 12.5, fontWeight: 550, color: "var(--text-2)" }}>{label}</span>
        ),
        children: (
          <div className="rounded-[10px] bg-code-bg border border-app-border p-4">
            <pre className="text-hint text-code-text font-mono leading-[1.65] m-0 overflow-x-auto whitespace-pre-wrap break-all">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        ),
        styles: { header: { padding: "0 0 12px 0" }, body: { padding: 0 } },
      }))}
    />
  );
}
