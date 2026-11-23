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

  if (!loaded) return <div className="container pt-6 text-zinc-400">Loading execution receipt…</div>;
  if (!receipt) {
    return (
      <div className="container pt-8 pb-16">
        <h1 className="text-2xl font-bold text-zinc-100">No execution receipt</h1>
        <p className="text-zinc-400 mt-2">This Decision ID has no execution record in this browser.</p>
        <p className="mt-4"><Link href="/" className="text-[#828fff] underline">← Back to intent</Link></p>
      </div>
    );
  }

  return (
    <div className="container pt-8 pb-16">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-medium tracking-[0.08em] uppercase text-zinc-400 bg-white/[0.03] border border-white/10 mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          On-Chain Settlement
        </div>
        <h1 className="text-4xl sm:text-[2.5rem] font-medium tracking-tight text-zinc-100 max-w-3xl leading-[1.12]">
          Transaction submitted
        </h1>
        <p className="text-zinc-400 text-[15px] leading-relaxed max-w-2xl mt-4">
          The confirmed action was submitted after an explicit ALLOW decision and your signed authorization.
        </p>
      </div>

      <section className="gradient-border-card is-allow p-6 sm:p-7 mb-8 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="badge badge-allow">CONFIRMED</span>
          <span className={`badge ${receipt.simulated ? "badge-accent" : "badge-allow"}`}>
            {receipt.simulated ? "SIMULATED · DEMO MODE" : "LIVE TRANSACTION"}
          </span>
          <span className="badge">{receipt.chainName}</span>
        </div>

        <div className="rounded-xl border border-white/5 overflow-hidden mb-6">
          <table className="w-full">
            <tbody>
              <tr className="border-b border-white/5">
                <td className="text-xs text-zinc-400 py-4 px-5 sm:w-48">Transaction Hash</td>
                <td className="text-xs font-mono text-emerald-400 py-4 px-5 break-all">{receipt.txHash}</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="text-xs text-zinc-400 py-4 px-5">Decision ID</td>
                <td className="text-xs font-mono text-zinc-200 py-4 px-5 break-all">{receipt.decisionId}</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="text-xs text-zinc-400 py-4 px-5">Chain ID</td>
                <td className="text-xs font-mono text-zinc-200 py-4 px-5">{receipt.chainId}</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="text-xs text-zinc-400 py-4 px-5">Execution Mode</td>
                <td className="text-xs font-mono text-zinc-200 py-4 px-5 uppercase">{receipt.mode}</td>
              </tr>
              <tr>
                <td className="text-xs text-zinc-400 py-4 px-5">Submitted At</td>
                <td className="text-xs text-zinc-300 py-4 px-5">{new Date(receipt.createdAt).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <a
            className="btn-primary text-xs px-5 py-2.5 font-semibold"
            href={receipt.explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            View on Explorer ↗
          </a>
          {decision && (
            <Link
              href={`/verification/${decision.decisionId}`}
              className="text-xs text-[#828fff] hover:text-white px-3 py-2 transition-colors"
            >
              Back to verification review →
            </Link>
          )}
        </div>

        {receipt.simulated && (
          <div className="notice text-xs rounded-xl mt-5">
            Demo Mode produced a simulated transaction hash for presentation. No on-chain balance changed.
            Switch off Demo Mode and connect a wallet on Base Sepolia for live token execution.
          </div>
        )}
      </section>

      <p className="text-xs text-zinc-500 mt-6">
        <Link href="/" className="text-[#828fff] hover:underline flex items-center gap-1">
          ← Back to new intent
        </Link>
      </p>
    </div>
  );
}
