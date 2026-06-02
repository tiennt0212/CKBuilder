"use client";

interface TokenListItemProps {
  symbol: string;
  name: string;
  type: string;
  balance: string;
  balanceSub?: string;
  selected?: boolean;
  onClick?: () => void;
}

export function TokenListItem({
  symbol,
  name,
  type,
  balance,
  balanceSub,
  selected,
  onClick,
}: TokenListItemProps) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-2.5 py-[13px] rounded-[10px] cursor-pointer border ${
        selected
          ? "bg-primary-tint border-transparent"
          : "border-transparent hover:bg-sidebar-hover"
      }`}
    >
      <div className="w-10 h-10 rounded-[11px] bg-bg-elev border border-border-2 text-primary grid place-items-center font-bold text-[13px] flex-shrink-0">
        {symbol.slice(0, 3)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-body font-semibold text-text-1">{name}</div>
        <div className="text-[11px] text-text-3 mt-px">{type}</div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-[14.5px] font-semibold text-text-1 tabular-nums">{balance}</div>
        {balanceSub && <div className="text-[10.5px] text-text-3 mt-px">{balanceSub}</div>}
      </div>
    </div>
  );
}
