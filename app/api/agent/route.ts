import type { NextRequest } from "next/server";
import { generateAction, generateActionWithOptionalLLM } from "@/lib/agent";
import type { DemoScenario } from "@/lib/types";

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const rawText = typeof body.rawText === "string" ? body.rawText.trim() : "";
  if (!rawText) return Response.json({ error: "rawText is required." }, { status: 400 });

  const scenario = typeof body.scenario === "string" ? (body.scenario as DemoScenario) : "real";
  const output = body.deterministic === true
    ? generateAction(rawText, scenario)
    : await generateActionWithOptionalLLM(rawText, scenario);

  // This endpoint only proposes. It never decides and never executes.
  return Response.json({ ...output, rawText, scenario });
}
