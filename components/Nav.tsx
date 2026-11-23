"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { loadDemoMode } from "@/lib/store";

const LINKS = [
  { href: "/", label: "Intent" },
  { href: "/policy", label: "Policy" },
];

export default function Nav() {
  const pathname = usePathname();
  const [demoMode, setDemoMode] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDemoMode(loadDemoMode());
    const onStorage = () => setDemoMode(loadDemoMode());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [pathname]);

  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-[1080px] mx-auto px-6 h-14 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-sm tracking-tight text-zinc-100 hover:text-white transition-colors">
          <span className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-gradient-to-br from-[#5e6ad2] to-[#7170ff] ring-1 ring-inset ring-white/20 shadow-sm flex items-center justify-center overflow-hidden shrink-0">
              <Image src="/logo.png" alt="Logo" width={24} height={24} className="object-contain" />
            </span>
            <span>SAFE<span className="text-[#7170ff] mx-0.5 font-extrabold">/</span>AGENTIC STOCK TRADER</span>
          </span>
        </Link>

        <nav className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-1">
            {LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                    active
                      ? "text-zinc-100 font-medium bg-white/[0.08] ring-1 ring-inset ring-white/5"
                      : "text-zinc-500 hover:text-zinc-200 hover:bg-white/5"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          <span
            className={`hidden sm:inline-flex items-center text-[10px] font-semibold tracking-wider uppercase px-2.5 py-0.5 rounded-full border ${
              demoMode
                ? "bg-[#7170ff]/10 text-[#a5b4fc] border-[#7170ff]/25"
                : "bg-white/[0.03] text-zinc-400 border-white/10"
            }`}
          >
            {demoMode ? "DEMO MODE" : "LIVE INTENT"}
          </span>

          {!mounted ? (
            <div className="w-24 h-8 animate-pulse bg-white/10 rounded-md" />
          ) : isConnected ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-mono bg-white/[0.04] text-zinc-300 border border-white/10">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {shortAddress}
              </span>
              <button
                className="px-2.5 py-1 text-[11px] text-zinc-500 hover:text-zinc-200 border border-white/5 hover:border-white/15 rounded-md transition-colors bg-transparent hover:bg-white/5"
                onClick={() => disconnect()}
                title="Disconnect wallet"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              className="px-3.5 py-1.5 text-xs font-medium rounded-md bg-gradient-to-r from-[#5e6ad2] to-[#7170ff] hover:brightness-105 text-white shadow-sm border border-white/10 transition-all disabled:opacity-50"
              onClick={() => {
                const connector = connectors[0];
                if (connector) connect({ connector });
              }}
              disabled={isConnecting}
            >
              {isConnecting ? "Connecting…" : "Connect Wallet"}
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
