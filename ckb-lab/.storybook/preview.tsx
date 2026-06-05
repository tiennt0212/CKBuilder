import type { Preview, Decorator } from "@storybook/react";
import React, { useEffect } from "react";
import { ConfigProvider } from "antd";
import { ckbTheme } from "../app/theme";
import "../app/globals.css";

const withTheme: Decorator = (Story, context) => {
  const theme = (context.globals.theme ?? "light") as "light" | "dark";

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("theme-light", "theme-dark");
    root.classList.add(`theme-${theme}`);
  }, [theme]);

  return (
    <ConfigProvider theme={ckbTheme(theme)}>
      <div
        className={`theme-${theme} min-h-screen`}
        style={{
          background: "var(--bg-body)",
          color: "var(--text-1)",
          padding: "24px",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        }}
      >
        <Story />
      </div>
    </ConfigProvider>
  );
};

const preview: Preview = {
  decorators: [withTheme],
  globalTypes: {
    theme: {
      name: "Theme",
      description: "CKBuilder color theme",
      defaultValue: "light",
      toolbar: {
        icon: "circlehollow",
        items: [
          { value: "light", title: "Light", icon: "sun" },
          { value: "dark", title: "Dark", icon: "moon" },
        ],
        showName: true,
        dynamicTitle: true,
      },
    },
  },
  parameters: {
    backgrounds: { disable: true },
    layout: "fullscreen",
  },
};

export default preview;
