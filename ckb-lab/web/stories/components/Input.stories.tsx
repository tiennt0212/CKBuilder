import type { Meta, StoryObj } from "@storybook/react";
import { Form, Input } from "antd";
import { CopyOutlined, SearchOutlined } from "@ant-design/icons";
import { FormItem } from "@/components/ui/FormItem";

function InputsStory() {
  return (
    <div className="flex flex-wrap gap-6 max-w-[900px]">
      <Form layout="vertical" requiredMark={false} colon={false} style={{ width: 320 }}>
        <FormItem label="Text input">
          <Input placeholder="Standard text input" style={{ height: 42 }} />
        </FormItem>

        <FormItem label="To Address">
          <Input
            placeholder="ckt1qy…"
            className="font-mono"
            suffix={
              <CopyOutlined className="text-text-3 cursor-pointer hover:text-primary transition-colors" />
            }
            style={{ height: 42 }}
          />
        </FormItem>

        <FormItem label="Amount" hint="Min 61 CKB per cell">
          <Input
            placeholder="0.00000000"
            suffix={
              <span className="flex items-center gap-2">
                <span className="text-2xs font-semibold px-[5px] py-px rounded bg-primary-tint text-primary cursor-pointer select-none">
                  MAX
                </span>
                <span className="text-body text-text-2 font-medium">CKB</span>
              </span>
            }
            style={{ height: 42, fontSize: 20, fontWeight: 600 }}
            className="tabular-nums"
          />
        </FormItem>

        <FormItem label="Script arguments (key / value)">
          <div className="grid grid-cols-[0.62fr_1fr] gap-2">
            <Input
              value="step"
              className="font-mono"
              style={{ height: 42, background: "var(--panel-bg)" }}
              readOnly
            />
            <Input
              defaultValue="1"
              suffix={<span className="text-text-3 text-body">u64</span>}
              style={{ height: 42 }}
            />
          </div>
        </FormItem>

        <FormItem label="Search">
          <Input
            prefix={<SearchOutlined className="text-text-3" />}
            placeholder="Search cells by lock, type, capacity…"
            style={{ height: 40 }}
          />
        </FormItem>
      </Form>
    </div>
  );
}

const meta: Meta = {
  title: "Components/Input",
  component: InputsStory,
  parameters: { layout: "padded" },
};
export default meta;

type Story = StoryObj<typeof meta>;
export const AllVariants: Story = {};
