type StatusVariant = "ok" | "pending";

interface StatusChipProps {
  variant: StatusVariant;
  label?: string;
}

export function StatusChip({ variant, label }: StatusChipProps) {
  const isOk = variant === "ok";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-hint font-semibold ${
        isOk ? "text-primary bg-primary-tint" : "text-status-pend bg-status-pend-bg"
      }`}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: "currentColor" }} />
      {label ?? (isOk ? "Confirmed" : "Pending")}
    </span>
  );
}
