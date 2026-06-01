import { theme } from "antd";

export const ckbTheme = (mode: "light" | "dark") => ({
  algorithm: mode === "dark" ? theme.darkAlgorithm : theme.defaultAlgorithm,
  token: {
    colorPrimary: mode === "dark" ? "#2bd396" : "#0a9d6c",
    colorInfo: mode === "dark" ? "#2bd396" : "#0a9d6c",
    borderRadius: 9,
    fontFamily: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`,
    colorBgLayout: mode === "dark" ? "#121315" : "#f4f5f6",
    colorBgContainer: mode === "dark" ? "#1c1d1f" : "#ffffff",
    colorBorderSecondary: mode === "dark" ? "#2a2c2f" : "#eef0f2",
    fontSize: 14,
    controlHeight: 42,
  },
  components: {
    Menu: {
      itemHeight: 37,
      itemBorderRadius: 8,
      subMenuItemBorderRadius: 8,
    },
    Button: {
      controlHeight: 44,
      borderRadius: 10,
    },
    Input: {
      controlHeight: 42,
    },
    Select: {
      controlHeight: 42,
    },
  },
});
