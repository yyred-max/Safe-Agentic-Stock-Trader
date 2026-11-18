"use client";

import type { ExecutionReceipt } from "./types";
import { createSimulatedTxHash } from "./decision/id";

export const BASE_CHAIN = {
  id: 8453,
  name: "Base",
  rpcUrls: ["https://mainnet.base.org"],
  blockExplorerUrls: ["https://basescan.org"],
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
};

export const BASE_SEPOLIA_CHAIN = {
  id: 84532,
  name: "Base Sepolia",
  rpcUrls: ["https://sepolia.base.org"],
  blockExplorerUrls: ["https://sepolia.basescan.org"],
  nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
};

interface EIP1193Provider {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
}

declare global {
  interface Window {
    ethereum?: EIP1193Provider;
  }
}

export function hasWallet(): boolean {
  return typeof window !== "undefined" && Boolean(window.ethereum);
}

export async function connectWallet(): Promise<string> {
  if (!hasWallet() || !window.ethereum) throw new Error("No injected wallet found. Install a browser wallet that supports Base.");
  const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
  if (!accounts?.[0]) throw new Error("Wallet connection was rejected.");
  return accounts[0];
}

export async function getConnectedAccount(): Promise<string | null> {
  if (!hasWallet() || !window.ethereum) return null;
  try {
    const accounts = (await window.ethereum.request({ method: "eth_accounts" })) as string[];
    return accounts?.[0] ?? null;
  } catch {
    return null;
  }
}

export async function ensureBaseChain(chainId: number = BASE_CHAIN.id): Promise<void> {
  if (!window.ethereum) throw new Error("Wallet not available.");
  const current = (await window.ethereum.request({ method: "eth_chainId" })) as string;
  if (parseInt(current, 16) === chainId) return;

  const target = chainId === BASE_SEPOLIA_CHAIN.id ? BASE_SEPOLIA_CHAIN : BASE_CHAIN;
  const chainIdHex = `0x${chainId.toString(16)}`;
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });
  } catch (error) {
    const code = (error as { code?: number }).code;
    if (code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: chainIdHex,
            chainName: target.name,
            rpcUrls: target.rpcUrls,
            blockExplorerUrls: target.blockExplorerUrls,
            nativeCurrency: target.nativeCurrency,
          },
        ],
      });
    } else {
      throw error;
    }
  }
}

/** Minimal ERC-20 transfer calldata: transfer(address,uint256). */
function encodeTransfer(to: string, amountWei: bigint): string {
  const selector = "a9059cbb";
  const paddedAddress = to.replace(/^0x/, "").toLowerCase().padStart(64, "0");
  const paddedAmount = amountWei.toString(16).padStart(64, "0");
  return `0x${selector}${paddedAddress}${paddedAmount}`;
}

function explorerTxUrl(chainId: number, hash: string): string {
  const explorer = chainId === BASE_SEPOLIA_CHAIN.id ? "https://sepolia.basescan.org" : "https://basescan.org";
  return `${explorer}/tx/${hash}`;
}

/**
 * Live execution path. Requires a tokenized-stock ERC-20 address configured in
 * NEXT_PUBLIC_TOKENIZED_STOCK_ADDRESS. The amount is interpreted in token base
 * units via NEXT_PUBLIC_TOKEN_DECIMALS (default 6), matching common stock tokens.
 */
export async function executeOnBase(
  decisionId: string,
  account: string,
  amountUSD: number,
  chainId: number = BASE_CHAIN.id
): Promise<ExecutionReceipt> {
  const tokenAddress = process.env.NEXT_PUBLIC_TOKENIZED_STOCK_ADDRESS;
  const decimals = Number(process.env.NEXT_PUBLIC_TOKEN_DECIMALS ?? "6");
  if (!tokenAddress || !/^0x[a-fA-F0-9]{40}$/.test(tokenAddress)) {
    throw new Error("Live execution is not configured: set NEXT_PUBLIC_TOKENIZED_STOCK_ADDRESS to a tokenized-stock token on Base.");
  }
  await ensureBaseChain(chainId);
  const amountWei = BigInt(Math.round(amountUSD * 10 ** decimals));
  const txHash = (await window.ethereum?.request({
    method: "eth_sendTransaction",
    params: [
      {
        from: account,
        to: tokenAddress,
        data: encodeTransfer(account, amountWei),
      },
    ],
  })) as string;

  if (!txHash || !txHash.startsWith("0x")) throw new Error("Wallet did not return a transaction hash.");

  return {
    decisionId,
    txHash,
    chainId,
    chainName: chainId === BASE_SEPOLIA_CHAIN.id ? "Base Sepolia" : "Base",
    explorerUrl: explorerTxUrl(chainId, txHash),
    mode: "live",
    simulated: false,
    createdAt: new Date().toISOString(),
  };
}

/** Demo-Mode execution: produces a well-formed but explicitly simulated hash. */
export function executeInDemo(decisionId: string, chainId: number = BASE_CHAIN.id): ExecutionReceipt {
  const txHash = createSimulatedTxHash();
  return {
    decisionId,
    txHash,
    chainId,
    chainName: chainId === BASE_SEPOLIA_CHAIN.id ? "Base Sepolia" : "Base",
    explorerUrl: explorerTxUrl(chainId, txHash),
    mode: "demo",
    simulated: true,
    createdAt: new Date().toISOString(),
  };
}
