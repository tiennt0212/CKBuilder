import type { Meta, StoryObj } from "@storybook/react";
import { CellChip } from "@/components/ui/CellChip";

function CellChipStory() {
  return (
    <div className="flex flex-col gap-4 max-w-[320px]">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-3 mb-2">
          No accent (input cell)
        </div>
        <CellChip capacity="990.001" lockLabel="secp256k1_blake160" address="ckt1qy…feed1a" />
      </div>

      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-3 mb-2">
          Primary accent (recipient output)
        </div>
        <CellChip
          capacity="100"
          lockLabel="secp256k1_blake160"
          address="ckt1qy…m3f9a"
          accent="primary"
        />
      </div>

      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-3 mb-2">
          Neutral accent (change output)
        </div>
        <CellChip
          capacity="889.999"
          lockLabel="secp256k1_blake160 (change)"
          address="ckt1qy…feed1a"
          accent="neutral"
        />
      </div>

      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-3 mb-2">
          No address
        </div>
        <CellChip capacity="61" lockLabel="secp256k1_blake160" />
      </div>
    </div>
  );
}

const meta: Meta = {
  title: "Components/CellChip",
  component: CellChipStory,
  parameters: { layout: "padded" },
};
export default meta;

type Story = StoryObj<typeof meta>;
export const AllVariants: Story = {};
