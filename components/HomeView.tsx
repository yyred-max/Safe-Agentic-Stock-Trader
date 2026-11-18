"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DEMO_SCENARIOS, EXAMPLE_PROMPTS } from "@/lib/demo-mode/scenarios";
import { loadDecisions, loadDemoMode, loadPolicy, saveDecision, saveDemoMode } from "@/lib/store";
import type { Decision, DemoScenario, Policy } from "@/lib/types";

export default function HomeView() {
  const router = useRouter();
  const [rawText, setRawText] = useState(EXAMPLE_PROMPTS[0] ?? "");
  const [demoMode, setDemoModeState] = useState(false);
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [scenario, setScenario] = useState<DemoScenario>("real");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [recent, setRecent] = useState<Decision[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDemoModeState(loadDemoMode());
    setPolicy(loadPolicy());
    setRecent(loadDecisions().slice(0, 5));
  }, []);

  async function runVerify(text: string, scenarioToRun: DemoScenario, forceDemo = false) {
    if (!text.trim()) {
      setError("Enter a trading intent first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          rawText: text,
          policy: policy ?? undefined,
          scenario: forceDemo || demoMode ? scenarioToRun : "real",
        }),
      });
      const payload = (await response.json()) as { decision?: Decision; error?: string };
      if (!response.ok || !payload.decision) throw new Error(payload.error ?? "Verification failed.");

      saveDecision(payload.decision);
      setRecent(loadDecisions().slice(0, 5));
      router.push(`/verification/${payload.decision.decisionId}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unexpected verification error.");
      setBusy(false);
    }
  }

  function toggleDemo(next: boolean) {
    saveDemoMode(next);
    setDemoModeState(next);
    setScenario(next ? "allow" : "real");
  }

  function runDemoScenario(id: DemoScenario, intent: string) {
    saveDemoMode(true);
    setDemoModeState(true);
    setRawText(intent);
    setScenario(id);
    void runVerify(intent, id, true);
  }

  return (
    <div className="container" style={{ paddingTop: 40 }}>
      <div className="eyebrow">Base Stocks Maxxing 2026 · Agentic Stock Finance</div>
      <h1>AI may trade stocks. But it may never violate your intent or your risk policy.</h1>
      <p className="subtitle">
        Express a trade in plain English. The agent proposes a structured action, a fail-closed
        verification layer checks intent consistency and hard policy rules, and only an ALLOW
        decision can reach your confirmation gate.
      </p>

      <div className="row" style={{ marginBottom: 22 }}>
        <span className="badge badge-accent">FAIL-CLOSED POLICY ENGINE</span>
        <span className="badge badge-accent">FIELD-LEVEL PROVENANCE</span>
        <span className="badge badge-accent">USER CONFIRMATION GATE</span>
        <span className="badge">BASE EXECUTION</span>
      </div>

      <div className="grid-2">
        <section className="card">
          <h2>1 · Express your intent</h2>
          <p className="muted small" style={{ marginTop: -6 }}>
            Natural language, English. Amount, ticker and direction must be explicit.
          </p>
          <textarea
            aria-label="Trading intent"
            value={rawText}
            onChange={(event) => setRawText(event.target.value)}
            placeholder="Buy $30 of NVDA if under $140, max loss $8"
          />

          <div className="row" style={{ marginTop: 14 }}>
            <label className="toggle">
              <input
                type="checkbox"
                checked={demoMode}
                onChange={(event) => toggleDemo(event.target.checked)}
              />
              <span>Demo Mode — no wallet required</span>
            </label>
            <span className="spacer" />
            <button className="btn-primary" onClick={() => void runVerify(rawText, scenario)} disabled={busy}>
              {busy ? "Verifying…" : "Verify intent"}
            </button>
          </div>
          {error && <div className="error-box">{error}</div>}

          <div style={{ marginTop: 22 }}>
            <h3>Example prompts</h3>
            <div className="example-list">
              {EXAMPLE_PROMPTS.map((prompt) => (
                <button key={prompt} className="example-btn btn-sm" onClick={() => setRawText(prompt)}>
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="card">
          <h2>Active hard policy</h2>
          <p className="muted small" style={{ marginTop: -6 }}>
            Any violation blocks the decision before execution is possible.
          </p>
          {policy ? (
            <table>
              <tbody>
                <tr><td>Max position size</td><td className="mono">${policy.maxPositionSizeUSD}</td></tr>
                <tr><td>Allowed tickers</td><td className="mono">{policy.allowedTickers.join(", ")}</td></tr>
                <tr><td>Allowed direction</td><td className="mono">{policy.allowedDirection}</td></tr>
                <tr><td>Max loss per trade</td><td className="mono">${policy.maxLossPerTradeUSD}</td></tr>
              </tbody>
            </table>
          ) : (
            <div className="empty">Loading policy…</div>
          )}
          <p className="small" style={{ marginTop: 16 }}>
            <Link href="/policy">Edit policy settings →</Link>
          </p>
        </section>
      </div>

      <section className="card">
        <h2>One-click demo scenarios</h2>
        <p className="muted small" style={{ marginTop: -6 }}>
          Each button fills the intent, enables Demo Mode, and runs the full verification flow.
          Use these for the 45–60 second judge demo.
        </p>
        <div className="scenario-grid">
          {DEMO_SCENARIOS.map((item) => (
            <button
              key={item.id}
              className={`scenario-btn ${item.expected === "ALLOW" ? "allow" : "block"}`}
              onClick={() => runDemoScenario(item.id, item.intent)}
              disabled={busy}
            >
              <span className={`badge ${item.expected === "ALLOW" ? "badge-allow" : "badge-block"}`}>
                {item.expected}
              </span>
              <strong>{item.label}</strong>
              <small>{item.description}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Recent decisions</h2>
        {recent.length === 0 ? (
          <div className="empty">No decisions yet. Verify an intent to see its Decision ID here.</div>
        ) : (
          <table>
            <thead>
              <tr><th>Decision ID</th><th>Status</th><th>Intent</th><th>Created</th></tr>
            </thead>
            <tbody>
              {recent.map((decision) => (
                <tr key={decision.decisionId}>
                  <td className="mono small"><Link href={`/verification/${decision.decisionId}`}>{decision.decisionId}</Link></td>
                  <td><span className={`badge ${decision.status === "ALLOW" ? "badge-allow" : "badge-block"}`}>{decision.status}</span></td>
                  <td className="small">{decision.intent.rawText}</td>
                  <td className="muted small">{new Date(decision.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <div className="notice">
        Verification runs off-chain for speed and transparency. Private keys never reach this server.
        Live execution requires a connected wallet and a configured tokenized-stock token on Base.
      </div>
    </div>
  );
}
