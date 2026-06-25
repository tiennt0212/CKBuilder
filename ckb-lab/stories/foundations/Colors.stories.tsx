import type { Meta, StoryObj } from "@storybook/react";
import { useEffect, useState } from "react";

const TOKEN_GROUPS = {
  Surfaces: [
    { name: "--bg-body", desc: "App background" },
    { name: "--bg-elev", desc: "Cards, header, sidebar" },
    { name: "--panel-bg", desc: "Inset panels" },
    { name: "--seg-bg", desc: "Segmented / tab track" },
    { name: "--code-bg", desc: "Raw / code blocks" },
  ],
  Borders: [
    { name: "--border", desc: "Hairline dividers" },
    { name: "--border-2", desc: "Stronger borders" },
    { name: "--input-border", desc: "Control outline" },
  ],
  Text: [
    { name: "--text-1", desc: "Primary text" },
    { name: "--text-2", desc: "Secondary / labels" },
    { name: "--text-3", desc: "Tertiary / hints" },
  ],
  "Accent · CKB green": [
    { name: "--primary", desc: "Actions, active, links" },
    { name: "--primary-press", desc: "Hover / pressed" },
    { name: "--primary-tint", desc: "Active bg, badges" },
    { name: "--dot", desc: "Status dot" },
    { name: "--dot-halo", desc: "Status dot glow" },
  ],
  "Special-purpose": [
    { name: "--tag-bg", desc: "Sidebar menu tags" },
    { name: "--wallet-bg", desc: "Wallet button background" },
  ],
};

function ColorSwatch({ cssVar, desc }: { cssVar: string; desc: string }) {
  const [value, setValue] = useState("");
  useEffect(() => {
    setValue(getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim());
  }, [cssVar]);

  return (
    <div className="flex items-center gap-3">
      <div
        className="w-[42px] h-[42px] rounded-[9px] border border-border-2 flex-shrink-0 overflow-hidden"
        style={{
          backgroundImage:
            "linear-gradient(45deg,rgba(127,127,127,.12) 25%,transparent 25%,transparent 75%,rgba(127,127,127,.12) 75%),linear-gradient(45deg,rgba(127,127,127,.12) 25%,transparent 25%,transparent 75%,rgba(127,127,127,.12) 75%)",
          backgroundSize: "12px 12px",
          backgroundPosition: "0 0,6px 6px",
        }}
      >
        <div className="w-full h-full rounded-[8px]" style={{ background: `var(${cssVar})` }} />
      </div>
      <div className="flex flex-col min-w-0 leading-[1.3]">
        <span className="font-mono text-[12px] font-semibold text-text-1">{cssVar}</span>
        <span className="font-mono text-[10.5px] text-text-3 truncate">{value || desc}</span>
      </div>
    </div>
  );
}

function ColorsStory() {
  return (
    <div className="flex flex-col gap-8 max-w-[960px]">
      {Object.entries(TOKEN_GROUPS).map(([group, tokens]) => (
        <div key={group}>
          <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-3 mb-3">
            {group}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 14,
            }}
          >
            {tokens.map((t) => (
              <ColorSwatch key={t.name} cssVar={t.name} desc={t.desc} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const meta: Meta = {
  title: "Foundations/Colors",
  component: ColorsStory,
  parameters: { layout: "padded" },
};
export default meta;

type Story = StoryObj<typeof meta>;
export const AllTokens: Story = {};
