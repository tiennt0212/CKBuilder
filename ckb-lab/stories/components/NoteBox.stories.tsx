import type { Meta, StoryObj } from "@storybook/react";
import { NoteBox } from "@/components/ui/NoteBox";

function NoteBoxStory() {
  return (
    <div className="flex flex-col gap-4 max-w-[480px]">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-3 mb-3">
          Info note
        </div>
        <NoteBox>
          Each xUDT cell requires a minimum of <strong>142 CKB</strong> for capacity. Make sure your
          wallet has enough CKB to cover the cell cost.
        </NoteBox>
      </div>

      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-3 mb-3">
          Technical note
        </div>
        <NoteBox>
          Enabling <strong>Type ID</strong> makes the script upgradeable. The{" "}
          <code
            className="font-mono text-[11px]"
            style={{ background: "var(--bg-elev)", padding: "1px 4px", borderRadius: 4 }}
          >
            code_hash
          </code>{" "}
          remains stable even after updating the binary.
        </NoteBox>
      </div>
    </div>
  );
}

const meta: Meta = {
  title: "Components/NoteBox",
  component: NoteBoxStory,
  parameters: { layout: "padded" },
};
export default meta;

type Story = StoryObj<typeof meta>;
export const AllVariants: Story = {};
