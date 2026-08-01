"use client";

import { NoteBox } from "@/components/ui/NoteBox";
import { FormItem } from "@/components/ui/FormItem";
import { TokenListItem } from "@/components/ui/TokenListItem";
import { TOKEN_ACTION_META, TokenAction } from "@/features/tokens/token-action";
import type { UdtBalance } from "@/features/tokens/useUdtBalances";
import { formatCapacity, shannonToCKB, truncateAddress, type Network } from "@/lib";
import { ArrowRightOutlined, CopyOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { Button, Card, Empty, Form, Input, InputNumber, Segmented, Skeleton } from "antd";
import type { FormInstance } from "antd/es/form";

const FEE_RATES = [
  { value: 1000, name: "Slow", sub: "1,000 sh/KB" },
  { value: 2000, name: "Standard", sub: "2,000 sh/KB" },
  { value: 5000, name: "Fast", sub: "5,000 sh/KB" },
];

const CARD_STYLE = {
  borderRadius: 12,
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow)",
};
const HEAD_STYLE = { padding: "16px 18px", borderBottom: "1px solid var(--border)" };
const BODY_STYLE = { padding: "18px" };

interface TokensInputCardProps {
  form: FormInstance;
  action: TokenAction;
  onActionChange: (action: TokenAction) => void;
  balances: UdtBalance[];
  balancesLoading: boolean;
  /** args of the selected token; null in Issue mode, where the token may not exist yet. */
  selectedArgs: string | null;
  onSelectToken: (args: string) => void;
  addressPlaceholder: string;
  network: Network;
  /**
   * Occupied capacity of the token cell the last preview built, or null before the first build.
   * Never assume a constant: it is derived from the recipient's lock, so an OmniLock wallet
   * (22-byte args) costs 148 CKB where a secp256k1 one (20-byte args) costs 146.
   */
  udtCellCapacity: bigint | null;
  isInProgress: boolean;
  onValuesChange: (changedValues: unknown, allValues: Record<string, unknown>) => void;
  onFinish: (values: Record<string, unknown>) => void;
}

export function TokensInputCard({
  form,
  action,
  onActionChange,
  balances,
  balancesLoading,
  selectedArgs,
  onSelectToken,
  addressPlaceholder,
  network,
  udtCellCapacity,
  isInProgress,
  onValuesChange,
  onFinish,
}: TokensInputCardProps) {
  const isIssue = action === TokenAction.Issue;
  const selected = balances.find((b) => b.args === selectedArgs) ?? null;
  const meta = TOKEN_ACTION_META[action];

  return (
    <Card
      title={
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-subhead font-semibold text-text-1">Token holdings</div>
            <div className="text-hint text-text-3 font-normal">
              {balancesLoading
                ? "Reading cells…"
                : `${balances.length} xUDT ${balances.length === 1 ? "token" : "tokens"} on ${network}`}
            </div>
          </div>
          <Button
            type="text"
            size="small"
            icon={<ThunderboltOutlined />}
            onClick={() => onActionChange(TokenAction.Issue)}
            disabled={isInProgress}
            className="text-text-3! hover:text-primary! px-2!"
          >
            Issue
          </Button>
        </div>
      }
      style={CARD_STYLE}
      styles={{ header: HEAD_STYLE, body: BODY_STYLE }}
    >
      <div className="flex flex-col mb-4">
        {balancesLoading && balances.length === 0 ? (
          <Skeleton active paragraph={{ rows: 2 }} title={false} />
        ) : balances.length === 0 ? (
          <div className="py-6">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={`No xUDT cells under this wallet on ${network}`}
            />
          </div>
        ) : (
          balances.map((b) => (
            <TokenListItem
              key={b.args}
              // xUDT carries no symbol on chain — a token's only identity is its type args, so
              // the tile shows the leading bytes of the issuer's lock hash rather than inventing
              // a ticker. A real symbol would need a metadata registry, which is its own feature.
              symbol={b.ownerLockHash.slice(2, 5)}
              name={b.isIssuer ? "Your token" : "xUDT token"}
              type={`xUDT · ${truncateAddress(b.args, 6)}`}
              balance={b.amount.toLocaleString()}
              balanceSub={`${b.cellCount} ${b.cellCount === 1 ? "cell" : "cells"} · ≈${formatCapacity(b.capacity)} CKB locked`}
              selected={b.args === selectedArgs}
              onClick={() => onSelectToken(b.args)}
            />
          ))
        )}
      </div>

      <Segmented
        block
        value={action}
        onChange={(v) => onActionChange(v as TokenAction)}
        disabled={isInProgress}
        options={[
          { value: TokenAction.Issue, label: "Issue" },
          // Nothing to transfer until the wallet holds a token, so the mode is unreachable
          // rather than reachable-but-broken.
          { value: TokenAction.Transfer, label: "Transfer", disabled: balances.length === 0 },
        ]}
        style={{ background: "var(--seg-bg)", marginBottom: 16 }}
      />

      <div className="mb-3">
        <div className="text-body font-semibold text-text-1">{meta.title}</div>
        <div className="text-hint text-text-3">{meta.subtitle}</div>
      </div>

      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        colon={false}
        onValuesChange={onValuesChange}
        onFinish={onFinish}
      >
        <FormItem
          name="to"
          label={isIssue ? "Mint To" : "Recipient Address"}
          hint={isIssue ? "Leave empty to mint to yourself" : undefined}
          style={{ marginBottom: 14 }}
          rules={isIssue ? [] : [{ required: true, message: "Please enter the recipient address" }]}
        >
          <Input
            placeholder={addressPlaceholder}
            suffix={
              <CopyOutlined
                className="text-text-3 cursor-pointer hover:text-primary transition-colors"
                onClick={() => {
                  const to = form.getFieldValue("to");
                  if (to) navigator.clipboard.writeText(to);
                }}
              />
            }
            className="font-mono"
            style={{ height: 42 }}
          />
        </FormItem>

        <FormItem
          name="amount"
          label="Amount"
          hint={
            isIssue
              ? "Raw units — xUDT has no decimals"
              : selected
                ? `Balance ${selected.amount.toLocaleString()}`
                : undefined
          }
          style={{ marginBottom: 14 }}
          rules={[
            { required: true, message: "Please enter an amount" },
            {
              validator: (_, value) => {
                if (!value) return Promise.resolve();
                let raw: bigint;
                try {
                  raw = BigInt(value);
                } catch {
                  return Promise.reject(new Error("Amount must be a whole number"));
                }
                if (raw <= 0n) {
                  return Promise.reject(new Error("Amount must be greater than zero"));
                }
                if (!isIssue && selected && raw > selected.amount) {
                  return Promise.reject(
                    new Error(`Amount cannot exceed your balance of ${selected.amount} units`)
                  );
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <InputNumber
            // stringMode is not cosmetic: without it Antd routes the value through a JS number
            // and any amount past 2^53 is silently rounded before it ever reaches the builder.
            stringMode
            precision={0}
            min="1"
            placeholder="0"
            suffix={
              <span className="flex items-center gap-2">
                {!isIssue && selected && (
                  <span
                    className="text-2xs font-semibold px-[5px] py-px rounded bg-primary-tint text-primary cursor-pointer select-none"
                    onClick={() => {
                      form.setFieldValue("amount", selected.amount.toString());
                      onValuesChange(null, form.getFieldsValue());
                    }}
                  >
                    MAX
                  </span>
                )}
                <span className="text-body text-text-2 font-medium">units</span>
              </span>
            }
            style={{ height: 42, fontSize: 20, fontWeight: 600 }}
            className="tabular-nums w-full!"
          />
        </FormItem>

        <div className="mb-4">
          <NoteBox>
            {udtCellCapacity != null ? (
              <>
                This token cell locks up <strong>{shannonToCKB(udtCellCapacity)} CKB</strong> of
                capacity.
              </>
            ) : (
              <>
                A token cell locks up <strong>~142–150 CKB</strong> of capacity — the exact figure
                depends on your wallet&apos;s lock and is shown in the preview.
              </>
            )}{" "}
            It is taken from your CKB balance and returned when the cell is later spent — a deposit,
            not a fee.
          </NoteBox>
        </div>

        <FormItem
          name="feeRate"
          label="Fee Rate"
          style={{ marginBottom: 20 }}
          initialValue={FEE_RATES[0].value}
        >
          <Segmented
            block
            options={FEE_RATES.map((r) => ({
              value: r.value,
              label: (
                <div className="py-1.5">
                  <div className="text-body font-medium">{r.name}</div>
                  <div className="text-2xs text-text-3 tabular-nums">{r.sub}</div>
                </div>
              ),
            }))}
            style={{ background: "var(--seg-bg)" }}
          />
        </FormItem>

        <Button
          type="primary"
          htmlType="submit"
          block
          icon={isInProgress ? undefined : <ArrowRightOutlined />}
          iconPosition="end"
          loading={isInProgress}
          disabled={isInProgress}
          style={{ height: 44 }}
        >
          {isInProgress ? "Processing…" : meta.submit}
        </Button>
      </Form>
    </Card>
  );
}
