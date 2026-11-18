"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { loadDemoMode } from "@/lib/store";

const LINKS = [
  { href: "/", label: "Intent" },
  { href: "/policy", label: "Policy" },
];

export default function Nav() {
  const pathname = usePathname();
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDemoMode(loadDemoMode());
    const onStorage = () => setDemoMode(loadDemoMode());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [pathname]);

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
        </nav>
      </div>
    </header>
  );
}
