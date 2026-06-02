import { InfoCircleOutlined } from "@ant-design/icons";

interface NoteBoxProps {
  children: React.ReactNode;
}

export function NoteBox({ children }: NoteBoxProps) {
  return (
    <div className="flex gap-2.5 items-start px-3.5 py-3 bg-primary-tint rounded-[10px] text-hint leading-[1.5] text-text-2">
      <InfoCircleOutlined
        className="text-primary flex-shrink-0"
        style={{ marginTop: 1, fontSize: 14 }}
      />
      <div>{children}</div>
    </div>
  );
}
