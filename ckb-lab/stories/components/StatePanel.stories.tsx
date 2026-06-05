import type { Meta, StoryObj } from "@storybook/react";
import { StatePanel } from "@/components/ui/StatePanel";

function StatePanelStory() {
  return (
    <div className="flex flex-col gap-6 max-w-[400px]">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-3 mb-3">
          Counter state (before / after)
        </div>
        <StatePanel
          title="Contract state"
          rows={[
            { label: "Before", value: "0x0000000000000000" },
            { label: "After", value: "0x0000000000000001", isCurrent: true },
          ]}
        />
      </div>

      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-3 mb-3">
          Multi-field state
        </div>
        <StatePanel
          title="Cell data"
          rows={[
            { label: "owner_lock_hash", value: "0x9bd7e06f…" },
            { label: "max_supply", value: "0x00e40b5402000000" },
            { label: "current_supply (after)", value: "0x002d79883d200000", isCurrent: true },
          ]}
        />
      </div>
    </div>
  );
}

const meta: Meta = {
  title: "Components/StatePanel",
  component: StatePanelStory,
  parameters: { layout: "padded" },
};
export default meta;

type Story = StoryObj<typeof meta>;
export const AllVariants: Story = {};
