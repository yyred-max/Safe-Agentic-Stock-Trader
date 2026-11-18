import type { Decision, Intent, Policy, ProvenanceField, StructuredAction } from "../types.ts";
import type { Violation } from "./types.ts";
import { createDecisionId } from "../decision/id.ts";
import { checkSchema } from "./rules/01-schema-check.ts";
import { checkIntentConsistency } from "./rules/02-intent-consistency.ts";
import { checkDirection } from "./rules/03-direction.ts";
import { checkTickerWhitelist } from "./rules/04-ticker-whitelist.ts";
import { checkMaxPositionSize } from "./rules/05-max-position-size.ts";
import { checkMaxLoss } from "./rules/06-max-loss.ts";
import { checkProvenance } from "./rules/07-provenance-confidence.ts";

export function evaluate(
  intent: Intent,
  action: StructuredAction,
  policy: Policy,
  provenance: Record<string, ProvenanceField> = {}
): Decision {
  const violations: Violation[] = [];

  try {
    // Evaluated in the PRD-mandated order. Hard rules accumulate so the UI can
    // show every reason, but the status stays BLOCK if any rule fires.
    violations.push(...checkSchema(intent, action, policy));
    violations.push(...checkIntentConsistency(intent, action));
    violations.push(...checkDirection(intent, action, policy));
    violations.push(...checkTickerWhitelist(intent, action, policy));
    violations.push(...checkMaxPositionSize(intent, action, policy));
    violations.push(...checkMaxLoss(intent, action, policy));
    violations.push(...checkProvenance(provenance));
  } catch (error) {
    // Fail-closed: any unexpected evaluation error is a block.
    violations.push({
      rule: "ENGINE_ERROR",
      message: `Verification could not complete safely: ${error instanceof Error ? error.message : String(error)}`,
    });
  }

  const isAllowed = violations.length === 0;

  return {
    decisionId: createDecisionId(),
    status: isAllowed ? "ALLOW" : "BLOCK",
    reasons: violations.map((v) => v.message),
    policyViolations: violations.map((v) => v.rule),
    provenance,
    intent,
    action,
    createdAt: new Date().toISOString(),
  };
}
