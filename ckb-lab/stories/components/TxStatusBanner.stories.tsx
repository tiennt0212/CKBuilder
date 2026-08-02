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

/** No `decoded` — the pre-decoder path, kept as the check that omitting the prop still works. */
export const Rejected: Story = {
  args: {
    status: "rejected",
    error: "ValidationFailure[-31]",
    onRetry: () => {},
  },
};

/** No `decoded` — same reason as Rejected above. */
export const Error: Story = {
  args: {
    status: "error",
    error: "Wallet rejected the transaction",
    onRetry: () => {},
  },
};

const COUNTER_REJECTION_RAW =
  "TransactionFailedToVerify: Verification(Error { kind: Script, inner: TransactionScriptError " +
  "{ source: Outputs[0].Type, cause: ValidationFailure: see error code 8 on page " +
  "https://nervosnetwork.github.io/ckb-script-error-codes/by-type-hash/" +
  "0x00000000000000000000000000000000000000000000000000545950455f4944.html for more details })";

/**
 * /counter's case: the page knows which contract ran, so the exit code gets a meaning from
 * COUNTER_EXIT_CODES rather than being left as a bare number.
 */
export const RejectedScriptExitCode: Story = {
  name: "Rejected (decoded — script exit code)",
  args: {
    status: "rejected",
    error: COUNTER_REJECTION_RAW,
    onRetry: () => {},
    decoded: {
      kind: "scriptRejected",
      raw: COUNTER_REJECTION_RAW,
      title: "Script rejected the transaction",
      cause:
        "The counter script returned exit code 8: the output counter must be exactly the input " +
        "counter plus 1. It ran as the type script of output 0.",
      exitCode: 8,
      exitCodeMeaning: "the output counter must be exactly the input counter plus 1",
      scriptSource: "outputType",
      scriptIndex: 0,
      referenceUrl:
        "https://nervosnetwork.github.io/ckb-script-error-codes/by-type-hash/" +
        "0x00000000000000000000000000000000000000000000000000545950455f4944.html",
    },
  },
};

const SCRIPT_NOT_FOUND_RAW =
  "TransactionFailedToVerify: Verification(Error { kind: Script, inner: TransactionScriptError " +
  "{ source: Outputs[0].Type, cause: ScriptNotFound })";

/**
 * The hash_type / Type-ID trap from gotchas.md — no exit code, because the script never ran.
 * This is the state the decoder exists for: the raw string names neither the cause nor the fix.
 */
export const ErrorScriptNotFound: Story = {
  name: "Error (decoded — script not found)",
  args: {
    status: "error",
    error: SCRIPT_NOT_FOUND_RAW,
    onRetry: () => {},
    decoded: {
      kind: "scriptNotFound",
      raw: SCRIPT_NOT_FOUND_RAW,
      title: "Script not found",
      cause:
        "The node could not resolve this code_hash + hash_type pair to a binary. A script is " +
        "identified by blake2b(code_hash ‖ hash_type ‖ args), so the two are one decision: a " +
        "plain data cell can only be referenced by its data hash (data1/data2), and a Type ID " +
        "cell by type. The impossible pair is accepted at deploy time and only fails here, at " +
        "broadcast.",
      nextStep:
        "Check the hash_type on the registry entry against how the cell was actually deployed — " +
        'a data hash with hash_type "type" can never resolve.',
    },
  },
};
