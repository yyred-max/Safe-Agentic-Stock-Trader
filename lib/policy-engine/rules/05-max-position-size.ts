import type { Intent, Policy, StructuredAction } from "../../types.ts";
import type { Violation } from "../types.ts";

export function checkMaxPositionSize(
  _intent: Intent,
  action: StructuredAction,
  policy: Policy
): Violation[] {
  const violations: Violation[] = [];

  if (action.amountUSD > policy.maxPositionSizeUSD) {
    violations.push({
      rule: "MAX_POSITION",
      message: `Action amount $${action.amountUSD} exceeds max position size limit of $${policy.maxPositionSizeUSD}.`,
    });
  }

  return violations;
}
