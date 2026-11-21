import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import Nav from "@/components/Nav";
import { WagmiProviders } from "@/providers/WagmiProviders";
import "./globals.css";

export const metadata: Metadata = {
  title: "Safe Agentic Stock Trader",
  description: "Intent verification and hard policy enforcement before any tokenized-stock trade on Base.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        <WagmiProviders>
          <Suspense fallback={<div className="topbar" style={{ height: 58 }} />}>
            <Nav />
          </Suspense>
          <main className="flex-1">{children}</main>
          <footer className="footer" style={{ textAlign: "center", padding: "18px 20px" }}>
            Safe Agentic Stock Trader — the agent proposes, the system decides, the user confirms.
            {" "}MVP demo. Verification is off-chain; execution is signed by your wallet.
          </footer>
        </WagmiProviders>
      </body>
    </html>
  );
}
