export function CubeMark({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Top face — lighter accent */}
      <polygon points="12,2 22,7 12,12 2,7" fill="var(--cube-top, #27c08a)" />
      {/* Left face — darkest */}
      <polygon points="2,7 12,12 12,22 2,17" fill="var(--cube-side, #077a55)" />
      {/* Right face — primary */}
      <polygon points="22,7 22,17 12,22 12,12" fill="var(--primary)" />
    </svg>
  );
}
