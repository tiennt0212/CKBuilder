import {
  SwapOutlined,
  SearchOutlined,
  GoldOutlined,
  CodeOutlined,
  CloudUploadOutlined,
  BankOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  HistoryOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { Tag } from "antd";
import type { MenuProps } from "antd";
import { ROUTES } from "./routes";

const TAG_XUDT = (
  <Tag className="border-0 bg-primary-tint text-primary text-2xs font-semibold tracking-[0.02em] m-0!">
    xUDT
  </Tag>
);

const TAG_RUST = (
  <Tag className="border-0 bg-rust-tint text-rust text-2xs font-semibold tracking-[0.02em] m-0!">
    Rust
  </Tag>
);

function navLabel(href: string, children: React.ReactNode) {
  return (
    <Link href={href} className="text-inherit!">
      {children}
    </Link>
  );
}

export const NAV_ITEMS: MenuProps["items"] = [
  {
    type: "group",
    label: "Wallet",
    children: [
      {
        key: ROUTES.TRANSFER,
        icon: <SwapOutlined />,
        label: navLabel(ROUTES.TRANSFER, "Transfer CKB"),
      },
      {
        key: ROUTES.CELL_EXPLORER,
        icon: <SearchOutlined />,
        label: navLabel(ROUTES.CELL_EXPLORER, "Cell Explorer"),
      },
      {
        key: ROUTES.TOKENS,
        icon: <GoldOutlined />,
        label: navLabel(
          ROUTES.TOKENS,
          <span className="flex items-center gap-2">Tokens {TAG_XUDT}</span>
        ),
      },
    ],
  },
  {
    type: "group",
    label: "Smart Contracts",
    children: [
      {
        key: ROUTES.INVOKE,
        icon: <CodeOutlined />,
        label: navLabel(ROUTES.INVOKE, "Invoke Script"),
      },
      {
        key: ROUTES.DEPLOY,
        icon: <CloudUploadOutlined />,
        label: navLabel(
          ROUTES.DEPLOY,
          <span className="flex items-center gap-2">Deploy Script {TAG_RUST}</span>
        ),
      },
    ],
  },
  {
    type: "group",
    label: "Advanced",
    children: [
      {
        key: ROUTES.DAO,
        icon: <BankOutlined />,
        label: navLabel(ROUTES.DAO, "Nervos DAO"),
      },
      {
        key: ROUTES.TIME_LOCK,
        icon: <ClockCircleOutlined />,
        label: navLabel(ROUTES.TIME_LOCK, "Time Lock"),
      },
      {
        key: ROUTES.MULTISIG,
        icon: <TeamOutlined />,
        label: navLabel(ROUTES.MULTISIG, "Multisig"),
      },
    ],
  },
  {
    type: "group",
    label: "Activity",
    children: [
      {
        key: ROUTES.HISTORY,
        icon: <HistoryOutlined />,
        label: navLabel(ROUTES.HISTORY, "Transaction History"),
      },
    ],
  },
];
