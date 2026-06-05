"use client";

import { useState } from "react";

interface RawBlockProps {
  data: object;
  byteCount?: number;
  defaultOpen?: boolean;
  label?: string;
}

export function RawBlock({ data, byteCount, defaultOpen = true, label }: RawBlockProps) {
  const [open, setOpen] = useState(defaultOpen);
  const resolvedLabel = byteCount
    ? `${label ?? "Raw Transaction"} · ~${byteCount} bytes`
    : (label ?? "Raw Transaction");

  return (
    <details open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary
        className="cursor-pointer select-none pb-3 list-none flex items-center gap-1.5"
        style={{ fontSize: 12.5, fontWeight: 550, color: "var(--text-2)" }}
      >
        <span
          className="inline-block transition-transform"
          style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", fontSize: 10 }}
        >
          ▶
        </span>
        {resolvedLabel}
      </summary>
      <div className="rounded-[10px] bg-code-bg border border-app-border p-4">
        <pre className="text-hint text-code-text font-mono leading-[1.65] m-0 overflow-x-auto whitespace-pre-wrap break-all">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </details>
  );
}
