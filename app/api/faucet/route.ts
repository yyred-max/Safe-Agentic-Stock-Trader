import { NextRequest } from "next/server";
import {
  createWalletClient,
  createPublicClient,
  http,
  isAddress,
  parseEther,
  parseUnits,
  erc20Abi,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "wagmi/chains";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { userAddress?: string };
    const userAddress = body.userAddress?.trim();

    if (!userAddress || !isAddress(userAddress)) {
      return Response.json(
        { error: "Invalid Ethereum address provided." },
        { status: 400 }
      );
    }

    const rawKey = process.env.FAUCET_PRIVATE_KEY?.trim();
    if (!rawKey || rawKey === "0x...") {
      return Response.json(
        {
          error:
            "Faucet wallet is not configured. Please set FAUCET_PRIVATE_KEY in .env.",
        },
        { status: 500 }
      );
    }

    const formattedKey = (
      rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`
    ) as Hex;

    const faucetAccount = privateKeyToAccount(formattedKey);
    const rpcUrl = "https://sepolia.base.org";

    const walletClient = createWalletClient({
      account: faucetAccount,
      chain: baseSepolia,
      transport: http(rpcUrl),
    });

    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(rpcUrl),
    });

    const tokenAddress = (process.env.NEXT_PUBLIC_TOKENIZED_STOCK_ADDRESS ||
      "0xd350E6acd5d558ADA0dc16f0eec0C6f333F1c604") as Address;

    // 1. Send 0.0001 ETH for gas
    const ethTxHash = await walletClient.sendTransaction({
      to: userAddress as Address,
      value: parseEther("0.0001"),
    });

    // 2. Send 100 mNVDA (18 decimals)
    const tokenTxHash = await walletClient.writeContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: "transfer",
      args: [userAddress as Address, parseUnits("100", 18)],
    });

    return Response.json({
      success: true,
      message: "Berhasil! 100 mNVDA & Gas terkirim ke wallet Anda.",
      ethTxHash,
      tokenTxHash,
      txHash: tokenTxHash,
      explorerUrl: `https://sepolia.basescan.org/tx/${tokenTxHash}`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Faucet request failed.";
    return Response.json({ error: message }, { status: 500 });
  }
}
