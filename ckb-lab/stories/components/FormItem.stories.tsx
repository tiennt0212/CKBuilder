import type { Meta, StoryObj } from "@storybook/react";
import { Form, Input, Select, Button } from "antd";
import { FormItem } from "@/components/ui/FormItem";

function FormItemStory() {
  return (
    <div className="flex flex-col gap-8 max-w-[420px]">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-3 mb-3">
          Label only
        </div>
        <Form layout="vertical" requiredMark={false} colon={false}>
          <FormItem name="address" label="To Address">
            <Input placeholder="ckt1qy…" className="font-mono" />
          </FormItem>
        </Form>
      </div>

      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-3 mb-3">
          Label + hint
        </div>
        <Form layout="vertical" requiredMark={false} colon={false}>
          <FormItem name="amount" label="Amount" hint="Min: 61 CKB">
            <Input placeholder="0.00000000" suffix="CKB" />
          </FormItem>
        </Form>
      </div>

      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-3 mb-3">
          Full form
        </div>
        <Form layout="vertical" requiredMark={false} colon={false}>
          <FormItem name="to" label="Recipient" style={{ marginBottom: 14 }}>
            <Input placeholder="ckt1qy…" className="font-mono" />
          </FormItem>
          <FormItem name="amount" label="Amount" hint="Min: 61 CKB" style={{ marginBottom: 14 }}>
            <Input placeholder="0.00" suffix="CKB" />
          </FormItem>
          <FormItem name="network" label="Network" hint="Current">
            <Select
              options={[
                { value: "testnet", label: "Testnet" },
                { value: "mainnet", label: "Mainnet" },
              ]}
              defaultValue="testnet"
            />
          </FormItem>
          <Button type="primary" block htmlType="submit">
            Submit
          </Button>
        </Form>
      </div>
    </div>
  );
}

const meta: Meta = {
  title: "Components/FormItem",
  component: FormItemStory,
  parameters: { layout: "padded" },
};
export default meta;

type Story = StoryObj<typeof meta>;
export const AllVariants: Story = {};
