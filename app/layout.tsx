import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense, type ReactNode } from "react";
import Nav from "@/components/Nav";
import SmoothScroll from "@/providers/SmoothScroll";
import { WagmiProviders } from "@/providers/WagmiProviders";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Safe Agentic Stock Trader",
  description: "Intent verification and hard policy enforcement before any tokenized-stock trade on Base.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#08090a] text-zinc-300">
        <WagmiProviders>
          <Suspense fallback={<div className="topbar" style={{ height: 58 }} />}>
            <Nav />
          </Suspense>
          <SmoothScroll>
            <main className="flex-1 pt-20">{children}</main>
          </SmoothScroll>
        </WagmiProviders>
      </body>
    </html>
  );
}