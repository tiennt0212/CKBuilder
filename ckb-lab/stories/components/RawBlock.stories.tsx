import type { Meta, StoryObj } from "@storybook/react";
import { RawBlock } from "@/components/ui/RawBlock";

const MOCK_TX = {
  version: "0x0",
  cell_deps: [
    {
      out_point: {
        tx_hash: "0x71a7ba8fc96349fea0ed3a5c47992e3b4084b031a42264a018e0072e8172e46c",
        index: "0x0",
      },
      dep_type: "dep_group",
    },
  ],
  inputs: [{ previous_output: { tx_hash: "0xabc123def456…", index: "0x0" }, since: "0x0" }],
  outputs: [
    {
      capacity: "0x174876e800",
      lock: { code_hash: "0x9bd7e06f…", hash_type: "type", args: "0xdeadbeef…" },
      type: null,
    },
    {
      capacity: "0x1f2c0b2c00",
      lock: { code_hash: "0x9bd7e06f…", hash_type: "type", args: "0xfeedface…" },
      type: null,
    },
  ],
  outputs_data: ["0x", "0x"],
  witnesses: ["0x5500000010000000…"],
};

const MOCK_LOCK = { code_hash: "0x9bd7e06f…", hash_type: "type", args: "0xdeadbeef…" };
const MOCK_TYPE = { code_hash: "0x82d76d1b…", hash_type: "type", args: "0x" };

function RawBlockStory() {
  return (
    <div className="flex flex-col gap-8 max-w-[580px]">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-3 mb-3">
          Single item (open by default)
        </div>
        <RawBlock
          items={[{ key: "tx", label: "Raw Transaction · ~320 bytes", data: MOCK_TX }]}
        />
      </div>

      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-3 mb-3">
          Single item (collapsed)
        </div>
        <RawBlock
          items={[{ key: "tx", label: "Raw Transaction · ~320 bytes", data: MOCK_TX, defaultOpen: false }]}
        />
      </div>

      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-3 mb-3">
          Multiple items — cell detail pattern
        </div>
        <RawBlock
          items={[
            { key: "outpoint", label: "Out-point", data: { tx_hash: "0xabc123…", index: 0 }, defaultOpen: false },
            { key: "lock", label: "Lock script · secp256k1", data: MOCK_LOCK },
            { key: "type", label: "Type script", data: MOCK_TYPE, defaultOpen: false },
            { key: "data", label: "Output data · 8 bytes", data: { outputData: "0x0000000000000000", bytes: 8 }, defaultOpen: false },
          ]}
        />
      </div>
    </div>
  );
}

const meta: Meta = {
  title: "Components/RawBlock",
  component: RawBlockStory,
  parameters: { layout: "padded" },
};
export default meta;

type Story = StoryObj<typeof meta>;
export const AllVariants: Story = {};
