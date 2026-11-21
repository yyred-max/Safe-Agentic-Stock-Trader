import type {
  AgentOutput,
  Confidence,
  DemoScenario,
  ProvenanceField,
  StructuredAction,
} from "../types.ts";

const KNOWN_TICKERS = ["NVDA", "TSLA", "AAPL"] as const;

function prov(source: string, confidence: Confidence): ProvenanceField {
  return { source, confidence };
}

/**
 * Deterministic intent -> structured action parser.
 *
 * The MVP deliberately uses a deterministic parser rather than an opaque LLM:
 * the safety value is that every field can be traced back to intent text. The
 * optional LLM adapter below can replace it when credentials are configured,
 * but its output is still validated by the same policy engine.
 */
export function generateAction(
  rawText: string,
  scenario: DemoScenario = "real"
): AgentOutput {
  const parsed = parseIntent(rawText);
  let action = parsed.action;
  let provenance = parsed.provenance;

  if (scenario !== "real" && scenario !== "allow") {
    const malicious = maliciousVariant(scenario, action);
    action = malicious.action;
    provenance = { ...provenance, ...malicious.provenance };
  }

  return { action, provenance, engine: "deterministic" };
}

function parseIntent(rawText: string): AgentOutput {
  const lower = rawText.toLowerCase();

  // Multi-language direction detection (English, Indonesian)
  const buyWords = /\b(buy|beli|membeli|pembelian|long|go long|add)\b/i.test(rawText);
  const sellWords = /\b(sell|jual|menjual|penjualan|short|go short|reduce)\b/i.test(rawText);
  const hasExplicitDirection = buyWords || sellWords;
  const actionType: StructuredAction["actionType"] = sellWords && !buyWords ? "SELL" : "BUY";

  const explicitTickers = (rawText.match(/\b[A-Z]{2,5}\b/g) ?? []).filter(
    (token) => !["USD", "LIMIT", "MARKET", "MAX", "LOSS", "BUY", "SELL", "BELI", "JUAL"].includes(token)
  );
  const known = explicitTickers.find((t) => (KNOWN_TICKERS as readonly string[]).includes(t));
  const ticker = (known ?? explicitTickers[0] ?? "").toUpperCase();

  const mentionsLimit = /(?:under|below|at|limit|if)\b/i.test(rawText);
  let limitPrice: number | undefined;
  const limitMatch = rawText.match(/(?:under|below|at|limit)\s*\$?\s*(\d+(?:\.\d+)?)/i);
  if (limitMatch?.[1]) limitPrice = Number(limitMatch[1]);

  let maxLoss: number | undefined;
  const lossMatch = rawText.match(/(?:max\s*loss|stop\s*loss|lose\s*no\s*more\s*than|risk)\s*\$?\s*(\d+(?:\.\d+)?)/i);
  if (lossMatch?.[1]) maxLoss = Number(lossMatch[1]);

  let amountUSD = 0;
  let amountSource = "no explicit amount found";
  let amountConfidence: Confidence = "low";

  // Exclude conditional price and risk phrases so a limit price is never
  // mistaken for the trade amount (fail-closed if no nominal amount exists).
  const amountText = rawText
    .replace(/(?:under|below|at|limit)\s*\$?\s*\d+(?:\.\d+)?/gi, "")
    .replace(/(?:max\s*loss|stop\s*loss|lose\s*no\s*more\s*than|risk)\s*\$?\s*\d+(?:\.\d+)?/gi, "");

  const buyAmountMatch = amountText.match(
    /\b(?:buy|sell|beli|membeli|pembelian|jual|menjual|penjualan|long|short|add|reduce)\b[^0-9$]*\$\s*(\d+(?:\.\d+)?)|\$\s*(\d+(?:\.\d+)?)/i
  );
  if (buyAmountMatch) {
    const value = buyAmountMatch[1] ?? buyAmountMatch[2];
    if (value) {
      amountUSD = Number(value);
      amountSource = `explicit amount "$${value}" in intent`;
      amountConfidence = "high";
    }
  } else {
    const bare = amountText.match(/\b(\d+(?:\.\d+)?)\s*(?:usd|dollars?|bucks?)\b/i);
    if (bare?.[1]) {
      amountUSD = Number(bare[1]);
      amountSource = `amount "${bare[1]} USD" in intent`;
      amountConfidence = "medium";
    }
  }

  const orderType: StructuredAction["orderType"] = mentionsLimit && limitPrice != null ? "LIMIT" : "MARKET";

  const reasoningParts: string[] = [];
  reasoningParts.push(`Parsed "${actionType}" direction from intent text.`);
  if (ticker) reasoningParts.push(`Ticker ${ticker} taken verbatim from intent.`);
  reasoningParts.push(`Amount $${amountUSD} taken from the first dollar figure in intent.`);
  if (limitPrice != null) reasoningParts.push(`Limit price $${limitPrice} from the conditional phrase.`);
  if (maxLoss != null) reasoningParts.push(`Max loss $${maxLoss} from the risk constraint.`);

  const action: StructuredAction = {
    actionType,
    ticker,
    amountUSD,
    orderType,
    ...(limitPrice != null ? { limitPrice } : {}),
    ...(maxLoss != null ? { maxLoss } : {}),
    reasoning: reasoningParts.join(" "),
  };

  const provenance: Record<string, ProvenanceField> = {
    actionType: prov(
      hasExplicitDirection ? "explicit direction word in intent" : "inferred (no direction word)",
      hasExplicitDirection ? "high" : "low"
    ),
    ticker: prov(ticker ? `ticker token "${ticker}" in intent` : "not found in intent", ticker ? "high" : "low"),
    amountUSD: prov(amountSource, amountConfidence),
    orderType: prov(orderType === "LIMIT" ? "conditional price phrase in intent" : "no conditional price in intent", orderType === "LIMIT" ? "high" : "medium"),
    reasoning: prov("generated from parsed intent fields", "medium"),
  };
  if (limitPrice != null) provenance.limitPrice = prov("conditional price phrase in intent", "high");
  if (maxLoss != null) provenance.maxLoss = prov("risk constraint phrase in intent", "high");

  // Keep parser coverage visible for the UI (unused lower variable intentionally referenced).
  void lower;

  return { action, provenance, engine: "deterministic" };
}

/** Simulated malicious / erroneous agent output for the BLOCK demo scenarios. */
function maliciousVariant(
  scenario: DemoScenario,
  base: StructuredAction
): { action: StructuredAction; provenance: Record<string, ProvenanceField> } {
  const action: StructuredAction = { ...base };
  const provenance: Record<string, ProvenanceField> = {};

  switch (scenario) {
    case "block-direction":
      action.actionType = base.actionType === "BUY" ? "SELL" : "BUY";
      provenance.actionType = prov("simulated agent hallucination", "medium");
      break;
    case "block-size":
      action.amountUSD = Math.max(base.amountUSD * 5, 300);
      provenance.amountUSD = prov("simulated agent over-sizing", "low");
      break;
    case "block-ticker":
      action.ticker = base.ticker === "TSLA" ? "NVDA" : "TSLA";
      provenance.ticker = prov("simulated agent ticker substitution", "low");
      break;
    case "block-maxloss":
      action.maxLoss = 100;
      provenance.maxLoss = prov("simulated agent risk-limit inflation", "low");
      break;
    case "block-provenance":
      provenance.ticker = prov("simulated low-confidence extraction", "low");
      break;
    default:
      break;
  }

  action.reasoning = `SIMULATED MALICIOUS OUTPUT (${scenario}): ` + action.reasoning;
  return { action, provenance };
}

/**
 * Optional LLM adapter. Enable by setting AGENT_LLM_API_KEY (and optionally
 * AGENT_LLM_BASE_URL / AGENT_LLM_MODEL). Any failure falls back to the
 * deterministic parser so the safety demo never depends on network access.
 */
export async function generateActionWithOptionalLLM(
  rawText: string,
  scenario: DemoScenario = "real"
): Promise<AgentOutput> {
  const base = generateAction(rawText, scenario);
  const apiKey = process.env.AGENT_LLM_API_KEY;
  if (!apiKey || scenario !== "real") return base;

  try {
    const baseUrl = process.env.AGENT_LLM_BASE_URL ?? "https://api.openai.com/v1";
    const model = process.env.AGENT_LLM_MODEL ?? "gpt-4o-mini";
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Convert the trading intent into JSON with keys: actionType (BUY|SELL), ticker, amountUSD, orderType (MARKET|LIMIT), limitPrice, maxLoss, reasoning. Never invent values not present in the intent. If a value is absent, omit it.",
          },
          { role: "user", content: rawText },
        ],
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return base;

    const body = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = body.choices?.[0]?.message?.content;
    if (!content) return base;

    const candidate = JSON.parse(content) as Partial<StructuredAction>;
    if (
      (candidate.actionType !== "BUY" && candidate.actionType !== "SELL") ||
      typeof candidate.ticker !== "string" ||
      typeof candidate.amountUSD !== "number"
    ) {
      return base;
    }

    const action: StructuredAction = {
      actionType: candidate.actionType,
      ticker: candidate.ticker.toUpperCase(),
      amountUSD: candidate.amountUSD,
      orderType: candidate.orderType === "LIMIT" ? "LIMIT" : "MARKET",
      ...(typeof candidate.limitPrice === "number" ? { limitPrice: candidate.limitPrice } : {}),
      ...(typeof candidate.maxLoss === "number" ? { maxLoss: candidate.maxLoss } : {}),
      reasoning: typeof candidate.reasoning === "string" ? candidate.reasoning : "LLM-generated action",
    };

    return {
      action,
      provenance: {
        ...base.provenance,
        actionType: prov("LLM structured output (validated)", "medium"),
        ticker: prov("LLM structured output (validated)", "medium"),
        amountUSD: prov("LLM structured output (validated)", "medium"),
      },
      engine: "llm",
    };
  } catch {
    return base;
  }
}
