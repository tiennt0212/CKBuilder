import type { Meta, StoryObj } from "@storybook/react";
import { Button, Space } from "antd";
import { ArrowRightOutlined, ThunderboltOutlined } from "@ant-design/icons";

function ButtonsStory() {
  return (
    <div className="flex flex-col gap-8 max-w-[600px]">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-3 mb-3">
          Variants
        </div>
        <Space size={16} wrap align="center">
          <Button type="primary" icon={<ArrowRightOutlined />} iconPosition="end">
            Review transaction
          </Button>
          <Button type="primary" icon={<ThunderboltOutlined />} iconPosition="end">
            Build &amp; send
          </Button>
          <Button>Cancel</Button>
          <Button size="small">Copy address</Button>
        </Space>
      </div>

      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-3 mb-3">
          Block
        </div>
        <div style={{ maxWidth: 320 }}>
          <Button type="primary" block icon={<ArrowRightOutlined />} iconPosition="end">
            Send Transaction
          </Button>
        </div>
      </div>

      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-3 mb-3">
          Split row
        </div>
        <Space style={{ maxWidth: 320, width: "100%" }}>
          <Button style={{ flex: 1, minWidth: 120 }}>Reset</Button>
          <Button type="primary" style={{ flex: 1, minWidth: 120 }} icon={<ArrowRightOutlined />} iconPosition="end">
            Deposit
          </Button>
        </Space>
      </div>

      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-3 mb-3">
          Disabled
        </div>
        <Space size={16}>
          <Button type="primary" disabled>
            Disabled primary
          </Button>
          <Button disabled>Disabled ghost</Button>
        </Space>
      </div>
    </div>
  );
}

const meta: Meta = {
  title: "Components/Button",
  component: ButtonsStory,
  parameters: { layout: "padded" },
};
export default meta;

type Story = StoryObj<typeof meta>;
export const AllVariants: Story = {};
