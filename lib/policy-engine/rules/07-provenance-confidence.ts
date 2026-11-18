import type { ProvenanceField } from "../../types.ts";
import type { Violation } from "../types.ts";

const CRITICAL_FIELDS = ["ticker", "amountUSD", "actionType"] as const;

/**
 * Fail-closed provenance check: every critical field must be present AND
 * carry at least medium confidence. Missing metadata is treated as a block.
 */
export function checkProvenance(
  provenance?: Record<string, ProvenanceField>
): Violation[] {
  const violations: Violation[] = [];

  if (!provenance) {
    return CRITICAL_FIELDS.map((field) => ({
      rule: "PROVENANCE_MISSING",
      message: `Critical field "${field}" has no provenance metadata.`,
    }));
  }

  for (const field of CRITICAL_FIELDS) {
    const entry: ProvenanceField | undefined = provenance[field];
    if (!entry) {
      violations.push({
        rule: "PROVENANCE_MISSING",
        message: `Critical field "${field}" has no provenance metadata.`,
      });
    } else if (!entry.source || entry.source.trim() === "") {
      violations.push({
        rule: "PROVENANCE_MISSING",
        message: `Critical field "${field}" provenance has no source.`,
      });
    } else if (entry.confidence === "low") {
      violations.push({
        rule: "PROVENANCE_LOW",
        message: `Field "${field}" has low provenance confidence (source: ${entry.source}).`,
      });
    } else if (!["high", "medium", "low"].includes(entry.confidence)) {
      violations.push({
        rule: "PROVENANCE_INVALID",
        message: `Field "${field}" has invalid confidence value "${String(entry.confidence)}".`,
      });
    }
  }

  return violations;
}
