"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DEFAULT_POLICY } from "@/lib/policy-engine/defaults";
import { loadPolicy, savePolicy } from "@/lib/store";
import type { DirectionPolicy, Policy } from "@/lib/types";

export default function PolicyView() {
  const [policy, setPolicy] = useState<Policy>({ ...DEFAULT_POLICY });
  const [tickersText, setTickersText] = useState(DEFAULT_POLICY.allowedTickers.join(", "));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const loaded = loadPolicy();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPolicy(loaded);
    setTickersText(loaded.allowedTickers.join(", "));
  }, []);

  function update<K extends keyof Policy>(key: K, value: Policy[K]) {
    setPolicy((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  function handleSave() {
    const next: Policy = {
      ...policy,
      allowedTickers: tickersText.split(",").map((t) => t.trim().toUpperCase()).filter(Boolean),
    };
    if (next.allowedTickers.length === 0) {
      setSaved(false);
      return;
    }
    savePolicy(next);
    setPolicy(next);
    setSaved(true);
  }

  return (
    <div className="container pt-8 pb-16">
      <div className="mb-10 max-w-3xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-medium tracking-[0.08em] uppercase text-zinc-400 bg-white/[0.03] border border-white/10 mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#7170ff]" />
          P0 · Hard Rules &amp; Guardrails
        </div>
        <h1 className="text-4xl sm:text-[2.5rem] font-medium tracking-tight text-zinc-100 max-w-3xl leading-[1.12]">
          Policy settings
        </h1>
        <p className="text-zinc-400 text-[15px] leading-relaxed max-w-2xl mt-4">
          These four rules are enforced fail-closed by the verification engine. They are the immutable
          boundaries an agent cannot cross, even with a connected wallet.
        </p>
      </div>

      {/* 4 Separate Glassmorphism Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Card 1: Max Position Size */}
        <section className="gradient-border-card is-glass p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">Rule 05</span>
              <span className="badge badge-accent">USD LIMIT</span>
            </div>
            <h2 className="text-[15px] font-medium tracking-tight text-zinc-100 mb-1">Max position size</h2>
            <p className="text-xs text-zinc-400 mb-4">
              Largest USD notional permitted for any single trade. Exceeding this amount triggers an immediate BLOCK.
            </p>
          </div>
          <div>
            <label htmlFor="maxPosition" className="text-xs uppercase tracking-wider text-zinc-500 font-medium">Position Limit (USD)</label>
            <div className="relative mt-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 font-mono text-sm">$</span>
              <input
                id="maxPosition"
                type="number"
                min="1"
                className="pl-8 font-mono"
                value={policy.maxPositionSizeUSD}
                onChange={(event) => update("maxPositionSizeUSD", Number(event.target.value))}
              />
            </div>
          </div>
        </section>

        {/* Card 2: Max Loss Per Trade */}
        <section className="gradient-border-card is-glass p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">Rule 06</span>
              <span className="badge badge-accent">RISK GUARD</span>
            </div>
            <h2 className="text-[15px] font-medium tracking-tight text-zinc-100 mb-1">Max loss per trade</h2>
            <p className="text-xs text-zinc-400 mb-4">
              Largest acceptable loss per trade. Missing stop loss or exceeding this threshold triggers an immediate BLOCK.
            </p>
          </div>
          <div>
            <label htmlFor="maxLoss" className="text-xs uppercase tracking-wider text-zinc-500 font-medium">Max Loss Limit (USD)</label>
            <div className="relative mt-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 font-mono text-sm">$</span>
              <input
                id="maxLoss"
                type="number"
                min="1"
                className="pl-8 font-mono"
                value={policy.maxLossPerTradeUSD}
                onChange={(event) => update("maxLossPerTradeUSD", Number(event.target.value))}
              />
            </div>
          </div>
        </section>

        {/* Card 3: Allowed Tickers */}
        <section className="gradient-border-card is-glass p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">Rule 04</span>
              <span className="badge badge-accent">WHITELIST</span>
            </div>
            <h2 className="text-[15px] font-medium tracking-tight text-zinc-100 mb-1">Allowed tickers</h2>
            <p className="text-xs text-zinc-400 mb-4">
              Comma-separated list of approved tokenized stock symbols. Any unlisted ticker will be rejected fail-closed.
            </p>
          </div>
          <div>
            <label htmlFor="tickers" className="text-xs uppercase tracking-wider text-zinc-500 font-medium">Approved Symbols</label>
            <input
              id="tickers"
              type="text"
              className="mt-1 font-mono uppercase"
              value={tickersText}
              onChange={(event) => { setTickersText(event.target.value); setSaved(false); }}
              placeholder="NVDA, AAPL, MSFT, TSLA"
            />
          </div>
        </section>

        {/* Card 4: Allowed Direction */}
        <section className="gradient-border-card is-glass p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">Rule 03</span>
              <span className="badge badge-accent">DIRECTION</span>
            </div>
            <h2 className="text-[15px] font-medium tracking-tight text-zinc-100 mb-1">Allowed direction</h2>
            <p className="text-xs text-zinc-400 mb-4">
              Restricts whether the agent can submit BUY (LONG), SELL (SHORT), or BOTH types of stock orders.
            </p>
          </div>
          <div>
            <label htmlFor="direction" className="text-xs uppercase tracking-wider text-zinc-500 font-medium">Order Direction Mode</label>
            <select
              id="direction"
              className="mt-1 font-sans"
              value={policy.allowedDirection}
              onChange={(event) => update("allowedDirection", event.target.value as DirectionPolicy)}
            >
              <option value="LONG">Only Long (BUY actions only)</option>
              <option value="SHORT">Only Short (SELL actions only)</option>
              <option value="BOTH">Both (Allow BUY and SELL)</option>
            </select>
          </div>
        </section>
      </div>

      {/* Save & Reset Panel */}
      <section className="gradient-border-card p-6 mb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button className="btn-primary text-xs px-5 py-2.5 font-semibold" onClick={handleSave}>
              Save policy
            </button>
            <button
              className="btn-ghost text-xs px-4 py-2.5"
              onClick={() => {
                const defaults: Policy = { ...DEFAULT_POLICY, allowedTickers: [...DEFAULT_POLICY.allowedTickers] };
                setPolicy(defaults);
                setTickersText(defaults.allowedTickers.join(", "));
                savePolicy(defaults);
                setSaved(true);
              }}
            >
              Reset to defaults
            </button>
          </div>
          {saved && (
            <span className="badge badge-allow text-xs px-3 py-1 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Policy saved for this browser
            </span>
          )}
        </div>
      </section>

      {/* Verification Order Section */}
      <section className="gradient-border-card p-6 mb-8">
        <h2 className="text-[15px] font-medium tracking-tight text-zinc-100 mb-1">Verification order (PRD §8.2)</h2>
        <p className="text-xs text-zinc-400 mb-4">
          Each proposed order is checked in strict chronological sequence. If any rule fails, the decision immediately yields BLOCK.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {[
            { num: "01", name: "Schema & Sanity Check", desc: "Validates JSON structure, required fields, and non-empty values" },
            { num: "02", name: "Intent Consistency", desc: "Cross-checks ticker, amount, direction, and price constraints" },
            { num: "03", name: "Direction Policy", desc: "Enforces LONG only, SHORT only, or BOTH rules" },
            { num: "04", name: "Ticker Whitelist", desc: "Verifies the stock symbol is in the allowed policy whitelist" },
            { num: "05", name: "Max Position Size", desc: "Guarantees order notional does not exceed maximum USD" },
            { num: "06", name: "Max Loss Per Trade", desc: "Ensures risk per trade does not exceed configured stop limit" },
            { num: "07", name: "Provenance Confidence", desc: "Rejects low confidence field extractions fail-closed" },
          ].map((item) => (
            <div key={item.num} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors flex items-start gap-3">
              <span className="text-xs font-mono font-bold text-[#7170ff] bg-[#7170ff]/10 px-2 py-0.5 rounded-md">
                {item.num}
              </span>
              <div>
                <strong className="text-xs font-semibold text-zinc-200 block">{item.name}</strong>
                <span className="text-[11px] text-zinc-400 leading-normal block mt-0.5">{item.desc}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="notice text-xs rounded-xl">
          Incomplete or unverifiable data is always treated as a BLOCK. No policy setting can turn
          a failed verification into an ALLOW.
        </div>
      </section>

      <p className="text-xs text-zinc-500 mt-6">
        <Link href="/" className="text-[#828fff] hover:underline flex items-center gap-1">
          ← Back to intent trading
        </Link>
      </p>
    </div>
  );
}
