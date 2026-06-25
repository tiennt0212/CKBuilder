"use client";

import { useState } from "react";
import { Button, Tooltip } from "antd";
import { CheckOutlined, CloseOutlined, CopyOutlined } from "@ant-design/icons";

type CopyState = "idle" | "copied" | "failed";

interface CopyTextProps {
  /** Full text written to clipboard. Pass undefined to show a loading skeleton. */
  text?: string;
  /** Optional display string shown instead of text (e.g. a truncated address). */
  display?: string;
  className?: string;
  textClassName?: string;
  iconSize?: number;
}

export function CopyText({
  text,
  display,
  className,
  textClassName,
  iconSize = 12,
}: CopyTextProps) {
  const [copyState, setCopyState] = useState<CopyState>("idle");

  function handleCopy() {
    if (!text) return;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopyState("copied");
        setTimeout(() => setCopyState("idle"), 1500);
      })
      .catch(() => {
        setCopyState("failed");
        setTimeout(() => setCopyState("idle"), 1500);
      });
  }

  const tooltipLabel =
    copyState === "copied"
      ? "Copied!"
      : copyState === "failed"
        ? "Failed!"
        : text
          ? "Copy"
          : "Loading…";

  const iconEl =
    copyState === "copied" ? (
      <CheckOutlined style={{ fontSize: iconSize }} />
    ) : copyState === "failed" ? (
      <CloseOutlined style={{ fontSize: iconSize }} />
    ) : (
      <CopyOutlined style={{ fontSize: iconSize }} />
    );

  const btnColorClass =
    copyState === "copied"
      ? "text-primary!"
      : copyState === "failed"
        ? "text-rust!"
        : "text-text-3! hover:text-primary!";

  return (
    <span className={["flex items-center gap-1", className].filter(Boolean).join(" ")}>
      {text !== undefined ? (
        <span className={textClassName}>{display ?? text}</span>
      ) : (
        <span className="inline-block w-16 h-2.5 rounded bg-text-3/20 animate-pulse" />
      )}
      <Tooltip title={tooltipLabel}>
        <Button
          type="text"
          icon={iconEl}
          onClick={handleCopy}
          disabled={!text}
          className={[
            "shrink-0 p-0.5! h-auto! w-auto! min-w-0! transition-colors",
            btnColorClass,
          ].join(" ")}
        />
      </Tooltip>
    </span>
  );
}
