interface DaoPositionProps {
  capacity: string;
  depositEpoch: string;
  compensation: string;
  apc: string;
  progress: number;
}

export function DaoPosition({
  capacity,
  depositEpoch,
  compensation,
  apc,
  progress,
}: DaoPositionProps) {
  return (
    <div className="py-[13px] border-b border-app-border last:border-b-0 flex flex-col gap-2.5">
      <div className="flex justify-between items-center">
        <span className="text-[14px] font-semibold text-text-1 tabular-nums">
          {capacity} <em className="not-italic text-2xs text-text-3 ml-0.5">CKB</em>
        </span>
        <span className="text-[12px] font-semibold text-primary bg-primary-tint px-2.5 py-1 rounded-[7px]">
          {apc} APC
        </span>
      </div>
      <div className="flex justify-between text-hint text-text-3">
        <span>Since epoch {depositEpoch}</span>
        <span className="text-primary font-semibold">+{compensation} CKB</span>
      </div>
      <div className="h-[7px] rounded-[6px] bg-seg-bg overflow-hidden">
        <div
          className="h-full bg-primary rounded-[6px]"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  );
}
