import { Form } from "antd";
import type { FormItemProps } from "antd";

interface CkbFormItemProps extends FormItemProps {
  hint?: string;
}

export function FormItem({ label, hint, className, ...rest }: CkbFormItemProps) {
  const resolvedLabel = hint ? (
    <span className="flex items-center justify-between gap-3 w-full">
      <span>{label}</span>
      <span className="text-hint text-text-3 font-normal tabular-nums whitespace-nowrap">
        {hint}
      </span>
    </span>
  ) : (
    label
  );

  // Antd renders the label element as `inline-flex`, so it shrinks to the label text and
  // `justify-between` has no room to push the hint anywhere. `ckb-label-row` (globals.css)
  // stretches that element across the field so the hint lands at its right edge, per
  // DESIGN.md § Field ("label left, hint right").
  const resolvedClassName = hint ? `ckb-label-row${className ? ` ${className}` : ""}` : className;

  return <Form.Item label={resolvedLabel} className={resolvedClassName} {...rest} />;
}
