import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { Sidebar } from "@/components/Sidebar";
import { usePathname, useRouter } from "next/navigation";
import { ROUTES } from "@/lib/routes";

const meta: Meta<{ activeKey: string; latency?: string }> = {
  title: "Chrome/Sidebar",
  component: Sidebar,
  parameters: { layout: "centered" },
  decorators: [
    (Story, ctx) => {
      (usePathname as ReturnType<typeof fn>).mockReturnValue(ctx.args.activeKey ?? ROUTES.TRANSFER);
      (useRouter as ReturnType<typeof fn>).mockReturnValue({
        push: fn(),
        replace: fn(),
        back: fn(),
      });
      return (
        <div style={{ width: 248, height: 680 }}>
          <Story />
        </div>
      );
    },
  ],
  argTypes: {
    activeKey: {
      control: "select",
      options: Object.values(ROUTES),
    },
  },
};
export default meta;

type Story = StoryObj<typeof meta>;

export const Transfer: Story = { args: { activeKey: ROUTES.TRANSFER } };
export const InvokeScript: Story = { args: { activeKey: ROUTES.INVOKE } };
export const NervosDAO: Story = { args: { activeKey: ROUTES.DAO } };
export const History: Story = { args: { activeKey: ROUTES.HISTORY } };
