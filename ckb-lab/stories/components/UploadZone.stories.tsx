import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Form, Button } from "antd";
import type { UploadFile } from "antd";
import { UploadZone } from "@/components/ui/UploadZone";
import { FormItem } from "@/components/ui/FormItem";

const mockFile: UploadFile = {
  uid: "1",
  name: "counter",
  size: 12698,
  status: "done",
};

function UploadZoneStory() {
  const [files, setFiles] = useState<UploadFile[]>([]);

  return (
    <div className="flex flex-col gap-8 max-w-[480px]">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-3 mb-3">
          Empty (no file)
        </div>
        <UploadZone />
      </div>

      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-3 mb-3">
          File selected (pre-populated)
        </div>
        <UploadZone value={[mockFile]} onChange={() => {}} />
      </div>

      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-3 mb-3">
          Interactive (click to select)
        </div>
        <UploadZone value={files} onChange={setFiles} />
      </div>

      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-3 mb-3">
          Inside Ant Design Form
        </div>
        <Form layout="vertical" requiredMark={false} colon={false}>
          <FormItem
            name="binary"
            label="Contract Binary"
            hint="RISC-V .binary"
            valuePropName="value"
            getValueFromEvent={(fileList: UploadFile[]) => fileList}
          >
            <UploadZone />
          </FormItem>
          <Button type="primary" htmlType="submit" block>
            Deploy
          </Button>
        </Form>
      </div>
    </div>
  );
}

const meta: Meta = {
  title: "Components/UploadZone",
  component: UploadZoneStory,
  parameters: { layout: "padded" },
};
export default meta;

type Story = StoryObj<typeof meta>;
export const AllVariants: Story = {};
