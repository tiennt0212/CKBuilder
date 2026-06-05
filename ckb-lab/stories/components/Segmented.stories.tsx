import type { Meta, StoryObj } from "@storybook/react";
import { Segmented } from "antd";
import { useState } from "react";

const FEE_RATES = [
  { value: 1000, name: "Slow", sub: "1,000 sh/KB" },
  { value: 2000, name: "Standard", sub: "2,000 sh/KB" },
  { value: 5000, name: "Fast", sub: "5,000 sh/KB" },
];

const HASH_TYPES = [
  { value: "type", label: "type" },
  { value: "data1", label: "data1" },
  { value: "data2", label: "data2" },
];

function SegmentedStory() {
  const [feeRate, setFeeRate] = useState(2000);
  const [hashType, setHashType] = useState("type");

  return (
    <div className="flex flex-col gap-8 max-w-[480px]">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-3 mb-3">
          Fee rate
        </div>
        <Segmented
          block
          value={feeRate}
          onChange={(v) => setFeeRate(v as number)}
          options={FEE_RATES.map((r) => ({
            value: r.value,
            label: (
              <div className="py-1.5">
                <div className="text-body font-medium">{r.name}</div>
                <div className="text-2xs text-text-3 tabular-nums">{r.sub}</div>
              </div>
            ),
          }))}
          style={{ background: "var(--seg-bg)" }}
        />
      </div>

      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-3 mb-3">
          Hash type
        </div>
        <Segmented
          block
          value={hashType}
          onChange={(v) => setHashType(v as string)}
          options={HASH_TYPES}
          style={{ background: "var(--seg-bg)" }}
        />
      </div>
    </div>
  );
}

const meta: Meta = {
  title: "Components/Segmented",
  component: SegmentedStory,
  parameters: { layout: "padded" },
};
export default meta;

type Story = StoryObj<typeof meta>;
export const AllVariants: Story = {};
