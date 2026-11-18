"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getDecision, getReceipt, loadDemoMode } from "@/lib/store";
import { connectWallet, executeInDemo, executeOnBase, getConnectedAccount, hasWallet } from "@/lib/wallet";
import type { Decision } from "@/lib/types";

const RULE_LABELS: { key: string; label: string }[] = [
  { key: "SCHEMA", label: "Schema & sanity" },
  { key: "INTENT_", label: "Intent ↔ action consistency" },
  { key: "DIRECTION", label: "Direction policy" },
  { key: "TICKER_WHITELIST", label: "Allowed tickers" },
  { key: "MAX_POSITION", label: "Max position size" },
  { key: "MAX_LOSS", label: "Max loss per trade" },
  { key: "PROVENANCE", label: "Provenance confidence" },
];

function intentSignals(rawText: string) {
  const direction = /\b(sell|jual|short)\b/i.test(rawText) && !/\b(buy|beli|long)\b/i.test(rawText) ? "SELL" : "BUY";
  const tickers = (rawText.match(/\b[A-Z]{2,5}\b/g) ?? []).filter(
    (t) => !["USD", "LIMIT", "MARKET", "MAX", "LOSS", "BUY", "SELL"].includes(t)
  );
  const cleaned = rawText
    .replace(/(?:under|below|limit)\s*\$?\s*\d+(?:\.\d+)?/gi, "")
    .replace(/(?:max\s*loss|stop\s*loss|risk)\s*\$?\s*\d+(?:\.\d+)?/gi, "");
  const amount = cleaned.match(/\$\s*(\d+(?:\.\d+)?)/)?.[1] ?? cleaned.match(/\b(\d+(?:\.\d+)?)\s*(?:usd|dollars?)/i)?.[1] ?? "—";
  const limit = rawText.match(/(?:under|below|at|limit)\s*\$?\s*(\d+(?:\.\d+)?)/i)?.[1] ?? "—";
  const maxLoss = rawText.match(/(?:max\s*loss|stop\s*loss|risk)\s*\$?\s*(\d+(?:\.\d+)?)/i)?.[1] ?? "—";
  return { direction, ticker: tickers[0] ?? "—", amount, limit, maxLoss };
}

export default function VerificationView({ decisionId }: { decisionId: string }) {
  const router = useRouter();
  const [decision, setDecision] = useState<Decision | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const found = getDecision(decisionId);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDecision(found ?? null);
    setDemoMode(loadDemoMode());
    setLoaded(true);
    void getConnectedAccount().then(setAccount);
    if (found && getReceipt(decisionId)) router.replace(`/execution/${decisionId}`);
  }, [decisionId, router]);

  async function execute() {
    if (!decision) return;
    setExecuting(true);
    setError("");
    try {
      let wallet = account;
      if (!demoMode && !wallet) {
        if (!hasWallet()) throw new Error("No browser wallet detected. Enable Demo Mode or install a Base-compatible wallet.");
        wallet = await connectWallet();
        setAccount(wallet);
      }

      const receipt = demoMode
        ? executeInDemo(decision.decisionId)
        : await executeOnBase(decision.decisionId, wallet as string, decision.action.amountUSD);

      const { saveReceipt } = await import("@/lib/store");
      saveReceipt(receipt);
      router.push(`/execution/${decision.decisionId}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Execution failed.");
      setExecuting(false);
    }
  }

  if (!loaded) return <div className="container" style={{ paddingTop: 40 }}>Loading verification…</div>;
  if (!decision) {
    return (
      <div className="container" style={{ paddingTop: 40 }}>
        <h1>Decision not found</h1>
        <p className="muted">This Decision ID is not stored in this browser. Run the intent again from the <Link href="/">home page</Link>.</p>
      </div>
    );
  }

  const signals = intentSignals(decision.intent.rawText);
  const failedRules = new Set(decision.policyViolations);
  const isAllowed = decision.status === "ALLOW";

  return (
    <div className="container" style={{ paddingTop: 34 }}>
      <div className="eyebrow">Verification result</div>
      <div className={`verdict ${isAllowed ? "verdict-allow" : "verdict-block"}`}>
        <div className="verdict-label">{decision.status}</div>
        <p className="muted small" style={{ margin: "10px 0 0" }}>
          {isAllowed
            ? "All checks passed. Execution is possible only after your explicit confirmation."
            : "Execution is disabled. The proposed action violated one or more hard checks."}
        </p>
        <div className="verdict-id">Decision ID: {decision.decisionId}</div>
        <div className="muted small" style={{ marginTop: 6 }}>
          {new Date(decision.createdAt).toLocaleString()} · {demoMode ? "Demo Mode" : "Live intent"}
        </div>
      </div>

      {!isAllowed && (
        <section className="card">
          <h2>Why this was blocked</h2>
          <ul className="reasons">
            {decision.reasons.map((reason, index) => (
              <li key={`${decision.policyViolations[index] ?? "reason"}-${index}`}>
                <code>{decision.policyViolations[index] ?? "RULE"}</code>
                {reason}
              </li>
            ))}
          </ul>
          <div className="notice">No transaction was sent. The confirmation gate never appeared for a BLOCK decision.</div>
        </section>
      )}

      <div className="grid-2">
        <section className="card">
          <h2>Original intent</h2>
          <p style={{ fontStyle: "italic" }}>“{decision.intent.rawText}”</p>
          <p className="muted small mono">intent id: {decision.intent.id}</p>
        </section>
        <section className="card">
          <h2>Structured action (proposed)</h2>
          <table>
            <tbody>
              <tr><td>actionType</td><td className="mono">{decision.action.actionType}</td></tr>
              <tr><td>ticker</td><td className="mono">{decision.action.ticker}</td></tr>
              <tr><td>amountUSD</td><td className="mono">${decision.action.amountUSD}</td></tr>
              <tr><td>orderType</td><td className="mono">{decision.action.orderType}</td></tr>
              <tr><td>limitPrice</td><td className="mono">{decision.action.limitPrice ?? "—"}</td></tr>
              <tr><td>maxLoss</td><td className="mono">{decision.action.maxLoss ?? "—"}</td></tr>
            </tbody>
          </table>
          <p className="muted small" style={{ marginTop: 12 }}>{decision.action.reasoning}</p>
        </section>
      </div>

      <section className="card">
        <h2>Intent vs action</h2>
        <table>
          <thead>
            <tr><th>Field</th><th>Intent signal</th><th>Proposed action</th><th>Result</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>Direction</td><td className="mono">{signals.direction}</td><td className="mono">{decision.action.actionType}</td>
              <td className={signals.direction === decision.action.actionType ? "check-pass" : "check-fail"}>
                {signals.direction === decision.action.actionType ? "MATCH" : "MISMATCH"}
              </td>
            </tr>
            <tr>
              <td>Ticker</td><td className="mono">{signals.ticker}</td><td className="mono">{decision.action.ticker}</td>
              <td className={signals.ticker === decision.action.ticker ? "check-pass" : "check-fail"}>
                {signals.ticker === decision.action.ticker ? "MATCH" : "MISMATCH"}
              </td>
            </tr>
            <tr>
              <td>Amount (USD)</td><td className="mono">${signals.amount}</td><td className="mono">${decision.action.amountUSD}</td>
              <td className={Number(signals.amount) === decision.action.amountUSD ? "check-pass" : "check-fail"}>
                {Number(signals.amount) === decision.action.amountUSD ? "MATCH" : "MISMATCH"}
              </td>
            </tr>
            <tr>
              <td>Limit / under</td><td className="mono">{signals.limit}</td><td className="mono">{decision.action.limitPrice ?? "—"}</td>
              <td className={String(signals.limit) === String(decision.action.limitPrice ?? "—") ? "check-pass" : "check-fail"}>
                {String(signals.limit) === String(decision.action.limitPrice ?? "—") ? "MATCH" : "MISMATCH"}
              </td>
            </tr>
            <tr>
              <td>Max loss</td><td className="mono">{signals.maxLoss}</td><td className="mono">{decision.action.maxLoss ?? "—"}</td>
              <td className={String(signals.maxLoss) === String(decision.action.maxLoss ?? "—") ? "check-pass" : "check-fail"}>
                {String(signals.maxLoss) === String(decision.action.maxLoss ?? "—") ? "MATCH" : "MISMATCH"}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <div className="grid-2">
        <section className="card">
          <h2>Policy check results</h2>
          <table>
            <tbody>
              {RULE_LABELS.map((rule) => {
                const failed = [...failedRules].some((v) => v.startsWith(rule.key));
                return (
                  <tr key={rule.key}>
                    <td>{rule.label}</td>
                    <td className={failed ? "check-fail" : "check-pass"}>{failed ? "FAIL" : "PASS"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section className="card">
          <h2>Field-level provenance</h2>
          <table>
            <thead><tr><th>Field</th><th>Source</th><th>Confidence</th></tr></thead>
            <tbody>
              {Object.entries(decision.provenance).map(([field, entry]) => (
                <tr key={field}>
                  <td className="mono small">{field}</td>
                  <td className="small">{entry.source}</td>
                  <td>
                    <span className={`badge ${entry.confidence === "high" ? "badge-allow" : entry.confidence === "low" ? "badge-block" : "badge-accent"}`}>
                      {entry.confidence}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      {isAllowed && (
        <section className="card">
          <h2>User confirmation gate</h2>
          {!confirming ? (
            <div className="row">
              <p className="muted small" style={{ flex: 1, margin: 0 }}>
                An ALLOW decision is not an execution. You must explicitly confirm the exact action above.
              </p>
              <button className="btn-primary" onClick={() => setConfirming(true)}>Confirm &amp; Execute</button>
            </div>
          ) : (
            <div>
              <div className="notice">
                You are about to execute {decision.action.actionType} ${decision.action.amountUSD} of{" "}
                {decision.action.ticker} on {demoMode ? "Demo Mode (simulated)" : "Base"}.
                <br />Decision ID: <span className="mono">{decision.decisionId}</span>
              </div>
              <div className="row" style={{ marginTop: 14 }}>
                <button className="btn-success" onClick={() => void execute()} disabled={executing}>
                  {executing ? "Submitting…" : demoMode ? "Yes — simulate execution" : "Yes — sign in wallet"}
                </button>
                <button className="btn-ghost" onClick={() => setConfirming(false)} disabled={executing}>Cancel</button>
                {!demoMode && account && <span className="muted small mono">{account}</span>}
                {!demoMode && !hasWallet() && <span className="muted small">No wallet detected</span>}
              </div>
              {error && <div className="error-box">{error}</div>}
            </div>
          )}
        </section>
      )}

      <p className="small"><Link href="/">← New intent</Link></p>
    </div>
  );
}
