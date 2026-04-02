/**
 * telnyx-agent status — Account health at a glance.
 * All queries via telnyx CLI.
 */

import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { outputJson, printWarning } from "../utils/output.ts";

interface StatusResult {
  balance: { amount: string; currency: string; credit_limit: string };
  phone_numbers: { total: number; active: number };
  messaging_profiles: { total: number };
  connections: { total: number };
  ai_assistants: { total: number };
  warnings: string[];
}

export async function statusCommand(flags: Record<string, string | boolean>): Promise<void> {
  const jsonOutput = flags.json === true;

  const results: StatusResult = {
    balance: { amount: "0.00", currency: "USD", credit_limit: "0.00" },
    phone_numbers: { total: 0, active: 0 },
    messaging_profiles: { total: 0 },
    connections: { total: 0 },
    ai_assistants: { total: 0 },
    warnings: [],
  };

  // Run all queries concurrently via CLI
  const [balanceRes, numbersRes, profilesRes, connectionsRes, assistantsRes] = await Promise.allSettled([
    telnyxCli(["balance", "retrieve"]),
    telnyxCli(["phone-numbers", "list", "--page.size", "1"]),
    telnyxCli(["messaging-profiles", "list", "--page.size", "1"]),
    telnyxCli(["credential-connections", "list", "--page.size", "1"]),
    telnyxCli(["ai:assistants", "list", "--page.size", "1"]),
  ]);

  // Balance
  if (balanceRes.status === "fulfilled") {
    const data = balanceRes.value.data as Record<string, unknown> | undefined;
    if (data) {
      results.balance.amount = String(data.balance ?? "0.00");
      results.balance.currency = String(data.currency ?? "USD");
      results.balance.credit_limit = String(data.credit_limit ?? "0.00");
    }
    const bal = parseFloat(results.balance.amount);
    if (bal < 5) results.warnings.push(`Low balance: $${results.balance.amount} — consider topping up`);
  } else {
    results.warnings.push(`Could not fetch balance: ${errorMsg(balanceRes.reason)}`);
  }

  // Phone numbers
  if (numbersRes.status === "fulfilled") {
    const meta = numbersRes.value.meta as Record<string, unknown> | undefined;
    results.phone_numbers.total = Number(meta?.total_results ?? 0);
    results.phone_numbers.active = results.phone_numbers.total; // Approximate
  } else {
    results.warnings.push(`Could not fetch phone numbers: ${errorMsg(numbersRes.reason)}`);
  }

  // Messaging profiles
  if (profilesRes.status === "fulfilled") {
    const meta = profilesRes.value.meta as Record<string, unknown> | undefined;
    results.messaging_profiles.total = Number(meta?.total_results ?? 0);
  } else {
    results.warnings.push(`Could not fetch messaging profiles: ${errorMsg(profilesRes.reason)}`);
  }

  // Connections
  if (connectionsRes.status === "fulfilled") {
    const meta = connectionsRes.value.meta as Record<string, unknown> | undefined;
    results.connections.total = Number(meta?.total_results ?? 0);
  } else {
    results.warnings.push(`Could not fetch connections: ${errorMsg(connectionsRes.reason)}`);
  }

  // AI Assistants
  if (assistantsRes.status === "fulfilled") {
    const meta = assistantsRes.value.meta as Record<string, unknown> | undefined;
    const data = assistantsRes.value.data as unknown[];
    results.ai_assistants.total = Number(meta?.total_results ?? data?.length ?? 0);
  } else {
    results.warnings.push(`Could not fetch AI assistants: ${errorMsg(assistantsRes.reason)}`);
  }

  if (jsonOutput) {
    outputJson(results);
    return;
  }

  // Human-readable output
  console.log("\n📊 Telnyx Account Status");
  console.log("========================\n");
  console.log(`  Balance:            $${results.balance.amount} ${results.balance.currency}`);
  console.log(`  Credit Limit:       $${results.balance.credit_limit}`);
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

function errorMsg(err: unknown): string {
  if (err instanceof TelnyxCLIError) return err.stderr || err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}
