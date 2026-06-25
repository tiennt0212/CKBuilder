interface SummaryRowProps {
  label: string;
  value: string;
  unit?: string;
  strong?: boolean;
  divider?: boolean;
}

export function SummaryRow({ label, value, unit, strong, divider }: SummaryRowProps) {
  return (
    <>
      {divider && <div className="h-px bg-app-border my-[5px]" />}
      <div className="flex items-baseline justify-between py-[6px]">
        <span className="text-body text-text-2">{label}</span>
        <span
          className={`tabular-nums ${
            strong
              ? "text-figure font-semibold text-primary"
              : "text-numeral font-semibold text-text-1"
          }`}
        >
          {value}
          {unit && (
            <em
              className={`not-italic ml-1 ${
                strong ? "text-hint opacity-70" : "text-2xs text-text-3 font-medium"
              }`}
            >
              {unit}
            </em>
          )}
        </span>
      </div>
    </>
  );
}

interface SummaryPanelProps {
  children: React.ReactNode;
  className?: string;
}

export function SummaryPanel({ children, className = "" }: SummaryPanelProps) {
  return (
    <div className={`rounded-[11px] border border-app-border bg-panel-bg px-4 py-1 ${className}`}>
      {children}
    </div>
  );
}
