"use client";

import type { Decision, ExecutionReceipt, Policy } from "./types";
import { DEFAULT_POLICY } from "./policy-engine/defaults";

const POLICY_KEY = "sast.policy.v1";
const DECISIONS_KEY = "sast.decisions.v1";
const RECEIPTS_KEY = "sast.receipts.v1";
const DEMO_KEY = "sast.demoMode.v1";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — non-fatal for the demo */
  }
}

export function loadPolicy(): Policy {
  const saved = read<Partial<Policy> | null>(POLICY_KEY, null);
  if (!saved) return { ...DEFAULT_POLICY, allowedTickers: [...DEFAULT_POLICY.allowedTickers] };
  return {
    maxPositionSizeUSD: Number(saved.maxPositionSizeUSD ?? DEFAULT_POLICY.maxPositionSizeUSD),
    allowedTickers: Array.isArray(saved.allowedTickers) ? saved.allowedTickers : [...DEFAULT_POLICY.allowedTickers],
    allowedDirection: saved.allowedDirection ?? DEFAULT_POLICY.allowedDirection,
    maxLossPerTradeUSD: Number(saved.maxLossPerTradeUSD ?? DEFAULT_POLICY.maxLossPerTradeUSD),
  };
}

export function savePolicy(policy: Policy): void {
  write(POLICY_KEY, policy);
}

export function loadDecisions(): Decision[] {
  return read<Decision[]>(DECISIONS_KEY, []);
}

export function saveDecision(decision: Decision): void {
  const all = loadDecisions().filter((d) => d.decisionId !== decision.decisionId);
  write(DECISIONS_KEY, [decision, ...all].slice(0, 100));
}

export function getDecision(id: string): Decision | undefined {
  return loadDecisions().find((d) => d.decisionId === id);
}

export function loadReceipts(): ExecutionReceipt[] {
  return read<ExecutionReceipt[]>(RECEIPTS_KEY, []);
}

export function saveReceipt(receipt: ExecutionReceipt): void {
  const all = loadReceipts().filter((r) => r.decisionId !== receipt.decisionId);
  write(RECEIPTS_KEY, [receipt, ...all].slice(0, 100));
}

export function getReceipt(decisionId: string): ExecutionReceipt | undefined {
  return loadReceipts().find((r) => r.decisionId === decisionId);
}

export function loadDemoMode(): boolean {
  return read<boolean>(DEMO_KEY, false);
}

export function saveDemoMode(enabled: boolean): void {
  write(DEMO_KEY, enabled);
}
