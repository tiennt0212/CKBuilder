import type { Meta, StoryObj } from "@storybook/react";
import { Header } from "@/components/Header";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Provider as CccProvider } from "@ckb-ccc/connector-react";
import { useNetworkStore } from "@/stores/network";
import { NETWORKS, type Network } from "@/lib/ccc-client";
import { ROUTES } from "@/lib/routes";

const meta: Meta<{ pathname: string; network: Network }> = {
  title: "Chrome/Header",
  component: Header,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story, ctx) => {
      useNetworkStore.setState({ network: ctx.args.network ?? "testnet" });
      return (
        <ThemeProvider>
          <CccProvider>
            <div style={{ width: 1192 }}>
              <Story />
            </div>
          </CccProvider>
        </ThemeProvider>
      );
    },
  ],
  argTypes: {
    pathname: {
      control: "select",
      options: Object.values(ROUTES),
    },
    network: {
      control: "select",
      options: NETWORKS,
    },
  },
};
export default meta;

type Story = StoryObj<typeof meta>;

export const TransferTestnet: Story = {
  args: { pathname: ROUTES.TRANSFER, network: "testnet" },
};

export const DeployMainnet: Story = {
  args: { pathname: ROUTES.DEPLOY, network: "mainnet" },
};

export const DAODevnet: Story = {
  args: { pathname: ROUTES.DAO, network: "devnet" },
};
