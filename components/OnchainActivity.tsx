"use client";

import { useEffect, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { erc20Abi, formatUnits, type Address } from "viem";

const TOKEN_ADDRESS = (process.env.NEXT_PUBLIC_TOKENIZED_STOCK_ADDRESS ||
  "0xd350E6acd5d558ADA0dc16f0eec0C6f333F1c604") as Address;
const TOKEN_DECIMALS = 18;

export default function OnchainActivity() {
  const { address, isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const {
    data: balance,
    isLoading,
    isError,
  } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: baseSepolia.id,
    query: { enabled: Boolean(address) },
  });

  const formattedBalance =
    balance !== undefined ? formatUnits(balance, TOKEN_DECIMALS) : null;

  const shortAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "";

  const explorerUrl = address
    ? `https://sepolia.basescan.org/address/${address}`
    : "https://sepolia.basescan.org";

  return (
    <section className="bg-[#0f1011] border border-white/5 rounded-2xl p-6 sm:p-8 py-10 sm:py-12 shadow-2xl shadow-black/50 mb-8">
      <p className="text-xs tracking-widest text-zinc-500 uppercase mb-2">
        Evidence before claims
      </p>
      <h2 className="text-3xl font-medium text-zinc-100 tracking-tight mb-6">
        Trace onchain activity and offchain reviews.
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left card: Tokenized Stock Vault */}
        <div className="relative rounded-xl border border-white/5 bg-white/[0.02] p-5 flex flex-col justify-between gap-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">
                Tokenized Stock Vault
              </h3>
              <p className="text-xs text-zinc-500 mt-1">
                ERC-20 mNVDA on Base Sepolia
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live onchain
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <p className="text-[10px] tracking-widest text-zinc-500 uppercase mb-1">
                Your balance
              </p>
              <p className="text-2xl font-mono text-zinc-100 break-all leading-tight">
                {!mounted
                  ? "Loading..."
                  : !address
                  ? "—"
                  : isLoading
                  ? "Loading…"
                  : isError
                  ? "Unavailable"
                  : formattedBalance}
              </p>
            </div>
            <div>
              <p className="text-[10px] tracking-widest text-zinc-500 uppercase mb-1">
                Token name
              </p>
              <p className="text-sm font-mono text-zinc-100">Mock NVDA</p>
            </div>
            <div>
              <p className="text-[10px] tracking-widest text-zinc-500 uppercase mb-1">
                Network
              </p>
              <p className="text-sm font-mono text-zinc-100">Base Sepolia</p>
            </div>
          </div>

          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#828fff] hover:text-white font-medium transition-colors self-start"
          >
            View on explorer →
          </a>
        </div>

        {/* Right card: Recent Activity / Status */}
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5 flex flex-col justify-between gap-6">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">
              Recent Activity / Status
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              Wallet connection and network state
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] tracking-widest text-zinc-500 uppercase">
                Wallet
              </span>
              {!mounted ? (
                <span className="text-xs text-zinc-500">Loading...</span>
              ) : isConnected && address ? (
                <span className="inline-flex items-center gap-2">
                  <span className="text-xs font-mono text-zinc-100">
                    {shortAddress}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Active
                  </span>
                </span>
              ) : (
                <span className="text-xs text-zinc-500">
                  Wallet not connected
                </span>
              )}
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] tracking-widest text-zinc-500 uppercase">
                Network
              </span>
              <span className="text-xs font-mono text-zinc-100">
                Base Sepolia (Chain ID: 84532)
              </span>
            </div>
          </div>

          <p className="text-xs text-zinc-500">
            Balances are read directly from the token contract via wagmi. No
            custodial keys are used.
          </p>
        </div>
      </div>
    </section>
  );
}
