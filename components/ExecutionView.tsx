"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getDecision, getReceipt } from "@/lib/store";
import type { Decision, ExecutionReceipt } from "@/lib/types";

export default function ExecutionView({ decisionId }: { decisionId: string }) {
  const [receipt, setReceipt] = useState<ExecutionReceipt | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReceipt(getReceipt(decisionId) ?? null);
    setDecision(getDecision(decisionId) ?? null);
    setLoaded(true);
  }, [decisionId]);

  if (!loaded) return <div className="container" style={{ paddingTop: 40 }}>Loading execution…</div>;
  if (!receipt) {
    return (
      <div className="container" style={{ paddingTop: 40 }}>
        <h1>No execution receipt</h1>
        <p className="muted">This Decision ID has no execution in this browser.</p>
        <p><Link href="/">← New intent</Link></p>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: 40 }}>
      <div className="eyebrow">Execution</div>
      <h1>Transaction submitted</h1>
      <p className="subtitle">
        The confirmed action was submitted after an ALLOW decision and your explicit confirmation.
      </p>

      <section className="card">
        <div className="row" style={{ marginBottom: 16 }}>
          <span className="badge badge-allow">CONFIRMED</span>
          <span className={`badge ${receipt.simulated ? "badge-accent" : "badge-allow"}`}>
            {receipt.simulated ? "SIMULATED · DEMO MODE" : "LIVE TRANSACTION"}
          </span>
          <span className="badge">{receipt.chainName}</span>
        </div>
        <table>
          <tbody>
            <tr><td>Transaction hash</td><td className="mono hash">{receipt.txHash}</td></tr>
            <tr><td>Decision ID</td><td className="mono hash">{receipt.decisionId}</td></tr>
            <tr><td>Chain ID</td><td className="mono">{receipt.chainId}</td></tr>
            <tr><td>Mode</td><td className="mono">{receipt.mode}</td></tr>
            <tr><td>Submitted</td><td className="muted small">{new Date(receipt.createdAt).toLocaleString()}</td></tr>
          </tbody>
        </table>
        <div className="row" style={{ marginTop: 18 }}>
          <a className="btn-primary" href={receipt.explorerUrl} target="_blank" rel="noopener noreferrer">
            View on explorer
          </a>
          {decision && <Link href={`/verification/${decision.decisionId}`}>Back to verification →</Link>}
        </div>
        {receipt.simulated && (
          <div className="notice" style={{ marginTop: 18 }}>
            Demo Mode produced a simulated hash for presentation only. No on-chain state changed.
            Switch off Demo Mode, connect a wallet, and configure a tokenized-stock token to execute live.
          </div>
        )}
      </section>

      <p className="small"><Link href="/">← New intent</Link></p>
    </div>
  );
}
