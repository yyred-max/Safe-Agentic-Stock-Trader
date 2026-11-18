import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import Nav from "@/components/Nav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Safe Agentic Stock Trader",
  description: "Intent verification and hard policy enforcement before any tokenized-stock trade on Base.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Suspense fallback={<div className="topbar" style={{ height: 58 }} />}>
          <Nav />
        </Suspense>
        <main className="flex-1">{children}</main>
        <footer className="footer" style={{ textAlign: "center", padding: "18px 20px" }}>
          Safe Agentic Stock Trader — the agent proposes, the system decides, the user confirms.
          {" "}MVP demo. Verification is off-chain; execution is signed by your wallet.
        </footer>
      </body>
    </html>
  );
}
