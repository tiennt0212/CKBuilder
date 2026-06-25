import { Form } from "antd";
import type { FormItemProps } from "antd";

interface CkbFormItemProps extends FormItemProps {
  hint?: string;
}

export function FormItem({ label, hint, ...rest }: CkbFormItemProps) {
  const resolvedLabel = hint ? (
    <span className="flex items-center justify-between w-full">
      <span>{label}</span>
      <span className="text-hint text-text-3 font-normal tabular-nums">{hint}</span>
    </span>
  ) : (
    label
  );

  return <Form.Item label={resolvedLabel} {...rest} />;
}
