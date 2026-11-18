import type { NextRequest } from "next/server";
import { createSimulatedTxHash } from "@/lib/decision/id";
import type { ExecutionReceipt } from "@/lib/types";

const BASE_CHAIN_ID = 8453;

/**
 * Demo-Mode only. Live execution is signed in the browser and never sent to
 * the server — private keys must never touch this application.
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (body.demoMode !== true) {
    return Response.json(
      { error: "Live execution must be signed in the connected wallet, not submitted to the server." },
      { status: 403 }
    );
  }

  const decisionId = typeof body.decisionId === "string" ? body.decisionId : "";
  if (!decisionId) return Response.json({ error: "decisionId is required." }, { status: 400 });

  const txHash = createSimulatedTxHash();
  const receipt: ExecutionReceipt = {
    decisionId,
    txHash,
    chainId: BASE_CHAIN_ID,
    chainName: "Base",
    explorerUrl: `https://basescan.org/tx/${txHash}`,
    mode: "demo",
    simulated: true,
    createdAt: new Date().toISOString(),
  };

  return Response.json(receipt);
}
