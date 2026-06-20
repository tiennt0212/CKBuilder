"use client";

import { useEffect, useState } from "react";
import { Button, Dropdown } from "antd";
import { DownOutlined, PoweroffOutlined, SwapOutlined } from "@ant-design/icons";
import { useCcc, useSigner } from "@ckb-ccc/connector-react";
import { truncateAddress } from "@/lib/format";
import { CopyText } from "./ui/CopyText";

export function WalletButton() {
  const { open, disconnect, wallet } = useCcc();
  const signer = useSigner();

  const [hasMounted, setHasMounted] = useState(false);
  const [address, setAddress] = useState<string | undefined>(undefined);
  const [dropOpen, setDropOpen] = useState(false);

  useEffect(() => {
    if (!signer) {
      setAddress(undefined);
      setHasMounted(true);
      return;
    }
    signer
      .getRecommendedAddress()
      .then(setAddress)
      .catch(() => setAddress(undefined))
      .finally(() => setHasMounted(true));
  }, [signer]);

  const isConnected = !!signer;
  const isLoadingAddress = isConnected && !address;
  const truncated = address ? truncateAddress(address) : undefined;

  // TODO: add CKB balance display — requires cccClient.getBalance(address) call with async loading state

  const panel = (
    <div
      className="bg-bg-elev border border-border-2 shadow-app py-2 min-w-[260px]"
      style={{ borderRadius: 12 }}
    >
      <div className="px-4 pb-3 border-b border-app-border">
        {wallet?.name && (
          <span className="inline-block px-1.5 py-0.5 rounded bg-primary-tint text-primary text-micro font-medium mb-2">
            {wallet.name}
          </span>
        )}
        <CopyText
          text={address}
          display={truncated}
          className="mb-1"
          textClassName="font-mono text-[12px] text-text-2 truncate flex-1 min-w-0"
        />
        <span className="text-micro text-text-3">Balance: —</span>
      </div>

      <div className="pt-1.5">
        <Button
          type="text"
          icon={<SwapOutlined style={{ fontSize: 13 }} />}
          onClick={() => { setDropOpen(false); open(); }}
          className="w-full! justify-start! px-4! py-2! h-auto! rounded-none! text-body! text-text-1! hover:bg-hover-overlay!"
        >
          Switch wallet
        </Button>
        <Button
          type="text"
          icon={<PoweroffOutlined style={{ fontSize: 13 }} />}
          onClick={() => { setDropOpen(false); disconnect(); }}
          className="w-full! justify-start! px-4! py-2! h-auto! rounded-none! text-body! text-rust! hover:bg-rust-tint! hover:text-rust!"
        >
          Disconnect
        </Button>
      </div>
    </div>
  );

  if (!hasMounted) {
    return (
      <div
        className="rounded-[10px] bg-text-3/10 animate-pulse"
        style={{ height: 38, width: 130 }}
      />
    );
  }

  if (!isConnected) {
    return (
      <Button
        type="primary"
        onClick={() => open()}
        style={{ height: 38, borderRadius: 10, paddingInline: 16 }}
      >
        Connect Wallet
      </Button>
    );
  }

  return (
    <Dropdown
      open={dropOpen}
      onOpenChange={setDropOpen}
      popupRender={() => panel}
      trigger={["click"]}
      placement="bottomRight"
    >
      <button
        className={[
          "flex items-center gap-2 px-3 py-1 rounded-[10px] border transition-colors",
          dropOpen
            ? "border-primary"
            : "border-input-border hover:border-primary",
        ].join(" ")}
        style={{ height: 38 }}
      >
        {wallet?.name && (
          <span className="px-1.5 py-0.5 rounded bg-primary-tint text-primary text-micro font-medium">
            {wallet.name}
          </span>
        )}
        {isLoadingAddress ? (
          <span className="inline-block w-14 h-2.5 rounded bg-text-3/20 animate-pulse" />
        ) : (
          <span className="font-mono text-[12px] text-text-2 max-w-[120px] truncate">
            {truncated}
          </span>
        )}
        <DownOutlined
          style={{
            fontSize: 10,
            color: "var(--text-3)",
            transition: "transform 0.2s",
            transform: dropOpen ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>
    </Dropdown>
  );
}
