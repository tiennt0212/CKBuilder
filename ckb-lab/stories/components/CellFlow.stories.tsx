import type { Meta, StoryObj } from "@storybook/react";
import { CellFlow } from "@/components/ui/CellFlow";

function CellFlowStory() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-3 mb-3">
          Transfer: 1 input → 2 outputs
        </div>
        <div className="rounded-[10px] bg-panel-bg p-4" style={{ maxWidth: 620 }}>
          <CellFlow
            inputs={[
              { capacity: "990.001", lockLabel: "secp256k1_blake160", address: "ckt1qy…feed1a" },
            ]}
            outputs={[
              {
                capacity: "100",
                lockLabel: "secp256k1_blake160",
                address: "ckt1qy…m3f9a",
                accent: "primary",
              },
              {
                capacity: "889.999",
                lockLabel: "secp256k1_blake160 (change)",
                address: "ckt1qy…feed1a",
                accent: "neutral",
              },
            ]}
          />
        </div>
      </div>

      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-3 mb-3">
          DAO deposit: 1 input → 2 outputs
        </div>
        <div className="rounded-[10px] bg-panel-bg p-4" style={{ maxWidth: 620 }}>
          <CellFlow
            inputs={[
              { capacity: "1,000", lockLabel: "secp256k1_blake160", address: "ckt1qy…feed1a" },
            ]}
            outputs={[
              {
                capacity: "500",
                lockLabel: "DAO deposit",
                address: "ckt1qy…feed1a",
                accent: "primary",
              },
              {
                capacity: "499.999",
                lockLabel: "secp256k1_blake160 (change)",
                address: "ckt1qy…feed1a",
                accent: "neutral",
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

const meta: Meta = {
  title: "Components/CellFlow",
  component: CellFlowStory,
  parameters: { layout: "padded" },
};
export default meta;

type Story = StoryObj<typeof meta>;
export const AllVariants: Story = {};
