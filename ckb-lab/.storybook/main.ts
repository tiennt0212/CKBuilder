import type { StorybookConfig } from "@storybook/react-vite";
import path from "path";

const config: StorybookConfig = {
  stories: ["../stories/**/*.stories.@(ts|tsx)"],
  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {
      // Use React 18 automatic JSX runtime so stories don't need `import React`
      builder: { useSWC: false },
    },
  },
  async viteFinal(viteConfig) {
    const { default: tailwindcss } = await import("@tailwindcss/vite");

    viteConfig.plugins = [...(viteConfig.plugins ?? []), tailwindcss()];

    // Resolve @/ → app/ for stories
    viteConfig.resolve = {
      ...viteConfig.resolve,
      alias: {
        ...viteConfig.resolve?.alias,
        "@": path.resolve(__dirname, "../app"),
      },
    };

    // Ensure automatic JSX runtime (React 17+) — no need to import React in each file
    viteConfig.esbuild = {
      ...viteConfig.esbuild,
      jsx: "automatic",
    };

    return viteConfig;
  },
};

export default config;
