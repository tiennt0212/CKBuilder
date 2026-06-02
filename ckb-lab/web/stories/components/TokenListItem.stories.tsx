import type { Meta, StoryObj } from "@storybook/react";
import { TokenListItem } from "@/components/ui/TokenListItem";
import { useState } from "react";

const TOKENS = [
  { symbol: "CKB", name: "Nervos CKB", type: "Native", balance: "1,480.34", balanceSub: "≈ $42.10" },
  { symbol: "DEM", name: "Demo Token", type: "xUDT", balance: "10,000", balanceSub: "" },
  { symbol: "SUV", name: "sUDT Token", type: "sUDT", balance: "500", balanceSub: "" },
];

function TokenListItemStory() {
  const [selected, setSelected] = useState(0);

  return (
    <div className="flex flex-col max-w-[380px]">
      {TOKENS.map((token, i) => (
        <TokenListItem
          key={i}
          {...token}
          selected={selected === i}
          onClick={() => setSelected(i)}
        />
      ))}
    </div>
  );
}

const meta: Meta = {
  title: "Components/TokenListItem",
  component: TokenListItemStory,
  parameters: { layout: "padded" },
};
export default meta;

type Story = StoryObj<typeof meta>;
export const AllVariants: Story = {};
