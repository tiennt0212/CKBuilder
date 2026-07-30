export const ROUTES = {
  TRANSFER: "/transfer",
  CELL_EXPLORER: "/cell-explorer",
  TOKENS: "/tokens",
  INVOKE: "/invoke",
  DEPLOY: "/deploy",
  REGISTRY: "/registry",
  COUNTER: "/counter",
  DAO: "/dao",
  TIME_LOCK: "/time-lock",
  MULTISIG: "/multisig",
  HISTORY: "/history",
} as const;

export type Route = (typeof ROUTES)[keyof typeof ROUTES];

export const PAGE_TITLES: Record<Route, { group: string; title: string }> = {
  [ROUTES.TRANSFER]: { group: "Wallet", title: "Transfer CKB" },
  [ROUTES.CELL_EXPLORER]: { group: "Wallet", title: "Cell Explorer" },
  [ROUTES.TOKENS]: { group: "Wallet", title: "Tokens" },
  [ROUTES.INVOKE]: { group: "Smart Contracts", title: "Invoke Script" },
  [ROUTES.DEPLOY]: { group: "Smart Contracts", title: "Deploy Script" },
  [ROUTES.REGISTRY]: { group: "Smart Contracts", title: "Script Registry" },
  [ROUTES.COUNTER]: { group: "Smart Contracts", title: "Counter" },
  [ROUTES.DAO]: { group: "Advanced", title: "Nervos DAO" },
  [ROUTES.TIME_LOCK]: { group: "Advanced", title: "Time Lock" },
  [ROUTES.MULTISIG]: { group: "Advanced", title: "Multisig" },
  [ROUTES.HISTORY]: { group: "Activity", title: "Transaction History" },
};
