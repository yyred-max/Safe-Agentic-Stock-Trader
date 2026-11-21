/**
 * Universal browser-safe and server-safe decision and transaction ID generator.
 * Format: dec_<timestamp-base36>_<random hex>
 */

function getRandomHex(bytes: number): string {
  if (typeof globalThis !== "undefined" && globalThis.crypto?.getRandomValues) {
    const arr = new Uint8Array(bytes);
    globalThis.crypto.getRandomValues(arr);
    return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  return Array.from({ length: bytes }, () =>
    Math.floor(Math.random() * 256).toString(16).padStart(2, "0")
  ).join("");
}

export function createDecisionId(): string {
  const time = Date.now().toString(36);
  const random = getRandomHex(6);
  return `dec_${time}_${random}`;
}

/** Stable id for an intent object. */
export function createIntentId(rawText: string): string {
  let hash = 0;
  for (let i = 0; i < rawText.length; i++) {
    hash = (hash << 5) - hash + rawText.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, "0");
  return `int_${hex}`;
}

/** Simulated transaction hash for Demo Mode only (never used for live execution). */
export function createSimulatedTxHash(): string {
  return `0xsim${getRandomHex(28)}`;
}
