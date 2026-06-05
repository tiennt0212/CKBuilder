interface CellChipProps {
  capacity: string;
  lockLabel: string;
  address?: string;
  accent?: "primary" | "neutral";
}

export function CellChip({ capacity, lockLabel, address, accent }: CellChipProps) {
  const padClass = accent ? "pl-2.5" : "";
  return (
    <div className="rounded-[9px] border border-border-2 bg-panel-bg px-3 py-2.5 relative overflow-hidden">
      {accent && (
        <div
          className={`absolute left-0 top-0 bottom-0 w-[2.5px] ${accent === "primary" ? "bg-primary" : "bg-border-2"
            }`}
        />
      )}
      <div className={`text-body font-semibold text-text-1 tabular-nums ${padClass}`}>
        {capacity} <em className="not-italic text-2xs text-text-3 ml-0.5">CKB</em>
      </div>
      <div className={`text-hint text-text-2 ${padClass}`}>{lockLabel}</div>
      {address && (
        <div className={`font-mono text-[11px] text-text-3 mt-0.5 ${padClass}`}>
          {address}
        </div>
      )}
    </div>
  );
}
