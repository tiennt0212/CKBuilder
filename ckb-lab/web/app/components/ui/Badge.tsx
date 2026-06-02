type BadgeVariant = "joiid" | "rust" | "xudt" | "generic";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

export function Badge({ variant = "generic", children }: BadgeProps) {
  const classMap: Record<BadgeVariant, string> = {
    joiid: "text-primary bg-primary-tint",
    xudt: "text-primary bg-primary-tint",
    generic: "text-primary bg-primary-tint",
    rust: "text-rust bg-rust-tint",
  };
  return (
    <span
      className={`inline-flex items-center ${classMap[variant]} rounded-[5px] px-[6px] py-[2.5px] text-2xs font-bold leading-none`}
    >
      {children}
    </span>
  );
}
