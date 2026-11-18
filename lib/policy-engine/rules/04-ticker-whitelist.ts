import type { Intent, Policy, StructuredAction } from "../../types.ts";
import type { Violation } from "../types.ts";

export function checkTickerWhitelist(
  _intent: Intent,
  action: StructuredAction,
  policy: Policy
): Violation[] {
  const violations: Violation[] = [];

  const normalizedTicker = action.ticker ? action.ticker.trim().toUpperCase() : "";
  const allowed = policy.allowedTickers.map((t) => t.trim().toUpperCase());

  if (!allowed.includes(normalizedTicker)) {
    violations.push({
      rule: "TICKER_WHITELIST",
      message: `Ticker "${action.ticker}" is not in the allowed list: [${policy.allowedTickers.join(", ")}].`,
    });
  }

  return violations;
}
