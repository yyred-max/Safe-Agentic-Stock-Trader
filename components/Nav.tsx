"use client";

import Link from "next/link";
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
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();

  const [navClaiming, setNavClaiming] = useState(false);
  const [navClaimStatus, setNavClaimStatus] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDemoMode(loadDemoMode());
    const onStorage = () => setDemoMode(loadDemoMode());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [pathname]);

  async function handleNavClaim() {
    if (!address) return;
    setNavClaiming(true);
    setNavClaimStatus("");
    try {
      const res = await fetch("/api/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userAddress: address }),
      });
      const data = (await res.json()) as { success?: boolean; message?: string; error?: string };
      if (!res.ok || !data.success) throw new Error(data.error ?? "Failed");
      setNavClaimStatus("✓ 100 mNVDA + Gas Sent!");
      setTimeout(() => setNavClaimStatus(""), 6000);
    } catch {
      setNavClaimStatus("✗ Claim failed");
      setTimeout(() => setNavClaimStatus(""), 5000);
    } finally {
      setNavClaiming(false);
    }
  }

  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href="/" className="brand">
          SAFE<span className="brand-accent">/</span>AGENTIC STOCK TRADER
        </Link>
        <nav className="nav">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={pathname === link.href ? "active" : ""}>
              {link.label}
            </Link>
          ))}
          <span className={`badge ${demoMode ? "badge-accent" : ""}`}>
            {demoMode ? "DEMO MODE" : "LIVE INTENT"}
          </span>

          {isConnected ? (
            <div className="row" style={{ gap: 8 }}>
              <span className="badge badge-allow mono small">{shortAddress}</span>
              <button
                className="btn-primary btn-sm"
                onClick={() => void handleNavClaim()}
                disabled={navClaiming}
                title="Claim 100 mNVDA and 0.0001 ETH for gas"
              >
                {navClaiming
                  ? "Claiming..."
                  : navClaimStatus
                  ? navClaimStatus
                  : "Claim Faucet (mNVDA + Gas)"}
              </button>
              <button
                className="btn-ghost btn-sm"
                onClick={() => disconnect()}
                title="Disconnect wallet"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              className="btn-primary btn-sm"
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
