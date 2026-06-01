"use client";

import { useTheme } from "../contexts/ThemeContext";

export function CubeMark({ size = 24 }: { size?: number }) {
  const { mode } = useTheme();
  const front = mode === "dark" ? "#2bd396" : "#0a9d6c";
  const top = mode === "dark" ? "#54e0b0" : "#27c08a";
  const side = mode === "dark" ? "#1aa874" : "#077a55";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Top face */}
      <polygon points="12,2 22,7 12,12 2,7" fill={top} />
      {/* Left face */}
      <polygon points="2,7 12,12 12,22 2,17" fill={side} />
      {/* Right face (front) */}
      <polygon points="22,7 22,17 12,22 12,12" fill={front} />
    </svg>
  );
}
