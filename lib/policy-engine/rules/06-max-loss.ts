import type { Intent, Policy, StructuredAction } from "../../types.ts";
import type { Violation } from "../types.ts";

export function checkMaxLoss(
  _intent: Intent,
  action: StructuredAction,
  policy: Policy
): Violation[] {
  const violations: Violation[] = [];

  if (action.maxLoss != null && action.maxLoss > policy.maxLossPerTradeUSD) {
    violations.push({
      rule: "MAX_LOSS",
      message: `Action max loss $${action.maxLoss} exceeds allowed max loss per trade of $${policy.maxLossPerTradeUSD}.`,
    });
  }

  return violations;
}
