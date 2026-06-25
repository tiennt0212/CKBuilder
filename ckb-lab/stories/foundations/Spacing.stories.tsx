import type { Meta, StoryObj } from "@storybook/react";

const RADII = [
  { name: "Control / Input", value: "9px" },
  { name: "Button", value: "10px" },
  { name: "Panel / State", value: "11px" },
  { name: "Card", value: "12px" },
  { name: "Chip / Badge", value: "5–7px" },
];

const HEIGHTS = [
  { name: "Menu item", value: "37px", px: 37 },
  { name: "Header pill", value: "34px", px: 34 },
  { name: "Wallet button", value: "38px", px: 38 },
  { name: "Input / Select", value: "42px", px: 42 },
  { name: "Primary button", value: "44px", px: 44 },
];

function SpacingStory() {
  return (
    <div className="flex flex-col gap-10 max-w-[800px]">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-3 mb-4">
          Border radius
        </div>
        <div className="flex flex-wrap gap-5">
          {RADII.map((r) => (
            <div key={r.name} className="flex flex-col gap-2.5">
              <div
                className="flex items-center justify-center"
                style={{
                  width: 80,
                  height: 64,
                  background: "var(--bg-elev)",
                  border: "1px solid var(--border-2)",
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 42,
                    background: "var(--primary-tint)",
                    border: "1.5px solid var(--primary)",
                    borderRadius: r.value.split("–")[0],
                  }}
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[12px] font-semibold text-text-1">{r.name}</span>
                <span
                  style={{
                    fontFamily: 'ui-monospace,"SF Mono",Menlo,monospace',
                    fontSize: 10.5,
                    color: "var(--text-3)",
                  }}
                >
                  {r.value}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-3 mb-4">
          Control heights
        </div>
        <div className="flex flex-col gap-3">
          {HEIGHTS.map((h) => (
            <div key={h.name} className="flex items-center gap-4">
              <div
                style={{
                  width: h.px * 2.5,
                  height: h.px,
                  background: "var(--primary-tint)",
                  border: "1px solid var(--primary)",
                  borderRadius: 9,
                }}
              />
              <div className="flex gap-2 items-baseline">
                <span className="text-body font-semibold text-text-1">{h.name}</span>
                <span
                  style={{
                    fontFamily: 'ui-monospace,"SF Mono",Menlo,monospace',
                    fontSize: 10.5,
                    color: "var(--text-3)",
                  }}
                >
                  {h.value}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-3 mb-4">
          Elevation / shadow
        </div>
        <div
          style={{
            width: 90,
            height: 48,
            background: "var(--bg-elev)",
            borderRadius: 10,
            boxShadow: "var(--shadow)",
            border: "1px solid var(--border)",
          }}
        />
        <span
          style={{
            fontFamily: 'ui-monospace,"SF Mono",Menlo,monospace',
            fontSize: 10.5,
            color: "var(--text-3)",
            display: "block",
            marginTop: 8,
          }}
        >
          --shadow
        </span>
      </div>
    </div>
  );
}

const meta: Meta = {
  title: "Foundations/Spacing & Radius",
  component: SpacingStory,
  parameters: { layout: "padded" },
};
export default meta;

type Story = StoryObj<typeof meta>;
export const SpacingAndRadius: Story = {};
