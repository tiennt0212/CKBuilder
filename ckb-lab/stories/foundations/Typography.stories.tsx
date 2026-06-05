import type { Meta, StoryObj } from "@storybook/react";

const TYPE_SCALE = [
  { role: "Page title (header)", spec: "17px · 600 · -0.01em", sample: "Build a transaction", style: { fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em" } },
  { role: "Card / section title", spec: "15px · 600", sample: "Transaction Preview", style: { fontSize: 15, fontWeight: 600 } },
  { role: "Card subtitle", spec: "12px · 400", sample: "Cell-model breakdown", style: { fontSize: 12, fontWeight: 400, color: "var(--text-3)" } },
  { role: "Field label", spec: "12.5px · 550", sample: "Recipient address", style: { fontSize: 12.5, fontWeight: 550, color: "var(--text-2)" } },
  { role: "Body / input", spec: "13.5px · 400–500", sample: "Standard interface text", style: { fontSize: 13.5, fontWeight: 400 } },
  { role: "Big amount", spec: "20px · 600 · tabular", sample: "1,000.00", style: { fontSize: 20, fontWeight: 600, fontVariantNumeric: "tabular-nums" } },
  { role: "Summary hero value", spec: "18px · 600 · primary", sample: "11,480.34 CKB", style: { fontSize: 18, fontWeight: 600, color: "var(--primary)", fontVariantNumeric: "tabular-nums" } },
  { role: "Group label (sidebar)", spec: "10.5px · 600 · CAPS · 0.07em", sample: "SMART CONTRACTS", style: { fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-3)" } },
  { role: "Mono / hash", spec: "12px · mono", sample: "ckt1qy…m3f9a", style: { fontSize: 12, fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace', color: "var(--text-2)" } },
  { role: "Code block", spec: "11.5px · mono · lh 1.65", sample: '"capacity": "0x174876e800"', style: { fontSize: 11.5, fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace', lineHeight: 1.65, color: "var(--code-text)", background: "var(--code-bg)", padding: "4px 8px", borderRadius: 6 } },
];

function TypographyStory() {
  return (
    <div className="max-w-[800px]">
      {TYPE_SCALE.map((row) => (
        <div
          key={row.role}
          className="flex items-baseline gap-6 py-[14px] border-b border-app-border last:border-b-0"
        >
          <div className="w-[200px] flex-shrink-0 flex flex-col gap-0.5">
            <span className="text-[12.5px] font-semibold text-text-1">{row.role}</span>
            <span
              style={{ fontFamily: 'ui-monospace,"SF Mono",Menlo,monospace', fontSize: 10.5, color: "var(--text-3)" }}
            >
              {row.spec}
            </span>
          </div>
          <span style={{ color: "var(--text-1)", ...row.style }}>{row.sample}</span>
        </div>
      ))}
    </div>
  );
}

const meta: Meta = {
  title: "Foundations/Typography",
  component: TypographyStory,
  parameters: { layout: "padded" },
};
export default meta;

type Story = StoryObj<typeof meta>;
export const TypeScale: Story = {};
