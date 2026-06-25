import type { Meta, StoryObj } from "@storybook/react";
import { TxStatusBanner } from "@/components/ui/TxStatusBanner";
import { Network } from "@/lib";
import { useNetworkStore } from "@/stores/network";

const MOCK_TX_HASH = "0xa3f9c8d21b4e5f72a981c3b07d46e258f19034a67c82b154d709e3f81200c7d1";

const withNetwork = (network: Network) => (Story: React.ComponentType) => {
  useNetworkStore.setState({ network });
  return <Story />;
};

const meta = {
  title: "Components/TxStatusBanner",
  component: TxStatusBanner,
  parameters: { layout: "padded" },
} satisfies Meta<typeof TxStatusBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Sending: Story = {
  args: { status: "sending" },
};

export const Sent: Story = {
  args: { status: "sent", txHash: MOCK_TX_HASH },
};

export const Pending: Story = {
  args: { status: "pending", txHash: MOCK_TX_HASH },
};

export const Proposed: Story = {
  args: { status: "proposed", txHash: MOCK_TX_HASH },
};

export const CommittedTestnet: Story = {
  name: "Committed (testnet)",
  decorators: [withNetwork(Network.Testnet)],
  args: {
    status: "committed",
    txHash: MOCK_TX_HASH,
    blockNumber: 11482031n,
    onRetry: () => {},
  },
};

export const CommittedMainnet: Story = {
  name: "Committed (mainnet)",
  decorators: [withNetwork(Network.Mainnet)],
  args: {
    status: "committed",
    txHash: MOCK_TX_HASH,
    blockNumber: 11482031n,
    onRetry: () => {},
  },
};

export const CommittedDevnet: Story = {
  name: "Committed (devnet — no explorer link)",
  decorators: [withNetwork(Network.Devnet)],
  args: {
    status: "committed",
    txHash: MOCK_TX_HASH,
    blockNumber: 11482031n,
    onRetry: () => {},
  },
};

export const Rejected: Story = {
  args: {
    status: "rejected",
    error: "ValidationFailure[-31]",
    onRetry: () => {},
  },
};

export const Error: Story = {
  args: {
    status: "error",
    error: "Wallet rejected the transaction",
    onRetry: () => {},
  },
};
