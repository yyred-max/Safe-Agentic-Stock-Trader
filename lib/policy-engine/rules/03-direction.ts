import type { Intent, Policy, StructuredAction } from "../../types.ts";
import type { Violation } from "../types.ts";

export function checkDirection(
  _intent: Intent,
  action: StructuredAction,
  policy: Policy
): Violation[] {
  const violations: Violation[] = [];

  if (policy.allowedDirection === "LONG" && action.actionType === "SELL") {
    violations.push({
      rule: "DIRECTION",
      message: `Policy allows only LONG positions, but proposed action is ${action.actionType}.`,
    });
  } else if (policy.allowedDirection === "SHORT" && action.actionType === "BUY") {
    violations.push({
      rule: "DIRECTION",
      message: `Policy allows only SHORT positions, but proposed action is ${action.actionType}.`,
    });
  }

  return violations;
}
