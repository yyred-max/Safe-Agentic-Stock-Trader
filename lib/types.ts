export type ActionType = "BUY" | "SELL";
export type OrderType = "MARKET" | "LIMIT";
export type DirectionPolicy = "LONG" | "SHORT" | "BOTH";
export type Confidence = "high" | "medium" | "low";
export type DecisionStatus = "ALLOW" | "BLOCK";

export interface Intent {
  id: string;
  rawText: string;
  createdAt: string;
}

export interface StructuredAction {
  actionType: "BUY" | "SELL";
  ticker: string;
  amountUSD: number;
  orderType: "MARKET" | "LIMIT";
  limitPrice?: number;
  maxLoss?: number;
  reasoning: string;
}

export interface Policy {
  maxPositionSizeUSD: number;
  allowedTickers: string[];
  allowedDirection: "LONG" | "SHORT" | "BOTH";
  maxLossPerTradeUSD: number;
}

export interface ProvenanceField {
  source: string;
  confidence: "high" | "medium" | "low";
}

export interface Decision {
  decisionId: string;
  status: "ALLOW" | "BLOCK";
  reasons: string[];
  policyViolations: string[];
  provenance: Record<string, ProvenanceField>;
  intent: Intent;
  action: StructuredAction;
  createdAt: string;
}

export type DemoScenario =
  | "real"
  | "allow"
  | "block-direction"
  | "block-size"
  | "block-ticker"
  | "block-maxloss"
  | "block-provenance";

export interface ExecutionReceipt {
  decisionId: string;
  txHash: string;
  chainId: number;
  chainName: string;
  explorerUrl: string;
  mode: "demo" | "live";
  simulated: boolean;
  createdAt: string;
}

export interface AgentOutput {
  action: StructuredAction;
  provenance: Record<string, ProvenanceField>;
  engine: "deterministic" | "llm";
}
