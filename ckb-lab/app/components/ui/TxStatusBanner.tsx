"use client";

import { TxStatus } from "@/lib/ckb/tx-status";
import type { DecodedTxError } from "@/lib/ckb/tx-error";
import { Network } from "@/lib";
import { useNetworkStore } from "@/stores/network";
import { CheckOutlined, ExclamationCircleOutlined, LoadingOutlined } from "@ant-design/icons";
import { Button, Collapse, Spin } from "antd";

export interface TxStatusBannerProps {
  status: TxStatus;
  txHash?: string | null;
  blockNumber?: bigint | null;
  error?: string | null;
  /**
   * The decoded form of `error`, when the caller ran it through `decodeTxError`. Drives the
   * rejected/error copy and moves the node's raw message into a collapsed panel. Omitting it
   * falls back to showing `error` inline, which is what every page did before the decoder.
   */
  decoded?: DecodedTxError | null;
  onRetry?: () => void;
  /** Label for the retry/reset button shown in committed and rejected states. Defaults to "← Retry". */
  retryLabel?: string;
}

const HIDDEN: TxStatus[] = [TxStatus.Idle, TxStatus.Building, TxStatus.Signing];

/** The two statuses a decoded error belongs to — a stale `decoded` must not leak into a retry. */
const FAILED: TxStatus[] = [TxStatus.Rejected, TxStatus.Error];

type BannerVariant = "amber" | "primary" | "green" | "rust";

const VARIANTS: Record<
  BannerVariant,
  { border: string; bg: string; iconBg: string; iconColor: string }
> = {
  amber: {
    border: "var(--banner-pend-border)",
    bg: "var(--status-pend-bg)",
    iconBg: "var(--banner-pend-icon-bg)",
    iconColor: "var(--status-pend)",
  },
  primary: {
    border: "var(--banner-primary-border)",
    bg: "var(--banner-primary-bg)",
    iconBg: "var(--banner-primary-icon-bg)",
    iconColor: "var(--primary)",
  },
  green: {
    border: "var(--banner-primary-border)",
    bg: "var(--primary-tint)",
    iconBg: "var(--banner-green-icon-bg)",
    iconColor: "var(--primary)",
  },
  rust: {
    border: "var(--banner-rust-border)",
    bg: "var(--rust-tint)",
    iconBg: "var(--banner-rust-icon-bg)",
    iconColor: "var(--rust)",
  },
};

function Spinner({ color }: { color: string }) {
  return <Spin indicator={<LoadingOutlined style={{ fontSize: 20, color }} spin />} />;
}

function PendingBadge() {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{ color: "var(--status-pend)", background: "var(--status-pend-bg)" }}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      Pending
    </span>
  );
}

function RetryButton({ onClick, label = "← Retry" }: { onClick: () => void; label?: string }) {
  return (
    <Button
      type="text"
      size="small"
      onClick={onClick}
      className="text-xs! font-semibold! px-3! py-1.5! h-auto! rounded-lg! border! border-app-border! text-text-2! hover:border-primary! hover:text-primary!"
    >
      {label}
    </Button>
  );
}

/**
 * The decoded cause, plus the exit code when the script gave one.
 *
 * The exit code is rendered as its own chip rather than folded into the sentence because it is
 * the one value a developer will carry back to their contract's source — `cause` already names
 * that the number is contract-defined.
 */
function DecodedCause({ decoded }: { decoded: DecodedTxError }) {
  // Rendered inside the banner's existing subtitle wrapper, which supplies `text-hint text-text-3`.
  return (
    <>
      <div>
        {decoded.exitCode !== undefined && (
          <span
            className="inline-flex items-center font-mono font-semibold px-1.5 py-0.5 rounded-md mr-1.5"
            style={{ color: "var(--rust)", background: "var(--banner-rust-icon-bg)" }}
          >
            exit {decoded.exitCode}
          </span>
        )}
        {decoded.cause}
      </div>
      {decoded.nextStep && (
        <div className="text-text-2 mt-1">
          <span className="font-semibold">Next:</span> {decoded.nextStep}
        </div>
      )}
    </>
  );
}

/**
 * The node's verbatim message, collapsed. The decoder augments that message and never replaces
 * it, so it has to stay reachable — a decoded cause the reader cannot check against the source
 * string is worse than the raw string alone.
 */
function RawNodeMessage({ decoded }: { decoded: DecodedTxError }) {
  return (
    <Collapse
      ghost
      items={[
        {
          key: "raw",
          label: (
            <span style={{ fontSize: 12.5, fontWeight: 550, color: "var(--text-2)" }}>
              Node message
            </span>
          ),
          children: (
            <div className="rounded-[10px] bg-code-bg border border-app-border p-3.5">
              <pre className="text-hint text-code-text font-mono leading-[1.65] m-0 overflow-x-auto whitespace-pre-wrap break-all">
                {decoded.raw}
              </pre>
              {decoded.referenceUrl && (
                <a
                  href={decoded.referenceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-hint text-primary mt-2.5"
                >
                  Script error codes for this script ↗
                </a>
              )}
            </div>
          ),
          styles: { header: { padding: "0 0 10px 0" }, body: { padding: 0 } },
        },
      ]}
    />
  );
}

type BannerConfig = {
  variant: BannerVariant;
  icon: React.ReactNode;
  title: string;
  subtitle: React.ReactNode;
  action?: React.ReactNode;
};

export function TxStatusBanner({
  status,
  txHash,
  blockNumber,
  error,
  decoded,
  onRetry,
  retryLabel = "← Retry",
}: TxStatusBannerProps) {
  const { network } = useNetworkStore();

  if (HIDDEN.includes(status)) return null;

  const explorerBase =
    network === Network.Mainnet
      ? "https://explorer.nervos.org/transaction"
      : network === Network.Testnet
        ? "https://testnet.explorer.nervos.org/transaction"
        : null; // devnet — no public explorer

  const shortHash = txHash ? `${txHash.slice(0, 10)}…${txHash.slice(-4)}` : null;

  const configs: Partial<Record<TxStatus, BannerConfig>> = {
    sending: {
      variant: "amber",
      icon: <Spinner color="var(--status-pend)" />,
      title: "Submitting transaction…",
      subtitle: "Sending to CKB node",
    },
    sent: {
      variant: "amber",
      icon: <Spinner color="var(--status-pend)" />,
      title: "Submitted — broadcasting",
      subtitle: shortHash ? (
        <>
          <span className="font-mono text-text-2">{shortHash}</span> · propagating to peers
        </>
      ) : (
        "Propagating to peers"
      ),
      action: <PendingBadge />,
    },
    pending: {
      variant: "amber",
      icon: <Spinner color="var(--status-pend)" />,
      title: "Pending",
      subtitle: "In mempool · awaiting block inclusion",
      action: <PendingBadge />,
    },
    proposed: {
      variant: "primary",
      icon: <Spinner color="var(--primary)" />,
      title: "Proposed",
      subtitle: "Included in block proposal · confirming in ~2 blocks",
      action: (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full text-primary bg-primary-tint">
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          Proposed
        </span>
      ),
    },
    committed: {
      variant: "green",
      icon: <CheckOutlined style={{ fontSize: 20, color: "var(--primary)" }} />,
      title: "Transaction confirmed ✓",
      subtitle:
        blockNumber != null ? (
          <>
            Committed in block{" "}
            <span className="font-mono">#{Number(blockNumber).toLocaleString()}</span>
          </>
        ) : (
          "Committed on-chain"
        ),
      action: (
        <>
          {txHash && explorerBase && (
            <a
              href={`${explorerBase}/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-app-border text-text-2 hover:border-primary hover:text-primary transition-colors no-underline"
            >
              Explorer ↗
            </a>
          )}
          {onRetry && <RetryButton onClick={onRetry} label={retryLabel} />}
        </>
      ),
    },
    rejected: {
      variant: "rust",
      icon: <ExclamationCircleOutlined style={{ fontSize: 20, color: "var(--rust)" }} />,
      title: decoded?.title ?? "Transaction failed",
      subtitle: decoded ? (
        <DecodedCause decoded={decoded} />
      ) : error ? (
        <>
          Rejected by node · <span className="font-mono">{error}</span>
        </>
      ) : (
        "Rejected by node"
      ),
      action: onRetry ? <RetryButton onClick={onRetry} /> : undefined,
    },
    error: {
      variant: "rust",
      icon: <ExclamationCircleOutlined style={{ fontSize: 20, color: "var(--rust)" }} />,
      title: decoded?.title ?? "Error",
      subtitle: decoded ? <DecodedCause decoded={decoded} /> : (error ?? "Something went wrong"),
      action: onRetry ? <RetryButton onClick={onRetry} /> : undefined,
    },
  };

  const cfg = configs[status];
  if (!cfg) return null;

  const v = VARIANTS[cfg.variant];

  return (
    <div
      className="p-3.5 rounded-xl border mb-[18px]"
      style={{ background: v.bg, borderColor: v.border }}
    >
      <div className="flex items-center gap-3.5">
        <div
          className="w-[38px] h-[38px] rounded-[11px] grid place-items-center flex-shrink-0"
          style={{ background: v.iconBg }}
        >
          {cfg.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-body font-semibold text-text-1">{cfg.title}</div>
          <div className="text-hint text-text-3 mt-0.5">{cfg.subtitle}</div>
        </div>
        {cfg.action && <div className="flex items-center gap-1.5 flex-shrink-0">{cfg.action}</div>}
      </div>
      {decoded && FAILED.includes(status) && (
        <div className="mt-2.5">
          <RawNodeMessage decoded={decoded} />
        </div>
      )}
    </div>
  );
}
