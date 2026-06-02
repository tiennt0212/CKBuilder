import type { Meta, StoryObj } from "@storybook/react";
import { DaoPosition } from "@/components/ui/DaoPosition";

function DaoPositionStory() {
  return (
    <div className="max-w-[400px]">
      <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-3 mb-3">
        DAO positions
      </div>
      <div className="rounded-[11px] border border-app-border bg-bg-elev px-4">
        <DaoPosition
          capacity="500"
          depositEpoch="4,216"
          compensation="2.81"
          apc="2.8%"
          progress={45}
        />
        <DaoPosition
          capacity="1,000"
          depositEpoch="3,900"
          compensation="8.12"
          apc="2.9%"
          progress={78}
        />
        <DaoPosition
          capacity="250"
          depositEpoch="4,400"
          compensation="0.42"
          apc="2.7%"
          progress={12}
        />
      </div>
    </div>
  );
}

const meta: Meta = {
  title: "Components/DaoPosition",
  component: DaoPositionStory,
  parameters: { layout: "padded" },
};
export default meta;

type Story = StoryObj<typeof meta>;
export const AllVariants: Story = {};
