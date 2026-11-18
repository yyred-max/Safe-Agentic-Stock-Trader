import type { Intent, Policy, StructuredAction } from "../../types.ts";
import type { Violation } from "../types.ts";

export function checkSchema(
  _intent: Intent,
  action: StructuredAction,
  _policy: Policy
): Violation[] {
  const violations: Violation[] = [];
  void _policy; // kept for the uniform rule signature

  if (!action || typeof action !== "object") {
    return [{ rule: "SCHEMA", message: "No structured action was produced." }];
  }

  if (action.actionType !== "BUY" && action.actionType !== "SELL") {
    violations.push({
      rule: "SCHEMA",
      message: `Invalid actionType: "${String(action.actionType)}". Must be "BUY" or "SELL".`,
    });
  }

  if (!action.ticker || typeof action.ticker !== "string" || action.ticker.trim() === "") {
    violations.push({
      rule: "SCHEMA",
      message: "Ticker must not be empty.",
    });
  }

  if (typeof action.amountUSD !== "number" || !Number.isFinite(action.amountUSD) || action.amountUSD <= 0) {
    violations.push({
      rule: "SCHEMA",
      message: `Invalid amountUSD: ${String(action.amountUSD)}. Must be a finite number greater than 0.`,
    });
  }

  if (action.orderType !== "MARKET" && action.orderType !== "LIMIT") {
    violations.push({
      rule: "SCHEMA",
      message: `Invalid orderType: "${String(action.orderType)}". Must be "MARKET" or "LIMIT".`,
    });
  }

  if (action.limitPrice != null && (typeof action.limitPrice !== "number" || !Number.isFinite(action.limitPrice) || action.limitPrice <= 0)) {
    violations.push({ rule: "SCHEMA", message: "limitPrice must be a positive finite number when present." });
  }

  if (action.maxLoss != null && (typeof action.maxLoss !== "number" || !Number.isFinite(action.maxLoss) || action.maxLoss <= 0)) {
    violations.push({ rule: "SCHEMA", message: "maxLoss must be a positive finite number when present." });
  }

  if (action.orderType === "LIMIT" && action.limitPrice == null) {
    violations.push({ rule: "SCHEMA", message: "LIMIT orders require a limitPrice." });
  }

  if (typeof action.reasoning !== "string" || action.reasoning.trim() === "") {
    violations.push({ rule: "SCHEMA", message: "Action must include non-empty reasoning." });
  }

  return violations;
}
