import { Switch } from "antd";

interface SwitchRowProps {
  title: string;
  subtitle?: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
}

export function SwitchRow({ title, subtitle, checked, onChange }: SwitchRowProps) {
  return (
    <div className="flex items-center justify-between gap-3.5 px-3.5 py-3 border border-app-border rounded-[11px] bg-panel-bg">
      <div>
        <div className="text-body font-semibold text-text-1">{title}</div>
        {subtitle && <div className="text-hint text-text-3 mt-0.5">{subtitle}</div>}
      </div>
      <Switch checked={checked} onChange={onChange} />
    </div>
  );
}
