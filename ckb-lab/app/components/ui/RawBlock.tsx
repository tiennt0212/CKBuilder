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
  /** Cap on each code box. Any CSS length. */
  maxHeight?: number | string;
}

/**
 * A raw transaction runs to hundreds of lines, which stretches the preview card far past the
 * viewport and forces the whole page to scroll. Subtracting the chrome above a preview card
 * (header, page title, card header + tabs, padding) keeps the box inside the current screen and
 * moves the scrolling into the box itself.
 */
const DEFAULT_MAX_HEIGHT = "max(220px, calc(100vh - var(--height-header) - 16rem))";

export function RawBlock({ items, maxHeight = DEFAULT_MAX_HEIGHT }: RawBlockProps) {
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
          <div
            className="rounded-[10px] bg-code-bg border border-app-border p-4 overflow-auto"
            style={{ maxHeight }}
          >
            <pre className="text-hint text-code-text font-mono leading-[1.65] m-0 whitespace-pre-wrap break-all">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        ),
        styles: { header: { padding: "0 0 12px 0" }, body: { padding: 0 } },
      }))}
    />
  );
}
