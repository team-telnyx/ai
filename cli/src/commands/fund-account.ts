/**
 * telnyx-agent fund-account — Fund account via x402 USDC payment (EIP-712 signing).
 *
 * Flow:
 * 1. Check current balance
 * 2. Request payment quote
 * 3. Sign EIP-712 typed data (if wallet key provided)
 * 4. Submit payment
 * 5. Show new balance
 */

import { ethers } from "ethers";
import { TelnyxClient, TelnyxAPIError } from "../client.ts";
import { printSuccess, printError, outputJson, printWarning } from "../utils/output.ts";

// USDC on Base (EIP-3009 transferWithAuthorization)
const USDC_DOMAIN = {
  name: "USD Coin",
  version: "2",
  chainId: 8453,
  verifyingContract: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
};

const USDC_TYPES = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
};

interface FundAccountResult {
  previous_balance: string;
  funded_amount: string;
  quote_id: string;
  transaction_id?: string;
  status?: string;
  new_balance?: string;
  tx_hash?: string;
  payment_requirements?: Record<string, unknown>;
}

export async function fundAccountCommand(flags: Record<string, string | boolean>): Promise<void> {
  const client = new TelnyxClient();
  const jsonOutput = flags.json === true;
  const amount = flags.amount as string;
  const walletKey = flags["wallet-key"] as string | undefined;

  if (!amount) {
    printError("--amount is required (e.g., --amount 50.00)");
    process.exit(1);
  }

  const amountNum = parseFloat(amount);
  if (isNaN(amountNum) || amountNum <= 0) {
    printError("Invalid amount. Must be a positive number (e.g., 50.00)");
    process.exit(1);
  }

  try {
    // Step 1: Get current balance
    if (!jsonOutput) {
      console.log("\n💰 Fund Account via x402 (USDC on Base)");
      console.log("─────────────────────────────────────\n");
    }

    let previousBalance = "0.00";
    const balanceRes = await client.get("/balance");
    const balanceData = balanceRes.data as Record<string, unknown> | undefined;
    if (balanceData) {
      previousBalance = String(balanceData.balance ?? "0.00");
    }

    if (!jsonOutput) {
      console.log(`  Current Balance:    $${previousBalance} USD`);
      console.log(`  Funding Amount:     $${amount} USD`);
    }

    // Step 2: Request quote
    const quoteRes = await client.post("/x402/credit_account/quote", {
      amount_usd: amount,
    });

    const quoteData = quoteRes.data as Record<string, unknown>;
    const quoteId = String(quoteData.id);
    const paymentRequirements = quoteData.payment_requirements as Record<string, unknown> | undefined;
    const accepted = paymentRequirements?.accepts as Record<string, unknown>[] | undefined;
    const firstAccepted = accepted?.[0] as Record<string, unknown> | undefined;

    // Extract quote details
    const cryptoAmount = firstAccepted?.value as string | undefined;
    const payTo = firstAccepted?.payTo as string | undefined;
    const validBefore = paymentRequirements?.validBefore as number | undefined;
    const network = firstAccepted?.network as string | undefined;

    if (!jsonOutput) {
      console.log(`  Crypto Amount:      ${cryptoAmount || "N/A"} (USDC, 6 decimals)`);
      console.log(`  Network:            ${network || "Base"} (eip155:8453)`);
      console.log(`  Quote ID:           ${quoteId}`);
      if (validBefore) {
        const expiryDate = new Date(validBefore * 1000).toISOString();
        console.log(`  Expires:            ${expiryDate}`);
      }
      console.log();
    }

    // If no wallet key, output payment requirements for external signing
    if (!walletKey) {
      const result: FundAccountResult = {
        previous_balance: previousBalance,
        funded_amount: amount,
        quote_id: quoteId,
        payment_requirements: paymentRequirements,
      };

      if (jsonOutput) {
        outputJson(result);
      } else {
        console.log("  Payment Requirements (for external signing):");
        console.log("────────────────────────────────────────────────");
        console.log(JSON.stringify(paymentRequirements, null, 2));
        console.log();
        console.log("  Next Steps:");
        console.log("  1. Sign the EIP-712 typed data with your wallet");
        console.log("  2. Construct PaymentPayload v2");
        console.log("  3. Base64-encode the payload");
        console.log(`  4. POST to /v2/x402/credit_account with id: ${quoteId}`);
        console.log();
        console.log("  Or re-run with --wallet-key to sign automatically:");
        console.log(`  telnyx-agent fund-account --amount ${amount} --wallet-key 0x...`);
        console.log();
      }
      return;
    }

    // Step 3: Sign with wallet
    if (!jsonOutput) {
      console.log("  Signing with wallet...");
    }

    // Create wallet from private key
    let wallet: ethers.HDNodeWallet | ethers.Wallet;
    try {
      wallet = new ethers.Wallet(walletKey);
    } catch (err) {
      printError("Invalid wallet key. Must be a valid private key (0x...)");
      process.exit(1);
    }

    const walletAddress = wallet.address;
    if (!jsonOutput) {
      console.log(`  Signing with wallet: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`);
    }

    // Generate nonce
    const nonce = ethers.hexlify(ethers.randomBytes(32));

    // Build authorization object
    const authorization = {
      from: walletAddress,
      to: payTo || "",
      value: cryptoAmount || "0",
      validAfter: 0,
      validBefore: validBefore || Math.floor(Date.now() / 1000) + 3600, // Default 1 hour
      nonce: nonce,
    };

    // Sign EIP-712 typed data
    const signature = await wallet.signTypedData(
      USDC_DOMAIN,
      USDC_TYPES,
      authorization
    );

    if (!jsonOutput) {
      console.log("  ✓ Payment signed");
    }

    // Step 4: Construct PaymentPayload v2
    const paymentPayload = {
      x402Version: 2,
      resource: {
        url: "https://api.telnyx.com/v2/x402/credit_account",
        description: "Credit account via x402 payment",
        mimeType: "application/json",
      },
      accepted: firstAccepted || {},
      payload: {
        signature: signature,
        authorization: authorization,
      },
    };

    // Base64 encode
    const payloadBase64 = btoa(JSON.stringify(paymentPayload));

    // Step 5: Submit payment
    if (!jsonOutput) {
      console.log("  Submitting payment...");
    }

    const paymentRes = await client.post("/x402/credit_account", {
      id: quoteId,
      payment_signature: payloadBase64,
    });

    const paymentData = paymentRes.data as Record<string, unknown>;
    const transactionId = String(paymentData.id || paymentData.transaction_id || "");
    const status = String(paymentData.status || "pending");
    const txHash = paymentData.tx_hash as string | undefined;

    if (!jsonOutput) {
      console.log("  ✓ Payment submitted");
      console.log();
    }

    // Step 6: Get new balance
    let newBalance = "N/A";
    try {
      const newBalanceRes = await client.get("/balance");
      const newBalanceData = newBalanceRes.data as Record<string, unknown> | undefined;
      if (newBalanceData) {
        newBalance = String(newBalanceData.balance ?? "N/A");
      }
    } catch {
      // Balance check failed — continue
    }

    const result: FundAccountResult = {
      previous_balance: previousBalance,
      funded_amount: amount,
      quote_id: quoteId,
      transaction_id: transactionId,
      status: status,
      new_balance: newBalance,
      tx_hash: txHash,
    };

    if (jsonOutput) {
      outputJson(result);
    } else {
      console.log("─────────────────────────────────────");
      console.log(`  Transaction:        ${transactionId}`);
      console.log(`  Status:             ${status}`);
      console.log(`  New Balance:        $${newBalance} USD`);
      if (txHash) {
        console.log(`  TX Hash:            ${txHash}`);
      }
      console.log();
    }

  } catch (err) {
    const errorMsg = err instanceof TelnyxAPIError
      ? `${err.detail} (HTTP ${err.statusCode})`
      : err instanceof Error
        ? err.message
        : String(err);

    if (jsonOutput) {
      outputJson({ error: errorMsg });
    } else {
      printError(errorMsg);
    }
    process.exit(1);
  }
}
