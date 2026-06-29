import { CapacityInfoPanel } from "@/components/ui/CapacityInfoPanel";
import type { Meta, StoryObj } from "@storybook/react";

// 61 CKB overhead + ~50 KB binary ≈ 111 CKB → 111_00000000 shannons.
// Round numbers make it easy to eyeball the chip state in Storybook.
const REQUIRED = 11_100_000_000n; // 111 CKB
const BALANCE_HIGH = 50_000_000_000n; // 500 CKB (sufficient)
const BALANCE_LOW = 5_000_000_000n; // 50 CKB (insufficient)

function CapacityInfoPanelStory() {
  return (
    <div className="flex flex-col gap-6 max-w-[480px]">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-3 mb-3">
          Idle — no build yet
        </div>
        <CapacityInfoPanel required={null} balance={null} />
      </div>

      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-3 mb-3">
          Sufficient — balance ≥ required
        </div>
        <CapacityInfoPanel required={REQUIRED} balance={BALANCE_HIGH} />
      </div>

      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-3 mb-3">
          Insufficient — balance &lt; required
        </div>
        <CapacityInfoPanel required={REQUIRED} balance={BALANCE_LOW} />
      </div>
    </div>
  );
}

const meta: Meta = {
  title: "Components/CapacityInfoPanel",
  component: CapacityInfoPanelStory,
  parameters: { layout: "padded" },
};
export default meta;

type Story = StoryObj<typeof meta>;

export const Idle: Story = {
  render: () => <CapacityInfoPanel required={null} balance={null} />,
};

export const Sufficient: Story = {
  render: () => <CapacityInfoPanel required={REQUIRED} balance={BALANCE_HIGH} />,
};

export const Insufficient: Story = {
  render: () => <CapacityInfoPanel required={REQUIRED} balance={BALANCE_LOW} />,
};
