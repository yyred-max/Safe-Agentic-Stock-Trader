import type { Policy } from "../types.ts";

export const DEFAULT_POLICY: Policy = {
  maxPositionSizeUSD: 50,
  allowedTickers: ["NVDA", "TSLA", "AAPL"],
  allowedDirection: "LONG",
  maxLossPerTradeUSD: 10,
};
