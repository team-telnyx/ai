/**
 * telnyx-agent status — Account health at a glance.
 * Uses direct REST calls via TelnyxClient (no Go CLI dependency).
 */

import { TelnyxClient, TelnyxAPIError } from "../client.ts";
import { outputJson, printWarning } from "../utils/output.ts";

interface StatusResult {
  balance: { available: string; amount: string; currency: string; credit_limit: string };
  phone_numbers: { total: number; active: number };
  messaging_profiles: { total: number };
  connections: { total: number };
  ai_assistants: { total: number };
  warnings: string[];
}

export async function statusCommand(flags: Record<string, string | boolean>): Promise<void> {
  const jsonOutput = flags.json === true;
  const client = new TelnyxClient();

  const results: StatusResult = {
    balance: { available: "0.00", amount: "0.00", currency: "USD", credit_limit: "0.00" },
    phone_numbers: { total: 0, active: 0 },
    messaging_profiles: { total: 0 },
    connections: { total: 0 },
    ai_assistants: { total: 0 },
    warnings: [],
  };

  // Run all queries concurrently via direct REST calls
  const [balanceRes, numbersRes, profilesRes, connectionsRes, assistantsRes] = await Promise.allSettled([
    client.get("/balance"),
    client.get("/phone_numbers", { page_size: 1 }),
    client.get("/messaging_profiles", { page_size: 1 }),
    client.get("/credential_connections", { page_size: 1 }),
    client.get("/ai_assistants", { page_size: 1 }),
  ]);

  let failureCount = 0;

  // Balance
  if (balanceRes.status === "fulfilled") {
    const data = balanceRes.value.data as Record<string, unknown> | undefined;
    if (data) {
      results.balance.amount = String(data.balance ?? "0.00");
      results.balance.currency = String(data.currency ?? "USD");
      results.balance.credit_limit = String(data.credit_limit ?? "0.00");
    }
    // Available balance = balance + credit_limit.
    // Telnyx credit accounts report balance as negative (used credit) with a
    // positive credit_limit.  Prepaid accounts report a positive balance with
    // credit_limit = 0.  Adding the two yields the real available funds in
    // both cases.
    const bal = parseFloat(results.balance.amount) || 0;
    const credit = parseFloat(results.balance.credit_limit) || 0;
    const available = bal + credit;
    results.balance.available = available.toFixed(2);
    if (available < 5) results.warnings.push(`Low available balance: $${results.balance.available} — consider topping up`);
  } else {
    failureCount++;
    results.warnings.push(`Could not fetch balance: ${errorMsg(balanceRes.reason)}`);
  }

  // Phone numbers
  if (numbersRes.status === "fulfilled") {
    const meta = numbersRes.value.meta as Record<string, unknown> | undefined;
    results.phone_numbers.total = Number(meta?.total_results ?? 0);
    results.phone_numbers.active = results.phone_numbers.total; // Approximate
  } else {
    failureCount++;
    results.warnings.push(`Could not fetch phone numbers: ${errorMsg(numbersRes.reason)}`);
  }

  // Messaging profiles
  if (profilesRes.status === "fulfilled") {
    const meta = profilesRes.value.meta as Record<string, unknown> | undefined;
    results.messaging_profiles.total = Number(meta?.total_results ?? 0);
  } else {
    failureCount++;
    results.warnings.push(`Could not fetch messaging profiles: ${errorMsg(profilesRes.reason)}`);
  }

  // Connections
  if (connectionsRes.status === "fulfilled") {
    const meta = connectionsRes.value.meta as Record<string, unknown> | undefined;
    results.connections.total = Number(meta?.total_results ?? 0);
  } else {
    failureCount++;
    results.warnings.push(`Could not fetch connections: ${errorMsg(connectionsRes.reason)}`);
  }

  // AI Assistants
  if (assistantsRes.status === "fulfilled") {
    const meta = assistantsRes.value.meta as Record<string, unknown> | undefined;
    const data = assistantsRes.value.data as unknown[];
    results.ai_assistants.total = Number(meta?.total_results ?? data?.length ?? 0);
  } else {
    failureCount++;
    results.warnings.push(`Could not fetch AI assistants: ${errorMsg(assistantsRes.reason)}`);
  }

  if (jsonOutput) {
    outputJson(results);
  } else {
    // Human-readable output
    console.log("\n📊 Telnyx Account Status");
    console.log("========================\n");
    console.log(`  Available Balance: $${results.balance.available} ${results.balance.currency}`);
    console.log(`  Account Balance:    $${results.balance.amount} ${results.balance.currency}`);
    console.log(`  Credit Limit:      $${results.balance.credit_limit}`);
    console.log(`  Phone Numbers:      ${results.phone_numbers.total}`);
    console.log(`  Messaging Profiles: ${results.messaging_profiles.total}`);
    console.log(`  Voice Connections:  ${results.connections.total}`);
    console.log(`  AI Assistants:      ${results.ai_assistants.total}`);

    if (results.warnings.length > 0) {
      console.log("\n⚠️  Warnings:");
      for (const w of results.warnings) {
        printWarning(`  ${w}`);
      }
    }

    console.log();
  }

  // Exit non-zero if every query failed — the CLI is effectively non-functional.
  if (failureCount === 5) {
    process.exit(1);
  }
}

function errorMsg(err: unknown): string {
  if (err instanceof TelnyxAPIError) return err.detail || err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}
