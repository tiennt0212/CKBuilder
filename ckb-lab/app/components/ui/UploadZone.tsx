"use client";

import { Upload } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import type { UploadFile, UploadProps } from "antd";

type UploadZoneProps = Omit<UploadProps, "fileList" | "onChange" | "showUploadList"> & {
  value?: UploadFile[];
  onChange?: (fileList: UploadFile[]) => void;
};

export function UploadZone({ value = [], onChange, ...rest }: UploadZoneProps) {
  const file = value[0];

  const handleChange: UploadProps["onChange"] = ({ fileList }) => {
    onChange?.(fileList.slice(-1));
  };

  return (
    <Upload
      fileList={value}
      onChange={handleChange}
      beforeUpload={() => false}
      showUploadList={false}
      maxCount={1}
      {...rest}
    >
      <div className="flex items-center gap-3.5 p-3.75 border-[1.5px] border-dashed border-input-border rounded-xl bg-panel-bg cursor-pointer hover:border-primary transition-colors">
        <div className="w-11 h-11 rounded-[11px] bg-primary-tint text-primary grid place-items-center shrink-0">
          <UploadOutlined style={{ fontSize: 20 }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-body font-semibold text-text-1">
            {file?.name ?? "No file selected"}
          </div>
          <div className="text-hint text-text-3 mt-0.5 truncate">
            {file?.size != null
              ? `${(file.size / 1024).toFixed(1)} KB · RISC-V binary`
              : "Click to browse or drag a file here"}
          </div>
        </div>
        <span
          className="ant-btn ant-btn-default ant-btn-sm"
          style={{ borderRadius: 8, pointerEvents: "none" }}
        >
          Browse
        </span>
      </div>
    </Upload>
  );
}
