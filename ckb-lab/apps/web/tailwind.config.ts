import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "var(--primary)",
        "primary-press": "var(--primary-press)",
        "primary-tint": "var(--primary-tint)",
        "bg-body": "var(--bg-body)",
        "bg-elev": "var(--bg-elev)",
        border: "var(--border)",
        "border-2": "var(--border-2)",
        "text-1": "var(--text-1)",
        "text-2": "var(--text-2)",
        "text-3": "var(--text-3)",
        "panel-bg": "var(--panel-bg)",
        "code-bg": "var(--code-bg)",
        "code-text": "var(--code-text)",
      },
      fontFamily: {
        mono: [
          "ui-monospace",
          '"SF Mono"',
          '"JetBrains Mono"',
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      fontVariantNumeric: {
        tabular: "tabular-nums",
      },
    },
  },
  plugins: [],
};

export default config;
