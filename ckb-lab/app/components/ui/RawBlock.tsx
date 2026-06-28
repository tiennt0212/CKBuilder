"use client";

import { Collapse } from "antd";

interface RawBlockProps {
  data: object;
  byteCount?: number;
  defaultOpen?: boolean;
  label?: string;
}

export function RawBlock({ data, byteCount, defaultOpen = true, label }: RawBlockProps) {
  const resolvedLabel = byteCount
    ? `${label ?? "Raw Transaction"} · ~${byteCount || 0} bytes`
    : (label ?? "Raw Transaction");

  return (
    <Collapse
      ghost
      defaultActiveKey={defaultOpen ? ["content"] : []}
      items={[
        {
          key: "content",
          label: (
            <span style={{ fontSize: 12.5, fontWeight: 550, color: "var(--text-2)" }}>
              {resolvedLabel}
            </span>
          ),
          children: (
            <div className="rounded-[10px] bg-code-bg border border-app-border p-4">
              <pre className="text-hint text-code-text font-mono leading-[1.65] m-0 overflow-x-auto whitespace-pre-wrap break-all">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          ),
          styles: {
            header: { padding: "0 0 12px 0" },
            body: { padding: 0 },
          },
        },
      ]}
    />
  );
}
