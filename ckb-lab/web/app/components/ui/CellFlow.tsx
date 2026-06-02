import { ArrowRightOutlined } from "@ant-design/icons";
import { CellChip } from "./CellChip";

export interface CellData {
  capacity: string;
  lockLabel: string;
  address?: string;
  accent?: "primary" | "neutral";
}

interface CellFlowProps {
  inputs: CellData[];
  outputs: CellData[];
}

export function CellFlow({ inputs, outputs }: CellFlowProps) {
  return (
    <div className="grid grid-cols-[1fr_20px_1fr] gap-3 items-start">
      <div>
        <div className="text-2xs font-semibold text-text-3 uppercase tracking-widest2 mb-2">
          INPUTS · {inputs.length} {inputs.length === 1 ? "CELL" : "CELLS"}
        </div>
        <div className="flex flex-col gap-2">
          {inputs.map((cell, i) => (
            <CellChip key={i} {...cell} />
          ))}
        </div>
      </div>
      <div className="flex items-center justify-center" style={{ paddingTop: 34 }}>
        <ArrowRightOutlined style={{ color: "var(--text-3)", fontSize: 13 }} />
      </div>
      <div>
        <div className="text-2xs font-semibold text-text-3 uppercase tracking-widest2 mb-2">
          OUTPUTS · {outputs.length} {outputs.length === 1 ? "CELL" : "CELLS"}
        </div>
        <div className="flex flex-col gap-2">
          {outputs.map((cell, i) => (
            <CellChip key={i} {...cell} />
          ))}
        </div>
      </div>
    </div>
  );
}
