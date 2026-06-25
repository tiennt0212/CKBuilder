import type { Meta, StoryObj } from "@storybook/react";
import { CopyText } from "@/components/ui/CopyText";

const SAMPLE_ADDRESS = "ckt1qzda0cr08m85hc8jlnfp3gog01ybf3cjq4ue8n4mk7fmjgn3xtpvqq7jq2nm";
const SAMPLE_TRUNCATED = "ckt1…ptpvq";

function CopyTextStory() {
  return (
    <div className="flex flex-col gap-8 max-w-sm">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-3 mb-3">
          With truncated display
        </div>
        <CopyText
          text={SAMPLE_ADDRESS}
          display={SAMPLE_TRUNCATED}
          textClassName="font-mono text-[12px] text-text-2"
        />
      </div>

      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-3 mb-3">
          Full text (no display override)
        </div>
        <CopyText text="0xabcdef1234567890" textClassName="font-mono text-[12px] text-text-2" />
      </div>

      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-3 mb-3">
          Loading state (text undefined)
        </div>
        <CopyText text={undefined} textClassName="font-mono text-[12px] text-text-2" />
      </div>
    </div>
  );
}

const meta: Meta = {
  title: "Components/CopyText",
  component: CopyTextStory,
  parameters: { layout: "padded" },
};
export default meta;

type Story = StoryObj<typeof meta>;
export const AllStates: Story = {};
