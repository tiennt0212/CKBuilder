import type { Meta, StoryObj } from "@storybook/react";
import { SwitchRow } from "@/components/ui/SwitchRow";
import { useState } from "react";

function SwitchRowStory() {
  const [typeId, setTypeId] = useState(false);
  const [mainnet, setMainnet] = useState(true);

  return (
    <div className="flex flex-col gap-4 max-w-[420px]">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-3 mb-3">
          Off state
        </div>
        <SwitchRow
          title="Enable Type ID"
          subtitle="Makes the script upgradeable"
          checked={typeId}
          onChange={setTypeId}
        />
      </div>

      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-3 mb-3">
          On state
        </div>
        <SwitchRow
          title="Mainnet deployment"
          subtitle="Deploy to ckb mainnet instead of testnet"
          checked={mainnet}
          onChange={setMainnet}
        />
      </div>
    </div>
  );
}

const meta: Meta = {
  title: "Components/SwitchRow",
  component: SwitchRowStory,
  parameters: { layout: "padded" },
};
export default meta;

type Story = StoryObj<typeof meta>;
export const AllVariants: Story = {};
