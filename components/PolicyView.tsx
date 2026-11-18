"use client";

import { useEffect, useState } from "react";
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
    <div className="container" style={{ paddingTop: 40 }}>
      <div className="eyebrow">P0 · Hard rules</div>
      <h1>Policy settings</h1>
      <p className="subtitle">
        These four rules are enforced fail-closed by the verification engine. They are the hard
        boundaries an agent cannot cross, even with a connected wallet.
      </p>

      <section className="card">
        <div className="grid-2">
          <div>
            <label htmlFor="maxPosition">Max position size (USD)</label>
            <input
              id="maxPosition"
              type="number"
              min="1"
              value={policy.maxPositionSizeUSD}
              onChange={(event) => update("maxPositionSizeUSD", Number(event.target.value))}
            />
            <p className="muted small">Largest USD amount permitted per trade.</p>
          </div>
          <div>
            <label htmlFor="maxLoss">Max loss per trade (USD)</label>
            <input
              id="maxLoss"
              type="number"
              min="1"
              value={policy.maxLossPerTradeUSD}
              onChange={(event) => update("maxLossPerTradeUSD", Number(event.target.value))}
            />
            <p className="muted small">Largest acceptable loss per trade.</p>
          </div>
          <div>
            <label htmlFor="tickers">Allowed tickers (comma separated)</label>
            <input
              id="tickers"
              type="text"
              value={tickersText}
              onChange={(event) => { setTickersText(event.target.value); setSaved(false); }}
            />
            <p className="muted small">Whitelist of tokenized stocks.</p>
          </div>
          <div>
            <label htmlFor="direction">Allowed direction</label>
            <select
              id="direction"
              value={policy.allowedDirection}
              onChange={(event) => update("allowedDirection", event.target.value as DirectionPolicy)}
            >
              <option value="LONG">Only Long (BUY)</option>
              <option value="SHORT">Only Short (SELL)</option>
              <option value="BOTH">Both</option>
            </select>
            <p className="muted small">LONG means only BUY actions can pass.</p>
          </div>
        </div>

        <div className="row" style={{ marginTop: 20 }}>
          <button className="btn-primary" onClick={handleSave}>Save policy</button>
          <button
            className="btn-ghost"
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
          {saved && <span className="badge badge-allow">Saved for this browser</span>}
        </div>
      </section>

      <section className="card">
        <h2>Verification order</h2>
        <ol className="muted small" style={{ lineHeight: 2 }}>
          <li>Schema &amp; sanity check</li>
          <li>Intent ↔ action consistency (direction, ticker, amount, constraints)</li>
          <li>Direction policy</li>
          <li>Allowed tickers</li>
          <li>Max position size</li>
          <li>Max loss per trade</li>
          <li>Provenance confidence on critical fields</li>
        </ol>
        <div className="notice">
          Incomplete or unverifiable data is always treated as a BLOCK. No policy setting can turn
          a failed verification into an ALLOW.
        </div>
      </section>
    </div>
  );
}
