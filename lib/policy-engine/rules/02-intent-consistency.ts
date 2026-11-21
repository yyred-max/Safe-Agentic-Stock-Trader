import type { Intent, StructuredAction } from "../../types.ts";
import type { Violation } from "../types.ts";

export function checkIntentConsistency(
  intent: Intent,
  action: StructuredAction
): Violation[] {
  const violations: Violation[] = [];
  const rawText = intent.rawText;
  const lowerText = rawText.toLowerCase();

  // a. Wrong Direction Check (English, Indonesian)
  const hasBuy = /\b(buy|beli|membeli|pembelian|long)\b/i.test(lowerText);
  const hasSell = /\b(sell|jual|menjual|penjualan|short)\b/i.test(lowerText);

  if (hasBuy && !hasSell && action.actionType === "SELL") {
    violations.push({
      rule: "INTENT_DIRECTION",
      message: `Intent indicates BUY/LONG, but proposed action is SELL.`,
    });
  } else if (hasSell && !hasBuy && action.actionType === "BUY") {
    violations.push({
      rule: "INTENT_DIRECTION",
      message: `Intent indicates SELL/SHORT, but proposed action is BUY.`,
    });
  }

  // b. Ticker Check (FIX BUG)
  const actionTicker = (action.ticker || "").trim().toUpperCase();
  const tickerRegex = actionTicker ? new RegExp(`\\b${actionTicker}\\b`, "i") : null;
  const tickerInIntent = tickerRegex ? tickerRegex.test(rawText) : false;

  if (!tickerInIntent) {
    const matches = rawText.match(/\b[A-Z]{2,5}\b/g) || [];
    const ignoredKeywords = new Set([
      "BUY",
      "SELL",
      "LONG",
      "SHORT",
      "BELI",
      "JUAL",
      "MEMBELI",
      "MENJUAL",
      "LIMIT",
      "MARKET",
      "USD",
      "MAX",
      "LOSS",
      "UNDER",
      "BELOW",
    ]);
    const otherTickers = matches.filter(
      (ticker) =>
        ticker.toUpperCase() !== actionTicker &&
        !ignoredKeywords.has(ticker.toUpperCase())
    );

    if (otherTickers.length > 0) {
      violations.push({
        rule: "INTENT_TICKER_MISMATCH",
        message: `Intent mentions ticker(s) [${otherTickers.join(", ")}], but proposed action ticker is "${action.ticker}".`,
      });
    } else {
      violations.push({
        rule: "INTENT_TICKER_MISSING",
        message: `Intent does not specify ticker "${action.ticker}".`,
      });
    }
  }

  // c. Amount Check (FIX BUG)
  let cleanedText = rawText;
  cleanedText = cleanedText.replace(/(?:under|below|limit)\s*\$?\s*(\d+(?:\.\d+)?)/gi, "");
  cleanedText = cleanedText.replace(/max\s*loss\s*\$?\s*(\d+(?:\.\d+)?)/gi, "");

  const amountMatch = cleanedText.match(/\$?\s*(\d+(?:\.\d+)?)/);

  if (amountMatch && amountMatch[1]) {
    const parsedAmount = parseFloat(amountMatch[1]);
    if (isNaN(parsedAmount)) {
      violations.push({
        rule: "INTENT_AMOUNT_MISSING",
        message: "No valid nominal amount found in intent.",
      });
    } else if (action.amountUSD !== parsedAmount) {
      violations.push({
        rule: "INTENT_AMOUNT_MISMATCH",
        message: `Intent specifies amount $${parsedAmount}, but proposed action amount is $${action.amountUSD}.`,
      });
    }
  } else {
    // Fail-Closed: user did not specify nominal amount
    violations.push({
      rule: "INTENT_AMOUNT_MISSING",
      message: "No nominal trade amount specified in intent.",
    });
  }

  // d. Ignored Constraints Check
  const mentionsLimit = /(?:under|below|limit)/i.test(rawText);
  if (mentionsLimit && action.limitPrice == null) {
    violations.push({
      rule: "INTENT_LIMIT_IGNORED",
      message: "Intent specifies limit constraint, but action limitPrice is not set.",
    });
  }

  const maxLossMatch = rawText.match(/max\s*loss\s*\$?\s*(\d+(?:\.\d+)?)/i);
  if (maxLossMatch && maxLossMatch[1]) {
    const specifiedMaxLoss = parseFloat(maxLossMatch[1]);
    if (action.maxLoss == null || action.maxLoss > specifiedMaxLoss) {
      violations.push({
        rule: "INTENT_MAXLOSS_IGNORED",
        message: `Intent specifies max loss of $${specifiedMaxLoss}, but action maxLoss is ${action.maxLoss ?? "not set"}.`,
      });
    }
  } else if (/max\s*loss/i.test(rawText) && action.maxLoss == null) {
    violations.push({
      rule: "INTENT_MAXLOSS_IGNORED",
      message: "Intent mentions max loss constraint, but action maxLoss is not set.",
    });
  }

  return violations;
}
