import type { DemoScenario } from "../types";

export interface DemoScenarioInfo {
  id: DemoScenario;
  label: string;
  description: string;
  expected: "ALLOW" | "BLOCK";
  intent: string;
}

export const DEMO_SCENARIOS: DemoScenarioInfo[] = [
  {
    id: "allow",
    label: "Safe trade",
    description: "Intent and action match; every hard policy passes.",
    expected: "ALLOW",
    intent: "Buy $30 of NVDA if under $140, max loss $8",
  },
  {
    id: "block-direction",
    label: "Wrong direction",
    description: "Agent proposes the opposite side of the user's intent.",
    expected: "BLOCK",
    intent: "Buy $30 of NVDA if under $140, max loss $8",
  },
  {
    id: "block-size",
    label: "Oversized",
    description: "Agent inflates the trade above the $50 position limit.",
    expected: "BLOCK",
    intent: "Buy $30 of NVDA if under $140, max loss $8",
  },
  {
    id: "block-ticker",
    label: "Wrong ticker",
    description: "Agent substitutes a different ticker than the user named.",
    expected: "BLOCK",
    intent: "Buy $30 of NVDA if under $140, max loss $8",
  },
  {
    id: "block-maxloss",
    label: "Risk overrun",
    description: "Agent ignores the user's max-loss constraint.",
    expected: "BLOCK",
    intent: "Buy $30 of NVDA if under $140, max loss $8",
  },
  {
    id: "block-provenance",
    label: "Low confidence",
    description: "Critical ticker field cannot be traced reliably to intent.",
    expected: "BLOCK",
    intent: "Buy $30 of NVDA if under $140, max loss $8",
  },
];

export const EXAMPLE_PROMPTS = [
  "Buy $30 of NVDA if under $140, max loss $8",
  "Buy $25 of TSLA at market",
  "Buy $40 of AAPL below $210, max loss $5",
];
