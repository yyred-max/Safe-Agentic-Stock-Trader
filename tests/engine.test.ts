import test from "node:test";
import assert from "node:assert/strict";
import { generateAction } from "../lib/agent/index.ts";
import { evaluate } from "../lib/policy-engine/index.ts";
import { DEFAULT_POLICY } from "../lib/policy-engine/defaults.ts";
import type { DemoScenario, Intent, Policy } from "../lib/types.ts";

const INTENT_TEXT = "Buy $30 of NVDA if under $140, max loss $8";

function intent(rawText: string): Intent {
  return { id: `int_test_${rawText.length}`, rawText, createdAt: new Date().toISOString() };
}

function decide(rawText = INTENT_TEXT, scenario: DemoScenario = "real", policy: Policy = DEFAULT_POLICY) {
  const output = generateAction(rawText, scenario);
  return evaluate(intent(rawText), output.action, policy, output.provenance);
}

test("safe intent with matching action returns ALLOW", () => {
  const d = decide();
  assert.equal(d.status, "ALLOW");
  assert.deepEqual(d.policyViolations, []);
  assert.equal(d.action.ticker, "NVDA");
  assert.equal(d.action.amountUSD, 30);
  assert.match(d.decisionId, /^dec_/);
});

test("wrong direction is blocked by intent consistency and direction policy", () => {
  const d = decide(INTENT_TEXT, "block-direction");
  assert.equal(d.status, "BLOCK");
  assert.ok(d.policyViolations.includes("INTENT_DIRECTION"));
  assert.ok(d.policyViolations.includes("DIRECTION"));
});

test("oversized action is blocked by intent mismatch and max position", () => {
  const d = decide(INTENT_TEXT, "block-size");
  assert.equal(d.status, "BLOCK");
  assert.ok(d.policyViolations.includes("INTENT_AMOUNT_MISMATCH"));
  assert.ok(d.policyViolations.includes("MAX_POSITION"));
});

test("ticker substitution is blocked", () => {
  const d = decide(INTENT_TEXT, "block-ticker");
  assert.equal(d.status, "BLOCK");
  assert.ok(d.policyViolations.includes("INTENT_TICKER_MISMATCH"));
});

test("risk overrun is blocked", () => {
  const d = decide(INTENT_TEXT, "block-maxloss");
  assert.equal(d.status, "BLOCK");
  assert.ok(d.policyViolations.includes("INTENT_MAXLOSS_IGNORED"));
  assert.ok(d.policyViolations.includes("MAX_LOSS"));
});

test("low provenance on a critical field is blocked", () => {
  const d = decide(INTENT_TEXT, "block-provenance");
  assert.equal(d.status, "BLOCK");
  assert.ok(d.policyViolations.includes("PROVENANCE_LOW"));
});

test("custom max position policy blocks a $30 trade at $20 limit", () => {
  const d = decide(INTENT_TEXT, "real", { ...DEFAULT_POLICY, maxPositionSizeUSD: 20 });
  assert.equal(d.status, "BLOCK");
  assert.ok(d.policyViolations.includes("MAX_POSITION"));
});

test("short-only policy blocks a BUY intent", () => {
  const d = decide(INTENT_TEXT, "real", { ...DEFAULT_POLICY, allowedDirection: "SHORT" });
  assert.equal(d.status, "BLOCK");
  assert.ok(d.policyViolations.includes("DIRECTION"));
});

test("missing nominal amount fails closed", () => {
  const d = decide("Buy NVDA under $140");
  assert.equal(d.status, "BLOCK");
  assert.ok(d.policyViolations.includes("INTENT_AMOUNT_MISSING"));
  assert.ok(d.policyViolations.includes("SCHEMA"));
});

test("non-whitelisted ticker is blocked", () => {
  const d = decide("Buy $30 of MSFT if under $400, max loss $5");
  assert.equal(d.status, "BLOCK");
  assert.ok(d.policyViolations.includes("TICKER_WHITELIST"));
});

test("decision IDs are unique", () => {
  const ids = new Set(Array.from({ length: 50 }, () => decide().decisionId));
  assert.equal(ids.size, 50);
});
