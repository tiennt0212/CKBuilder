import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "@/components/ui/Badge";
import { StatusChip } from "@/components/ui/StatusChip";

function BadgesStory() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-3 mb-3">
          Identity badges
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant="joiid">JoyID</Badge>
          <Badge variant="rust">Rust</Badge>
          <Badge variant="xudt">xUDT</Badge>
          <Badge>Generic</Badge>
        </div>
      </div>

      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-3 mb-3">
          Status chips
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <StatusChip variant="ok" />
          <StatusChip variant="ok" label="Confirmed" />
          <StatusChip variant="pending" />
          <StatusChip variant="pending" label="Pending" />
        </div>
      </div>

      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-3 mb-3">
          Direction dots (tx history)
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          {[
            { label: "Incoming", color: "var(--primary)" },
            { label: "Outgoing", color: "var(--text-3)" },
            { label: "Script", color: "#c0683a" },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-2 text-body text-text-2">
              <span
                className="inline-block w-[7px] h-[7px] rounded-full"
                style={{ background: color }}
              />
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const meta: Meta = {
  title: "Components/Badge",
  component: BadgesStory,
  parameters: { layout: "padded" },
};
export default meta;

type Story = StoryObj<typeof meta>;
export const AllVariants: Story = {};
