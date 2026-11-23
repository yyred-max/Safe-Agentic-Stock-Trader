"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { motion } from "framer-motion";
import { DEMO_SCENARIOS, EXAMPLE_PROMPTS } from "@/lib/demo-mode/scenarios";
import { loadDecisions, loadDemoMode, loadPolicy, saveDecision, saveDemoMode } from "@/lib/store";
import type { Decision, DemoScenario, Policy } from "@/lib/types";
import OnchainActivity from "@/components/OnchainActivity";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const HERO_TITLE =
  "AI may trade stocks. But it may never violate your intent or your risk policy.";
const HERO_WORDS = HERO_TITLE.split(" ");

export default function HomeView() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const heroRef = useRef<HTMLHeadingElement>(null);

  useGSAP(
    () => {
      const hero = heroRef.current;
      if (!hero) return;

      gsap.fromTo(
        ".hero-word",
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.06,
          ease: "power2.out",
          scrollTrigger: {
            trigger: hero,
            start: "top 90%",
            once: true,
          },
        }
      );
    },
    { scope: heroRef }
  );

  const [rawText, setRawText] = useState(EXAMPLE_PROMPTS[0] ?? "");
  const [demoMode, setDemoModeState] = useState(false);
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [scenario, setScenario] = useState<DemoScenario>("real");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [recent, setRecent] = useState<Decision[]>([]);

  // Faucet state & Rate limiting
  const [claimingFaucet, setClaimingFaucet] = useState(false);
  const [hasClaimedFaucet, setHasClaimedFaucet] = useState(false);
  const [faucetMessage, setFaucetMessage] = useState("");
  const [faucetError, setFaucetError] = useState("");
  const prevAddressRef = useRef<string | undefined>(address);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDemoModeState(loadDemoMode());
    setPolicy(loadPolicy());
    setRecent(loadDecisions().slice(0, 5));
  }, []);

  // Rate limiting check per wallet address
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (prevAddressRef.current && prevAddressRef.current !== address) {
        localStorage.removeItem("hasClaimedFaucet");
        setHasClaimedFaucet(false);
        setFaucetMessage("");
        setFaucetError("");
      } else {
        const claimed = localStorage.getItem("hasClaimedFaucet") === "true";
        setHasClaimedFaucet(claimed);
      }
    }
    prevAddressRef.current = address;
  }, [address]);

  async function handleClaimFaucet() {
    if (!address) return;
    setClaimingFaucet(true);
    setFaucetMessage("");
    setFaucetError("");

    try {
      const res = await fetch("/api/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userAddress: address }),
      });
      const data = (await res.json()) as { success?: boolean; message?: string; error?: string };
      if (!res.ok || !data.success) {
        if (data.error && data.error.includes("sudah pernah melakukan klaim")) {
          localStorage.setItem("hasClaimedFaucet", "true");
          setHasClaimedFaucet(true);
        }
        throw new Error(data.error ?? "Gagal mengklaim faucet.");
      }

      localStorage.setItem("hasClaimedFaucet", "true");
      setHasClaimedFaucet(true);
      setFaucetMessage(data.message ?? "Berhasil! 100 mNVDA & Gas terkirim ke wallet Anda.");
    } catch (err: unknown) {
      setFaucetError(err instanceof Error ? err.message : "Terjadi kesalahan saat klaim faucet.");
    } finally {
      setClaimingFaucet(false);
    }
  }

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
    <div className="container pt-8 pb-16">
      <div className="mb-10 max-w-3xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-medium tracking-[0.08em] uppercase text-zinc-400 bg-white/[0.03] border border-white/10 mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#7170ff] shadow-[0_0_8px_rgba(113,112,255,0.8)]" />
          Base Stocks Maxxing 2026 · Agentic Stock Finance
        </div>
        <h1
          ref={heroRef}
          aria-label={HERO_TITLE}
          className="text-4xl sm:text-[2.75rem] font-medium tracking-tight text-zinc-100 max-w-3xl leading-[1.12]"
        >
          {HERO_WORDS.map((word, index) => (
            <span key={`${word}-${index}`} aria-hidden="true" className="hero-word inline-block">
              {word}
              {index < HERO_WORDS.length - 1 ? " " : ""}
            </span>
          ))}
        </h1>
        <p className="text-zinc-400 text-[15px] leading-relaxed max-w-2xl mt-4">
          Express a trade in natural language. The agent proposes a structured action, a fail-closed
          verification layer checks intent consistency and hard policy rules, and only an ALLOW
          decision can reach your confirmation gate.
        </p>

        <div className="flex flex-wrap items-center gap-2 mt-6">
          <span className="badge badge-accent">FAIL-CLOSED POLICY ENGINE</span>
          <span className="badge badge-accent">FIELD-LEVEL PROVENANCE</span>
          <span className="badge badge-accent">USER CONFIRMATION GATE</span>
          <span className="badge">BASE EXECUTION</span>
        </div>
      </div>

      {isConnected && (
        <section className="gradient-border-card is-glass backdrop-blur-md bg-white/5 border border-white/10 p-5 sm:p-6 mb-8 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-56 h-56 bg-[#7170ff]/10 blur-3xl rounded-full pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#7170ff]/10 border border-[#7170ff]/20 flex items-center justify-center shrink-0 text-[#828fff] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-100 tracking-tight">
                  1-Click Testnet Setup for Judges
                </p>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed max-w-xl">
                  Claim 100 mNVDA mock tokenized stocks + 0.0001 Base Sepolia ETH for gas directly to your connected wallet.
                </p>
              </div>
            </div>
            <button
              className="btn-primary btn-sm shrink-0 whitespace-nowrap self-start sm:self-center"
              onClick={() => void handleClaimFaucet()}
              disabled={hasClaimedFaucet || claimingFaucet}
            >
              {hasClaimedFaucet
                ? "✓ Already Claimed"
                : claimingFaucet
                ? "Claiming..."
                : "Claim Testnet Tokens (mNVDA + Gas)"}
            </button>
          </div>

          {faucetMessage && (
            <div className="relative mt-4 text-xs px-3.5 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>{faucetMessage}</span>
            </div>
          )}

          {faucetError && (
            <div className="relative mt-4 text-xs px-3.5 py-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{faucetError}</span>
            </div>
          )}
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
          className="bg-[#0f1011] border border-white/10 rounded-2xl p-6 shadow-2xl shadow-black/50 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-semibold text-zinc-100 m-0">1 · Express your intent</h2>
              <span className="text-[11px] text-zinc-500 font-mono">Terminal Input</span>
            </div>
            <p className="text-xs text-zinc-400 mb-4">
              Natural language, English or Indonesian. Amount, ticker and direction must be explicit.
            </p>

            <div className="relative rounded-xl overflow-hidden border border-white/10 focus-within:border-[#7170ff]/70 focus-within:ring-1 focus-within:ring-[#7170ff]/40 transition-all bg-[#0a0b0c] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
              <div className="flex items-center justify-between px-3.5 py-2 bg-white/[0.02] border-b border-white/5 text-[11px] font-mono text-zinc-500">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-700/60" />
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-700/60" />
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-700/60" />
                </div>
                <span>intent.agent</span>
              </div>
              <textarea
                aria-label="Trading intent"
                className="w-full bg-zinc-900/50 border-none p-4 text-sm font-mono text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y min-h-[120px] leading-relaxed"
                value={rawText}
                onChange={(event) => setRawText(event.target.value)}
                placeholder="Buy $30 of NVDA if under $140, max loss $8"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-5">
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={demoMode}
                  onChange={(event) => toggleDemo(event.target.checked)}
                />
                <span className="text-xs text-zinc-500">Demo Mode — no wallet required</span>
              </label>

              <button
                className="bg-[#5e6ad2] hover:bg-[#7170ff] text-white text-xs px-5 py-2.5 font-medium shrink-0 self-end sm:self-auto rounded-md shadow-sm transition-colors"
                onClick={() => void runVerify(rawText, scenario)}
                disabled={busy}
              >
                {busy ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Verifying…
                  </span>
                ) : (
                  "Verify intent →"
                )}
              </button>
            </div>
            {error && <div className="error-box mt-3 text-xs">{error}</div>}
          </div>

          <div className="mt-6 pt-5 border-t border-white/5">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2.5">
              Example prompts
            </h3>
            <div className="example-list">
              {EXAMPLE_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  className="example-btn text-xs text-zinc-300 font-mono hover:text-white"
                  onClick={() => setRawText(prompt)}
                >
                  <span className="text-[#7170ff] mr-2">›</span>
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
          className="bg-[#0f1011] border border-white/5 rounded-2xl p-6 shadow-2xl shadow-black/50 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-semibold text-zinc-100 m-0">Active hard policy</h2>
              <span className="text-[11px] text-zinc-500 font-mono">Fail-Closed Boundary</span>
            </div>
            <p className="text-xs text-zinc-400 mb-4">
              Any violation blocks the decision before execution is possible.
            </p>

            {policy ? (
              <div className="rounded-xl border border-white/5 overflow-hidden">
                <table className="w-full">
                  <tbody>
                    <tr className="border-b border-white/5">
                      <td className="text-xs text-zinc-400 py-3.5 px-5">Max position size</td>
                      <td className="text-xs font-mono text-zinc-100 py-3.5 px-5 text-right">${policy.maxPositionSizeUSD}</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="text-xs text-zinc-400 py-3.5 px-5">Allowed tickers</td>
                      <td className="text-xs font-mono text-zinc-100 py-3.5 px-5 text-right">{policy.allowedTickers.join(", ")}</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="text-xs text-zinc-400 py-3.5 px-5">Allowed direction</td>
                      <td className="text-xs font-mono text-zinc-100 py-3.5 px-5 text-right">{policy.allowedDirection}</td>
                    </tr>
                    <tr>
                      <td className="text-xs text-zinc-400 py-3.5 px-5">Max loss per trade</td>
                      <td className="text-xs font-mono text-zinc-100 py-3.5 px-5 text-right">${policy.maxLossPerTradeUSD}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty text-xs">Loading policy…</div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
            <span className="text-xs text-zinc-500">Configured in local session</span>
            <Link
              href="/policy"
              className="text-xs text-[#828fff] hover:text-white font-medium flex items-center gap-1 transition-colors"
            >
              Edit policy settings →
            </Link>
          </div>
        </motion.div>
      </div>

      <section className="bg-[#0f1011] border border-white/5 rounded-2xl p-6 shadow-2xl shadow-black/50 mb-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-semibold text-zinc-100 m-0">One-click demo scenarios</h2>
          <span className="text-[11px] text-zinc-500 font-mono">45–60s Presentation Flow</span>
        </div>
        <p className="text-xs text-zinc-400 mb-5">
          Each button fills the intent, enables Demo Mode, and runs the full verification flow.
          Use these for the judge demo.
        </p>
        <div className="scenario-grid">
          {DEMO_SCENARIOS.map((item) => (
            <button
              key={item.id}
              className={`scenario-btn ${item.expected === "ALLOW" ? "allow" : "block"}`}
              onClick={() => runDemoScenario(item.id, item.intent)}
              disabled={busy}
            >
              <div className="flex items-center justify-between w-full">
                <span className={`badge ${item.expected === "ALLOW" ? "badge-allow" : "badge-block"}`}>
                  {item.expected}
                </span>
                <span className="text-[10px] font-mono text-zinc-500 uppercase">{item.id}</span>
              </div>
              <strong className="text-sm font-semibold text-zinc-200 mt-1">{item.label}</strong>
              <small className="text-zinc-400">{item.description}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="bg-[#0f1011] border border-white/5 rounded-2xl p-6 shadow-2xl shadow-black/50 mb-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-semibold text-zinc-100 m-0">Recent decisions</h2>
          <span className="text-[11px] text-zinc-500 font-mono">Audit Log</span>
        </div>
        {recent.length === 0 ? (
          <div className="empty text-xs">No decisions yet. Verify an intent to see its Decision ID here.</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/5 mt-3">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="py-2.5 px-4 text-left">Decision ID</th>
                  <th className="py-2.5 px-4 text-left">Status</th>
                  <th className="py-2.5 px-4 text-left">Intent</th>
                  <th className="py-2.5 px-4 text-right">Created</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((decision) => (
                  <tr key={decision.decisionId} className="border-t border-white/5">
                    <td className="mono small py-3.5 px-5">
                      <Link href={`/verification/${decision.decisionId}`} className="text-[#828fff] hover:underline">
                        {decision.decisionId}
                      </Link>
                    </td>
                    <td className="py-3.5 px-5">
                      <span className={`badge ${decision.status === "ALLOW" ? "badge-allow" : "badge-block"}`}>
                        {decision.status}
                      </span>
                    </td>
                    <td className="small py-3.5 px-5 text-zinc-300 max-w-xs truncate">{decision.intent.rawText}</td>
                    <td className="muted small py-3.5 px-5 text-right whitespace-nowrap">
                      {new Date(decision.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="notice text-xs text-zinc-400 rounded-xl">
        Verification runs off-chain for speed and transparency. Private keys never reach this server.
        Live execution requires a connected wallet and a configured tokenized-stock token on Base.
      </div>

      <div className="mt-12">
        <OnchainActivity />
      </div>
    </div>
  );
}
