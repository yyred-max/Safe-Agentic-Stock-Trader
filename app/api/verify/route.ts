import type { NextRequest } from "next/server";
import { generateActionWithOptionalLLM } from "@/lib/agent";
import { evaluate } from "@/lib/policy-engine";
import { DEFAULT_POLICY } from "@/lib/policy-engine/defaults";
import { createIntentId } from "@/lib/decision/id";
import type { Decision, DemoScenario, Policy } from "@/lib/types";

const SCENARIOS: DemoScenario[] = [
  "real",
  "allow",
  "block-direction",
  "block-size",
  "block-ticker",
  "block-maxloss",
  "block-provenance",
];

function normalizePolicy(input: unknown): Policy {
  if (!input || typeof input !== "object") return { ...DEFAULT_POLICY };
  const p = input as Partial<Policy>;
  return {
    maxPositionSizeUSD: Number.isFinite(p.maxPositionSizeUSD) && Number(p.maxPositionSizeUSD) > 0
      ? Number(p.maxPositionSizeUSD)
      : DEFAULT_POLICY.maxPositionSizeUSD,
    allowedTickers: Array.isArray(p.allowedTickers)
      ? p.allowedTickers.filter((t): t is string => typeof t === "string").map((t) => t.trim().toUpperCase()).filter(Boolean)
      : [...DEFAULT_POLICY.allowedTickers],
    allowedDirection: ["LONG", "SHORT", "BOTH"].includes(p.allowedDirection ?? "")
      ? (p.allowedDirection as Policy["allowedDirection"])
      : DEFAULT_POLICY.allowedDirection,
    maxLossPerTradeUSD: Number.isFinite(p.maxLossPerTradeUSD) && Number(p.maxLossPerTradeUSD) > 0
      ? Number(p.maxLossPerTradeUSD)
      : DEFAULT_POLICY.maxLossPerTradeUSD,
  };
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const rawText = typeof body.rawText === "string" ? body.rawText.trim() : "";
  if (!rawText) return Response.json({ error: "rawText is required." }, { status: 400 });
  if (rawText.length > 1000) return Response.json({ error: "rawText is too long (max 1000 chars)." }, { status: 400 });

  const scenario: DemoScenario = SCENARIOS.includes(body.scenario as DemoScenario)
    ? (body.scenario as DemoScenario)
    : "real";

  const policy = normalizePolicy(body.policy);
  const agentOutput = await generateActionWithOptionalLLM(rawText, scenario);

  const intent = {
    id: createIntentId(rawText),
    rawText,
    createdAt: new Date().toISOString(),
  };

  const decision: Decision = evaluate(
    intent,
    agentOutput.action,
    policy,
    agentOutput.provenance,
    agentOutput.paraphrasedIntent
  );

  return Response.json({ decision, engine: agentOutput.engine, scenario, policy });
}

export async function GET() {
  return Response.json({
    endpoint: "/api/verify",
    method: "POST",
    body: {
      rawText: "Buy $30 of NVDA if under $140, max loss $8",
      policy: {
        maxPositionSizeUSD: 50,
        allowedTickers: ["NVDA", "TSLA", "AAPL"],
        allowedDirection: "LONG",
        maxLossPerTradeUSD: 10,
      },
      scenario: "real | allow | block-direction | block-size | block-ticker | block-maxloss | block-provenance",
    },
  });
}
