import { formatCapacity } from "@/lib";
import { CheckCircleFilled, CloseCircleFilled } from "@ant-design/icons";

interface CapacityInfoPanelProps {
  /** Total CKB required (cell capacity + fee) in shannons. Null until a preview build completes. */
  required: bigint | null;
  /** Current wallet balance in shannons. Null / undefined when wallet is disconnected. */
  balance: bigint | null | undefined;
}

type BalanceState = "idle" | "sufficient" | "insufficient";

function getBalanceState(
  required: bigint | null,
  balance: bigint | null | undefined
): BalanceState {
  if (required == null || balance == null) return "idle";
  return balance >= required ? "sufficient" : "insufficient";
}

/**
 * Displays the total CKB required for a deploy (capacity + fee) alongside a
 * green / red balance-sufficiency chip once a preview build has completed.
 * Renders a neutral placeholder row until `required` is known.
 */
export function CapacityInfoPanel({ required, balance }: CapacityInfoPanelProps) {
  const state = getBalanceState(required, balance);

  return (
    <div className="flex items-center justify-between gap-3 px-3.5 py-3 rounded-[10px] border border-app-border bg-panel-bg">
      <div>
        <div className="text-hint text-text-3 mb-0.5">Required capacity</div>
        <div className="text-numeral font-semibold text-text-1 tabular-nums">
          {required != null ? (
            <>{formatCapacity(required)} CKB</>
          ) : (
            <span className="text-text-3">— CKB</span>
          )}
        </div>
      </div>

      {state === "sufficient" && (
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-hint font-semibold text-primary bg-primary-tint">
          <CheckCircleFilled style={{ fontSize: 12 }} />
          Sufficient
        </span>
      )}

      {state === "insufficient" && (
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-hint font-semibold text-rust bg-rust-tint">
          <CloseCircleFilled style={{ fontSize: 12 }} />
          Insufficient
        </span>
      )}
    </div>
  );
}
