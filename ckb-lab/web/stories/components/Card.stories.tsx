import type { Meta, StoryObj } from "@storybook/react";
import { Card } from "antd";

const CARD_STYLE = {
  borderRadius: 12,
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow)",
};
const HEAD_STYLE = { padding: "16px 18px", borderBottom: "1px solid var(--border)" };
const BODY_STYLE = { padding: "18px" };

function CardStory() {
  return (
    <div className="flex flex-wrap gap-6">
      <div style={{ width: 320 }}>
        <Card
          title={<div className="text-subhead font-semibold text-text-1">Simple card</div>}
          style={CARD_STYLE}
          styles={{ header: HEAD_STYLE, body: BODY_STYLE }}
        >
          <p className="text-body text-text-2">Card body content.</p>
        </Card>
      </div>

      <div style={{ width: 320 }}>
        <Card
          title={
            <div>
              <div className="text-subhead font-semibold text-text-1">Transfer CKB</div>
              <div className="text-hint text-text-3 font-normal">Send capacity to another address</div>
            </div>
          }
          style={CARD_STYLE}
          styles={{ header: HEAD_STYLE, body: BODY_STYLE }}
        >
          <p className="text-body text-text-2">Card with subtitle.</p>
        </Card>
      </div>

      <div style={{ width: 360 }}>
        <Card
          title={
            <div>
              <div className="text-subhead font-semibold text-text-1">Transaction Preview</div>
              <div className="text-hint text-text-3 font-normal">Live preview</div>
            </div>
          }
          tabList={[
            { key: "summary", tab: "Summary" },
            { key: "raw", tab: "Raw" },
          ]}
          activeTabKey="summary"
          style={CARD_STYLE}
          styles={{ header: HEAD_STYLE, body: BODY_STYLE }}
        >
          <p className="text-body text-text-2">Card with tab list.</p>
        </Card>
      </div>
    </div>
  );
}

const meta: Meta = {
  title: "Components/Card",
  component: CardStory,
  parameters: { layout: "padded" },
};
export default meta;

type Story = StoryObj<typeof meta>;
export const AllVariants: Story = {};
