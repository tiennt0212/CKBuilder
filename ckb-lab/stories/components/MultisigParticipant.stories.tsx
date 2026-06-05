import type { Meta, StoryObj } from "@storybook/react";
import { MultisigParticipant } from "@/components/ui/MultisigParticipant";
import { Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useState } from "react";

function MultisigParticipantStory() {
  const [addresses, setAddresses] = useState([
    "ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0…",
    "ckt1qyq9wh0zwxqkpxhq6jcxh9z4k2ey8n3k3vdq8jf3g…",
    "",
  ]);

  const update = (i: number, val: string) =>
    setAddresses((prev) => prev.map((a, j) => (j === i ? val : a)));

  const remove = (i: number) =>
    setAddresses((prev) => prev.filter((_, j) => j !== i));

  return (
    <div className="flex flex-col gap-3 max-w-[500px]">
      <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-3 mb-1">
        2-of-3 multisig participants
      </div>
      {addresses.map((addr, i) => (
        <MultisigParticipant
          key={i}
          index={i + 1}
          address={addr}
          onChange={(val) => update(i, val)}
          onRemove={() => remove(i)}
        />
      ))}
      <Button
        block
        style={{ borderStyle: "dashed", borderRadius: 9, marginTop: 2 }}
        icon={<PlusOutlined />}
        onClick={() => setAddresses((prev) => [...prev, ""])}
      >
        Add participant
      </Button>
    </div>
  );
}

const meta: Meta = {
  title: "Components/MultisigParticipant",
  component: MultisigParticipantStory,
  parameters: { layout: "padded" },
};
export default meta;

type Story = StoryObj<typeof meta>;
export const AllVariants: Story = {};
