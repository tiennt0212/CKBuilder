interface StateRow {
  label: string;
  value: string;
  isCurrent?: boolean;
}

interface StatePanelProps {
  title?: string;
  rows: StateRow[];
}

export function StatePanel({ title = "Contract state", rows }: StatePanelProps) {
  return (
    <div className="border border-app-border rounded-[11px] px-3.5 py-3 bg-panel-bg flex flex-col gap-2">
      <div className="text-2xs font-semibold uppercase tracking-[0.05em] text-text-3">
        {title}
      </div>
      {rows.map((row) => (
        <div key={row.label} className="flex justify-between items-center gap-2.5 text-hint">
          <span className="text-text-3">{row.label}</span>
          <span
            className={`font-mono text-[12px] ${
              row.isCurrent ? "text-primary font-semibold" : "text-text-2"
            }`}
          >
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
}
