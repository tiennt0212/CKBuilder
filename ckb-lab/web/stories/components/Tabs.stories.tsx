import type { Meta, StoryObj } from "@storybook/react";
import { Card } from "antd";
import { useState } from "react";

function TabsStory() {
  const [activeTab, setActiveTab] = useState("summary");

  return (
    <div style={{ maxWidth: 480 }}>
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
        activeTabKey={activeTab}
        onTabChange={setActiveTab}
        styles={{
          header: { padding: "16px 18px", borderBottom: "1px solid var(--border)" },
          body: { padding: "18px" },
        }}
        style={{
          borderRadius: 12,
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow)",
        }}
      >
        {activeTab === "summary" ? (
          <p className="text-body text-text-2">Summary content — showing transaction totals.</p>
        ) : (
          <p className="text-body text-text-2 font-mono">Raw JSON transaction content.</p>
        )}
      </Card>
    </div>
  );
}

const meta: Meta = {
  title: "Components/Tabs",
  component: TabsStory,
  parameters: { layout: "padded" },
};
export default meta;

type Story = StoryObj<typeof meta>;
export const SummaryRaw: Story = {};
