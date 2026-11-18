import { createHash, randomBytes } from "node:crypto";

/**
 * Deterministic-looking, unique, human-readable decision identifier.
 * Format: dec_<timestamp-base36>_<random hex>
 */
export function createDecisionId(): string {
  const time = Date.now().toString(36);
  const random = randomBytes(6).toString("hex");
  return `dec_${time}_${random}`;
}

/** Stable id for an intent object. */
export function createIntentId(rawText: string): string {
  const digest = createHash("sha256").update(rawText).digest("hex").slice(0, 10);
  return `int_${digest}`;
}

/** Simulated transaction hash for Demo Mode only (never used for live execution). */
export function createSimulatedTxHash(): string {
  return `0xsim${randomBytes(28).toString("hex")}`;
}
