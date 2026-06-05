import { CloseOutlined } from "@ant-design/icons";
import { Input } from "antd";

interface MultisigParticipantProps {
  index: number;
  address?: string;
  onRemove?: () => void;
  onChange?: (value: string) => void;
}

export function MultisigParticipant({
  index,
  address,
  onRemove,
  onChange,
}: MultisigParticipantProps) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="w-5 h-5 rounded-[6px] bg-seg-bg text-text-2 text-[11px] font-semibold grid place-items-center flex-shrink-0"
      >
        {index}
      </div>
      <Input
        value={address}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder="ckt1qy…"
        className="font-mono flex-1"
        style={{ height: 38 }}
      />
      <button
        onClick={onRemove}
        className="text-text-3 hover:text-text-1 transition-colors flex-shrink-0 p-1"
        style={{ background: "none", border: "none", cursor: "pointer" }}
      >
        <CloseOutlined style={{ fontSize: 13 }} />
      </button>
    </div>
  );
}
