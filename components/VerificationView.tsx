"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { erc20Abi, parseUnits, type Address, type Hash } from "viem";
import {
  useAccount,
  useConnect,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { getDecision, getReceipt, loadDemoMode, saveReceipt } from "@/lib/store";
import { executeInDemo } from "@/lib/wallet";
import type { Decision, ExecutionReceipt } from "@/lib/types";

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
  const direction =
    /\b(sell|jual|menjual|penjualan|short)\b/i.test(rawText) &&
    !/\b(buy|beli|membeli|pembelian|long)\b/i.test(rawText)
      ? "SELL"
      : "BUY";
  const tickers = (rawText.match(/\b[A-Z]{2,5}\b/g) ?? []).filter(
    (t) => !["USD", "LIMIT", "MARKET", "MAX", "LOSS", "BUY", "SELL", "BELI", "JUAL"].includes(t)
  );
  const cleaned = rawText
    .replace(/(?:under|below|limit)\s*\$?\s*\d+(?:\.\d+)?/gi, "")
    .replace(/(?:max\s*loss|stop\s*loss|risk)\s*\$?\s*\d+(?:\.\d+)?/gi, "");
  const amount =
    cleaned.match(/\$\s*(\d+(?:\.\d+)?)/)?.[1] ??
    cleaned.match(/\b(\d+(?:\.\d+)?)\s*(?:usd|dollars?)/i)?.[1] ??
    "—";
  const limit = rawText.match(/(?:under|below|at|limit)\s*\$?\s*(\d+(?:\.\d+)?)/i)?.[1] ?? "—";
  const maxLoss = rawText.match(/(?:max\s*loss|stop\s*loss|risk)\s*\$?\s*(\d+(?:\.\d+)?)/i)?.[1] ?? "—";
  return { direction, ticker: tickers[0] ?? "—", amount, limit, maxLoss };
}

export default function VerificationView({ decisionId }: { decisionId: string }) {
  const router = useRouter();
  const [decision, setDecision] = useState<Decision | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [executionError, setExecutionError] = useState("");
  const [txHash, setTxHash] = useState<Hash | null>(null);

  // Spotlight mouse tracking state
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  // Wagmi hooks
  const { address, isConnected, chainId } = useAccount();
  const { connectAsync, connectors } = useConnect();
  const { switchChainAsync } = useSwitchChain();
  const {
    writeContractAsync,
    isPending: isWritePending,
    error: writeError,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash ?? undefined,
  });

  useEffect(() => {
    const found = getDecision(decisionId);
    setDecision(found ?? null);
    setDemoMode(loadDemoMode());
    setLoaded(true);

    const existingReceipt = getReceipt(decisionId);
    if (existingReceipt) {
      setTxHash(existingReceipt.txHash as Hash);
    }
  }, [decisionId]);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }

  async function handleExecute() {
    if (!decision) return;
    setSubmitting(true);
    setExecutionError("");

    try {
      if (demoMode) {
        // Demo Mode (simulated)
        const receipt = executeInDemo(decision.decisionId, baseSepolia.id);
        saveReceipt(receipt);
        setTxHash(receipt.txHash as Hash);
        return;
      }

      // Live Execution with Wagmi & ERC-20 transfer
      let userAddress = address;

      // Ensure wallet is connected
      if (!isConnected || !userAddress) {
        const connector = connectors[0];
        if (!connector) {
          throw new Error("No wallet connector found. Please install MetaMask or another Web3 wallet.");
        }
        const res = await connectAsync({ connector });
        userAddress = res.accounts[0];
      }

      if (!userAddress) {
        throw new Error("No wallet address available.");
      }

      // Ensure Base Sepolia network (Chain ID: 84532)
      if (chainId !== baseSepolia.id && switchChainAsync) {
        await switchChainAsync({ chainId: baseSepolia.id });
      }

      const tokenAddress = (process.env.NEXT_PUBLIC_TOKENIZED_STOCK_ADDRESS ||
        "0xd350E6acd5d558ADA0dc16f0eec0C6f333F1c604") as Address;

      // 18 decimals -> nominal amountUSD * 10^18
      const amountWei = parseUnits(decision.action.amountUSD.toString(), 18);

      // Call transfer(to, amount) on ERC-20 token
      const hash = await writeContractAsync({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "transfer",
        args: [userAddress, amountWei],
        chainId: baseSepolia.id,
      });

      setTxHash(hash);

      const receipt: ExecutionReceipt = {
        decisionId: decision.decisionId,
        txHash: hash,
        chainId: baseSepolia.id,
        chainName: "Base Sepolia",
        explorerUrl: `https://sepolia.basescan.org/tx/${hash}`,
        mode: "live",
        simulated: false,
        createdAt: new Date().toISOString(),
      };
      saveReceipt(receipt);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Execution failed.";
      setExecutionError(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!loaded) return <div className="container pt-6 text-zinc-400">Loading verification…</div>;
  if (!decision) {
    return (
      <div className="container pt-8 pb-16">
        <h1 className="text-2xl font-bold text-zinc-100">Decision not found</h1>
        <p className="text-zinc-400 mt-2">
          This Decision ID is not stored in this browser. Run the intent again from the{" "}
          <Link href="/" className="text-[#828fff] underline">home page</Link>.
        </p>
      </div>
    );
  }

  const signals = intentSignals(decision.intent.rawText);
  const failedRules = new Set(decision.policyViolations);
  const isAllowed = decision.status === "ALLOW";
  const isBusy = submitting || isWritePending || isConfirming;

  return (
    <div className="container pt-8 pb-16">
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase text-zinc-400 bg-white/[0.03] border border-white/5 mb-3">
          <span className={`w-1.5 h-1.5 rounded-full ${isAllowed ? "bg-emerald-400" : "bg-rose-400"}`} />
          Policy Engine Evaluation
        </div>
      </div>

      {/* Spotlight Verdict Card — gradient mask + cursor-following radial glow */}
      <div className={`gradient-border-card mb-8 ${isAllowed ? "is-allow" : "is-block"}`}>
        <div
          className={`verdict-card rounded-2xl px-8 py-10 text-center ${
            isAllowed ? "verdict-allow" : "verdict-block"
          } ${isHovered ? "is-hovered" : ""}`}
          style={{ "--mx": `${mousePos.x}px`, "--my": `${mousePos.y}px` } as CSSProperties}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
        <div className="inline-flex items-center gap-2 mb-2">
          <span
            className={`text-5xl sm:text-6xl font-medium tracking-tight leading-none ${
              isAllowed ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {decision.status}
          </span>
        </div>
        <p className="text-zinc-400 text-sm max-w-lg mx-auto mt-3 leading-relaxed">
          {isAllowed
            ? "All checks passed. Execution is possible only after your explicit confirmation."
            : "Execution is disabled. The proposed action violated one or more hard checks."}
        </p>

        <div className="mt-6 pt-4 border-t border-white/5 max-w-md mx-auto flex flex-col items-center gap-1.5">
          <div className="text-xs font-mono text-zinc-500 break-all">
            Decision ID: <span className="text-zinc-400">{decision.decisionId}</span>
          </div>
          <div className="text-[11px] text-zinc-500">
            {new Date(decision.createdAt).toLocaleString()} · {demoMode ? "Demo Mode (Simulated)" : "Live Intent"}
          </div>
        </div>
        </div>
      </div>

      {!isAllowed && (
        <section className="gradient-border-card is-block p-6 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            <h2 className="text-[15px] font-medium tracking-tight text-zinc-100 m-0">Why this was blocked</h2>
          </div>
          <ul className="reasons">
            {decision.reasons.map((reason, index) => (
              <li key={`${decision.policyViolations[index] ?? "reason"}-${index}`}>
                <code>{decision.policyViolations[index] ?? "RULE"}</code>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
          <div className="notice mt-4 text-xs">
            No transaction was sent. The confirmation gate is permanently disabled for a BLOCK decision.
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <section className="gradient-border-card p-6">
          <h2 className="text-[15px] font-medium tracking-tight text-zinc-100 mb-2">Original intent</h2>
          <div className="p-4 rounded-xl bg-[#0a0b0c] border border-white/5 text-sm font-mono text-zinc-200 italic leading-relaxed">
            “{decision.intent.rawText}”
          </div>
          <div className="text-[11px] font-mono text-zinc-500 mt-3">
            intent id: <span className="text-zinc-400">{decision.intent.id}</span>
          </div>
        </section>

        <section className="gradient-border-card p-6">
          <h2 className="text-[15px] font-medium tracking-tight text-zinc-100 mb-2">Structured action (proposed)</h2>
          <div className="rounded-xl border border-white/5 overflow-hidden">
            <table className="w-full">
              <tbody>
                <tr className="border-b border-white/5">
                  <td className="text-xs text-zinc-400 py-2.5 px-4">actionType</td>
                  <td className="text-xs font-mono text-zinc-100 py-2.5 px-4 text-right font-semibold">{decision.action.actionType}</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="text-xs text-zinc-400 py-2.5 px-4">ticker</td>
                  <td className="text-xs font-mono text-zinc-100 py-2.5 px-4 text-right font-semibold">{decision.action.ticker}</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="text-xs text-zinc-400 py-2.5 px-4">amountUSD</td>
                  <td className="text-xs font-mono text-zinc-100 py-2.5 px-4 text-right">${decision.action.amountUSD}</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="text-xs text-zinc-400 py-2.5 px-4">orderType</td>
                  <td className="text-xs font-mono text-zinc-100 py-2.5 px-4 text-right">{decision.action.orderType}</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="text-xs text-zinc-400 py-2.5 px-4">limitPrice</td>
                  <td className="text-xs font-mono text-zinc-100 py-2.5 px-4 text-right">{decision.action.limitPrice ?? "—"}</td>
                </tr>
                <tr>
                  <td className="text-xs text-zinc-400 py-2.5 px-4">maxLoss</td>
                  <td className="text-xs font-mono text-zinc-100 py-2.5 px-4 text-right">{decision.action.maxLoss ?? "—"}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-zinc-400 mt-3 italic">{decision.action.reasoning}</p>
        </section>
      </div>

      {/* Intent vs Action Table */}
      <section className="gradient-border-card p-6 mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-medium tracking-tight text-zinc-100 m-0">Intent vs action</h2>
          <span className="text-[11px] font-mono text-zinc-500">Cross-Validation Matrix</span>
        </div>

        <figure className="mb-5 rounded-r-lg border-l-2 border-[#7170ff] bg-white/5 px-5 py-4">
          <figcaption className="text-xs uppercase text-zinc-500 mb-2">
            AI&apos;s Understanding of Your Intent
          </figcaption>
          <blockquote className="m-0 text-sm italic text-zinc-300 leading-relaxed">
            “{decision.action.paraphrasedIntent || decision.paraphrasedIntent || decision.intent.rawText}”
          </blockquote>
        </figure>

        <div className="overflow-x-auto rounded-xl border border-white/5">
          <table className="w-full">
            <thead>
              <tr>
                <th className="py-3 px-5 text-left">Field</th>
                <th className="py-3 px-5 text-left">Intent signal</th>
                <th className="py-3 px-5 text-left">Proposed action</th>
                <th className="py-3 px-5 text-right">Result</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-white/5">
                <td className="py-4 px-5 font-medium text-zinc-300">Direction</td>
                <td className="py-4 px-5 font-mono text-zinc-400">{signals.direction}</td>
                <td className="py-4 px-5 font-mono text-zinc-200">{decision.action.actionType}</td>
                <td className="py-4 px-5 text-right">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      signals.direction === decision.action.actionType
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-rose-500/10 text-rose-400"
                    }`}
                  >
                    {signals.direction === decision.action.actionType ? "MATCH" : "MISMATCH"}
                  </span>
                </td>
              </tr>
              <tr className="border-t border-white/5">
                <td className="py-4 px-5 font-medium text-zinc-300">Ticker</td>
                <td className="py-4 px-5 font-mono text-zinc-400">{signals.ticker}</td>
                <td className="py-4 px-5 font-mono text-zinc-200">{decision.action.ticker}</td>
                <td className="py-4 px-5 text-right">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      signals.ticker === decision.action.ticker
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-rose-500/10 text-rose-400"
                    }`}
                  >
                    {signals.ticker === decision.action.ticker ? "MATCH" : "MISMATCH"}
                  </span>
                </td>
              </tr>
              <tr className="border-t border-white/5">
                <td className="py-4 px-5 font-medium text-zinc-300">Amount (USD)</td>
                <td className="py-4 px-5 font-mono text-zinc-400">${signals.amount}</td>
                <td className="py-4 px-5 font-mono text-zinc-200">${decision.action.amountUSD}</td>
                <td className="py-4 px-5 text-right">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      Number(signals.amount) === decision.action.amountUSD
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-rose-500/10 text-rose-400"
                    }`}
                  >
                    {Number(signals.amount) === decision.action.amountUSD ? "MATCH" : "MISMATCH"}
                  </span>
                </td>
              </tr>
              <tr className="border-t border-white/5">
                <td className="py-4 px-5 font-medium text-zinc-300">Limit / under</td>
                <td className="py-4 px-5 font-mono text-zinc-400">{signals.limit}</td>
                <td className="py-4 px-5 font-mono text-zinc-200">{decision.action.limitPrice ?? "—"}</td>
                <td className="py-4 px-5 text-right">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      String(signals.limit) === String(decision.action.limitPrice ?? "—")
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-rose-500/10 text-rose-400"
                    }`}
                  >
                    {String(signals.limit) === String(decision.action.limitPrice ?? "—") ? "MATCH" : "MISMATCH"}
                  </span>
                </td>
              </tr>
              <tr className="border-t border-white/5">
                <td className="py-4 px-5 font-medium text-zinc-300">Max loss</td>
                <td className="py-4 px-5 font-mono text-zinc-400">{signals.maxLoss}</td>
                <td className="py-4 px-5 font-mono text-zinc-200">{decision.action.maxLoss ?? "—"}</td>
                <td className="py-4 px-5 text-right">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      String(signals.maxLoss) === String(decision.action.maxLoss ?? "—")
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-rose-500/10 text-rose-400"
                    }`}
                  >
                    {String(signals.maxLoss) === String(decision.action.maxLoss ?? "—") ? "MATCH" : "MISMATCH"}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Policy & Provenance Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <section className="gradient-border-card p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-medium tracking-tight text-zinc-100 m-0">Policy check results</h2>
            <span className="text-[11px] font-mono text-zinc-500">7 Hard Rules</span>
          </div>
          <div className="overflow-x-auto rounded-xl border border-white/5">
            <table className="w-full">
              <tbody>
                {RULE_LABELS.map((rule) => {
                  const failed = [...failedRules].some((v) => v.startsWith(rule.key));
                  return (
                    <tr key={rule.key} className="border-b border-white/5 last:border-none">
                      <td className="py-4 px-5 text-xs font-medium text-zinc-300">{rule.label}</td>
                      <td className="py-4 px-5 text-right">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            !failed
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-rose-500/10 text-rose-400"
                          }`}
                        >
                          {!failed ? "PASS" : "FAIL"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="gradient-border-card p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-medium tracking-tight text-zinc-100 m-0">Field-level provenance</h2>
            <span className="text-[11px] font-mono text-zinc-500">Extraction Confidence</span>
          </div>
          <div className="overflow-x-auto rounded-xl border border-white/5">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="py-2.5 px-4 text-left">Field</th>
                  <th className="py-2.5 px-4 text-left">Source</th>
                  <th className="py-2.5 px-4 text-right">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(decision.provenance).map(([field, entry]) => (
                  <tr key={field} className="border-t border-white/5">
                    <td className="mono small py-4 px-5 text-zinc-300">{field}</td>
                    <td className="small py-4 px-5 text-zinc-400">{entry.source}</td>
                    <td className="py-4 px-5 text-right">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          entry.confidence === "high"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : entry.confidence === "low"
                            ? "bg-rose-500/10 text-rose-400"
                            : "bg-[#7170ff]/10 text-[#828fff]"
                        }`}
                      >
                        {entry.confidence}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Confirmation Gate */}
      {isAllowed && (
        <section className="gradient-border-card is-allow p-7 mb-8 overflow-hidden">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="text-[15px] font-medium tracking-tight text-zinc-100 m-0">User confirmation gate</h2>
          </div>

          {txHash ? (
            <div className="mt-4">
              <div className="p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
                <div className="flex items-center gap-2 mb-3">
                  <span className="badge badge-allow">
                    {demoMode ? "SIMULATED" : isConfirmed ? "CONFIRMED ON-CHAIN" : "SUBMITTED"}
                  </span>
                  <span className="badge">Base Sepolia</span>
                </div>
                <p className="text-sm font-semibold text-zinc-100 mb-2">
                  {demoMode
                    ? "Simulated transaction created successfully:"
                    : isConfirmed
                    ? "Transaction confirmed successfully on Base Sepolia!"
                    : "Transaction submitted to mempool (waiting for block confirmation):"}
                </p>
                <div className="mb-6">
                  <span className="text-xs text-zinc-400">Transaction Hash: </span>
                  <code className="mono hash text-xs text-emerald-400 block mt-1 break-all bg-black/40 p-2.5 rounded-lg border border-emerald-500/20">
                    {txHash}
                  </code>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <a
                    className="btn-primary text-xs px-4 py-2"
                    href={`https://sepolia.basescan.org/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View on BaseScan ↗
                  </a>
                  <button
                    className="btn-ghost text-xs px-4 py-2"
                    onClick={() => router.push(`/execution/${decision.decisionId}`)}
                  >
                    View Full Execution Receipt →
                  </button>
                </div>
              </div>
            </div>
          ) : !confirming ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-3">
              <p className="text-xs text-zinc-400 m-0 max-w-xl">
                An ALLOW decision is not an automatic execution. You must explicitly review and sign the exact action above.
              </p>
              <button className="btn-primary text-xs px-5 py-2.5 font-semibold shrink-0" onClick={() => setConfirming(true)}>
                Confirm &amp; Execute →
              </button>
            </div>
          ) : (
            <div className="mt-4">
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-zinc-300 leading-relaxed mb-4">
                You are about to execute <strong className="text-zinc-100">{decision.action.actionType} ${decision.action.amountUSD}</strong> of{" "}
                <strong className="text-zinc-100">{decision.action.ticker}</strong> on{" "}
                <span className="text-[#828fff] font-semibold">{demoMode ? "Demo Mode (simulated)" : "Base Sepolia"}</span>.
                <br />
                <span className="text-zinc-500">Token Contract:</span>{" "}
                <span className="mono text-zinc-400">
                  {process.env.NEXT_PUBLIC_TOKENIZED_STOCK_ADDRESS || "0xd350E6acd5d558ADA0dc16f0eec0C6f333F1c604"}
                </span>
                <br />
                <span className="text-zinc-500">Decision ID:</span> <span className="mono text-zinc-400">{decision.decisionId}</span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  className="btn-success text-xs px-5 py-2.5 font-semibold"
                  onClick={() => void handleExecute()}
                  disabled={isBusy}
                >
                  {isWritePending
                    ? "Check wallet (Signing…)"
                    : isConfirming
                    ? "Confirming on Base Sepolia…"
                    : submitting
                    ? "Preparing…"
                    : demoMode
                    ? "Yes — simulate execution"
                    : "Yes — execute via wagmi"}
                </button>
                <button
                  className="btn-ghost text-xs px-4 py-2.5"
                  onClick={() => setConfirming(false)}
                  disabled={isBusy}
                >
                  Cancel
                </button>
                {!demoMode && address && <span className="text-xs font-mono text-zinc-500 ml-2">{address}</span>}
                {!demoMode && !isConnected && <span className="text-xs text-zinc-500 ml-2">Wallet will prompt to connect</span>}
              </div>

              {(executionError || writeError) && (
                <div className="error-box text-xs mt-3">
                  {executionError || writeError?.message}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      <p className="text-xs text-zinc-500 mt-6">
        <Link href="/" className="text-[#828fff] hover:underline flex items-center gap-1">
          ← Back to new intent
        </Link>
      </p>
    </div>
  );
}
