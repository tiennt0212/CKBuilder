import type { Meta, StoryObj } from "@storybook/react";
import { SummaryPanel, SummaryRow } from "@/components/ui/SummaryPanel";

function SummaryPanelStory() {
  return (
    <div className="flex flex-col gap-6 max-w-[400px]">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-3 mb-3">
          Transfer summary
        </div>
        <SummaryPanel>
          <SummaryRow label="Amount" value="100" unit="CKB" />
          <SummaryRow label="Fee" value="0.001" unit="CKB" />
          <SummaryRow label="Balance after" value="889.999" unit="CKB" strong divider />
        </SummaryPanel>
      </div>

      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-3 mb-3">
          DAO deposit summary
        </div>
        <SummaryPanel>
          <SummaryRow label="Deposit amount" value="500" unit="CKB" />
          <SummaryRow label="Minimum epoch" value="180" unit="epochs" />
          <SummaryRow label="Est. APC" value="~2.8%" />
          <SummaryRow label="Remaining balance" value="489.999" unit="CKB" strong divider />
        </SummaryPanel>
      </div>
    </div>
  );
}

const meta: Meta = {
  title: "Components/SummaryPanel",
  component: SummaryPanelStory,
  parameters: { layout: "padded" },
};
export default meta;

type Story = StoryObj<typeof meta>;
export const AllVariants: Story = {};
