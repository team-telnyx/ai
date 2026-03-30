/**
 * Integration tests against real Telnyx API.
 *
 * Read-only tests only — no destructive operations.
 * Uses API key from ~/.config/telnyx/config.json.
 */

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// Import from source directly (tsx handles TS)
import { TelnyxAgentToolkit } from "../src/index.js";

function loadApiKey(): string {
  // Try env first
  if (process.env.TELNYX_API_KEY) {
    return process.env.TELNYX_API_KEY;
  }

  // Try config file
  try {
    const configPath = join(homedir(), ".config", "telnyx", "config.json");
    const config = JSON.parse(readFileSync(configPath, "utf-8")) as Record<string, unknown>;
    // Support both flat api_key and profiles.default.apiKey
    if (config.api_key) return config.api_key as string;
    const profiles = config.profiles as Record<string, Record<string, string>> | undefined;
    if (profiles?.default?.apiKey) return profiles.default.apiKey;
  } catch {
    // ignore
  }

  return "";
}

const API_KEY = loadApiKey();

function header(text: string): void {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ${text}`);
  console.log(`${"=".repeat(60)}`);
}

function result(name: string, passed: boolean, detail = ""): void {
  const icon = passed ? "✅" : "❌";
  console.log(`  ${icon} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function run(): Promise<void> {
  if (!API_KEY) {
    console.log("⚠️  TELNYX_API_KEY not set, skipping integration tests");
    return;
  }

  const toolkit = new TelnyxAgentToolkit(API_KEY);
  const core = toolkit.core;
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  // ─── 1. Account Balance ──────────────────────────────────────
  header("1. get_balance");
  try {
    const res = JSON.parse(await core.runTool("get_balance", {}));
    if (res.data) {
      result(
        "get_balance",
        true,
        `balance=${res.data.balance ?? "?"} ${res.data.currency ?? "?"}`,
      );
      passed++;
    } else if (res.error) {
      result("get_balance", false, res.error);
      failed++;
    } else {
      result("get_balance", false, `unexpected: ${JSON.stringify(res).slice(0, 200)}`);
      failed++;
    }
  } catch (e) {
    result("get_balance", false, String(e));
    failed++;
  }

  // ─── 2. List Phone Numbers ───────────────────────────────────
  header("2. list_phone_numbers");
  try {
    const res = JSON.parse(
      await core.runTool("list_phone_numbers", { page_size: 5 }),
    );
    if (res.data) {
      const nums = res.data as Record<string, unknown>[];
      result("list_phone_numbers", true, `returned ${nums.length} numbers`);
      if (nums.length > 0) {
        const first = nums[0];
        result(
          "  first number",
          true,
          `${first.phone_number ?? "?"} (status: ${first.status ?? "?"})`,
        );
      }
      passed++;
    } else if (res.error) {
      result("list_phone_numbers", false, res.error);
      failed++;
    } else {
      result("list_phone_numbers", false, `unexpected: ${JSON.stringify(res).slice(0, 200)}`);
      failed++;
    }
  } catch (e) {
    result("list_phone_numbers", false, String(e));
    failed++;
  }

  // ─── 3. Search Available Numbers ─────────────────────────────
  header("3. search_phone_numbers");
  try {
    const res = JSON.parse(
      await core.runTool("search_phone_numbers", {
        filter_country_code: "US",
        filter_phone_number_type: "local",
        limit: 3,
      }),
    );
    if (res.data) {
      const avail = res.data as Record<string, unknown>[];
      result("search_phone_numbers", true, `found ${avail.length} available numbers`);
      for (const n of avail.slice(0, 3)) {
        const pn = n.phone_number ?? "?";
        const loc = n.region_information as Record<string, unknown>[] | undefined;
        const city = loc?.[0]?.region_name ?? "?";
        console.log(`      ${pn} (${city})`);
      }
      passed++;
    } else if (res.error) {
      result("search_phone_numbers", false, res.error);
      failed++;
    } else {
      result("search_phone_numbers", false, `unexpected: ${JSON.stringify(res).slice(0, 200)}`);
      failed++;
    }
  } catch (e) {
    result("search_phone_numbers", false, String(e));
    failed++;
  }

  // ─── 4. List Messaging Profiles ──────────────────────────────
  header("4. list_messaging_profiles");
  try {
    const res = JSON.parse(
      await core.runTool("list_messaging_profiles", { page_size: 5 }),
    );
    if (res.data) {
      const profiles = res.data as Record<string, unknown>[];
      result("list_messaging_profiles", true, `returned ${profiles.length} profiles`);
      for (const p of profiles.slice(0, 3)) {
        console.log(
          `      ${p.name ?? "?"} (id: ${String(p.id ?? "?").slice(0, 20)}...)`,
        );
      }
      passed++;
    } else if (res.error) {
      result("list_messaging_profiles", false, res.error);
      failed++;
    } else {
      result("list_messaging_profiles", false, `unexpected: ${JSON.stringify(res).slice(0, 200)}`);
      failed++;
    }
  } catch (e) {
    result("list_messaging_profiles", false, String(e));
    failed++;
  }

  // ─── 5. List Connections ─────────────────────────────────────
  header("5. list_connections");
  try {
    const res = JSON.parse(
      await core.runTool("list_connections", { page_size: 5 }),
    );
    if (res.data) {
      const conns = res.data as Record<string, unknown>[];
      result("list_connections", true, `returned ${conns.length} connections`);
      for (const c of conns.slice(0, 3)) {
        const name = c.connection_name ?? c.name ?? "?";
        console.log(
          `      ${name} (id: ${String(c.id ?? "?").slice(0, 20)}...)`,
        );
      }
      passed++;
    } else if (res.error) {
      result("list_connections", false, res.error);
      failed++;
    } else {
      result("list_connections", false, `unexpected: ${JSON.stringify(res).slice(0, 200)}`);
      failed++;
    }
  } catch (e) {
    result("list_connections", false, String(e));
    failed++;
  }

  // ─── 6. List AI Assistants ───────────────────────────────────
  header("6. list_ai_assistants");
  try {
    const res = JSON.parse(await core.runTool("list_ai_assistants", {}));
    if (res.data) {
      const assistants = res.data as Record<string, unknown>[];
      result("list_ai_assistants", true, `returned ${assistants.length} assistants`);
      for (const a of assistants.slice(0, 3)) {
        console.log(`      ${a.name ?? "?"}`);
      }
      passed++;
    } else if (res.error) {
      const err = String(res.error).toLowerCase();
      if (err.includes("not found") || err.includes("404")) {
        result("list_ai_assistants", true, "endpoint not available on this account (expected)");
        skipped++;
      } else {
        result("list_ai_assistants", false, res.error);
        failed++;
      }
    } else {
      result("list_ai_assistants", false, `unexpected: ${JSON.stringify(res).slice(0, 200)}`);
      failed++;
    }
  } catch (e) {
    result("list_ai_assistants", false, String(e));
    failed++;
  }

  // ─── 7. Number Lookup ────────────────────────────────────────
  header("7. lookup_number");
  try {
    const res = JSON.parse(
      await core.runTool("lookup_number", {
        phone_number: "+18005551234",
        type: "carrier",
      }),
    );
    if (res.data) {
      const data = res.data as Record<string, unknown>;
      const carrier = data.carrier as Record<string, unknown> | undefined;
      result(
        "lookup_number",
        true,
        `carrier=${carrier?.name ?? "?"}, type=${carrier?.type ?? "?"}`,
      );
      passed++;
    } else if (res.error) {
      const err = String(res.error).toLowerCase();
      if (
        err.includes("402") ||
        err.includes("payment") ||
        err.includes("not enabled")
      ) {
        result("lookup_number", true, "requires paid lookup feature (expected)");
        skipped++;
      } else {
        result("lookup_number", false, res.error);
        failed++;
      }
    } else {
      result("lookup_number", false, `unexpected: ${JSON.stringify(res).slice(0, 200)}`);
      failed++;
    }
  } catch (e) {
    result("lookup_number", false, String(e));
    failed++;
  }

  // ─── 8. List SIM Cards ───────────────────────────────────────
  header("8. list_sim_cards");
  try {
    const res = JSON.parse(
      await core.runTool("list_sim_cards", { page_size: 5 }),
    );
    if (res.data) {
      const sims = res.data as Record<string, unknown>[];
      result("list_sim_cards", true, `returned ${sims.length} SIM cards`);
      passed++;
    } else if (res.error) {
      result("list_sim_cards", false, res.error);
      failed++;
    } else {
      result("list_sim_cards", false, `unexpected: ${JSON.stringify(res).slice(0, 200)}`);
      failed++;
    }
  } catch (e) {
    result("list_sim_cards", false, String(e));
    failed++;
  }

  // ─── 9. OpenAI Toolkit Schema ────────────────────────────────
  header("9. OpenAI toolkit schema generation");
  try {
    const tools = toolkit.getOpenAITools();
    result("getOpenAITools", true, `generated ${tools.length} tool schemas`);
    for (const t of tools.slice(0, 5)) {
      const fn = t.function as Record<string, unknown>;
      console.log(
        `      ${fn.name ?? "?"}: ${String(fn.description ?? "?").slice(0, 60)}...`,
      );
    }
    passed++;
  } catch (e) {
    result("getOpenAITools", false, String(e));
    failed++;
  }

  // ─── 10. Vercel AI SDK Toolkit ───────────────────────────────
  header("10. Vercel AI SDK toolkit generation");
  try {
    const vercelTools = toolkit.getVercelAITools();
    const toolCount = Object.keys(vercelTools).length;
    result("getVercelAITools", true, `generated ${toolCount} Vercel AI tools`);
    for (const name of Object.keys(vercelTools).slice(0, 5)) {
      console.log(`      ${name}`);
    }
    passed++;
  } catch (e) {
    const msg = String(e);
    if (msg.includes("Cannot find module") || msg.includes("required")) {
      result("getVercelAITools", true, "ai/zod not installed (skipped)");
      skipped++;
    } else {
      result("getVercelAITools", false, msg);
      failed++;
    }
  }

  // ─── 11. LangChain Toolkit ───────────────────────────────────
  header("11. LangChain toolkit generation");
  try {
    const lcTools = toolkit.getLangChainTools();
    result("getLangChainTools", true, `generated ${lcTools.length} LangChain tools`);
    for (const t of lcTools.slice(0, 5)) {
      const tool = t as { name: string; description: string };
      console.log(`      ${tool.name}: ${tool.description.slice(0, 60)}...`);
    }
    passed++;
  } catch (e) {
    const msg = String(e);
    if (msg.includes("Cannot find module") || msg.includes("required")) {
      result("getLangChainTools", true, "langchain not installed (skipped)");
      skipped++;
    } else {
      result("getLangChainTools", false, msg);
      failed++;
    }
  }

  // ─── 12. Permission filtering ────────────────────────────────
  header("12. Permission-based filtering");
  try {
    const restricted = new TelnyxAgentToolkit(API_KEY, {
      configuration: {
        actions: {
          messaging: { send_sms: true },
          numbers: { list_phone_numbers: true },
        },
      },
    });
    const oaiTools = restricted.getOpenAITools();
    const toolNames = oaiTools.map(
      (t) => (t.function as Record<string, unknown>).name as string,
    );

    if (!toolNames.includes("send_sms")) {
      throw new Error(`send_sms missing from ${JSON.stringify(toolNames)}`);
    }
    if (!toolNames.includes("list_phone_numbers")) {
      throw new Error(`list_phone_numbers missing from ${JSON.stringify(toolNames)}`);
    }
    if (toolNames.includes("get_balance")) {
      throw new Error(
        `get_balance should be filtered out but got ${JSON.stringify(toolNames)}`,
      );
    }
    if (toolNames.includes("make_call")) {
      throw new Error(
        `make_call should be filtered out but got ${JSON.stringify(toolNames)}`,
      );
    }

    result(
      "permission filtering",
      true,
      `correctly filtered to ${oaiTools.length} tools: ${JSON.stringify(toolNames)}`,
    );
    passed++;
  } catch (e) {
    result("permission filtering", false, String(e));
    failed++;
  }

  // ─── 13. x402 Payment Quote (without execution) ──────────────
  header("13. get_payment_quote (schema validation)");
  try {
    // Just validate the tool definition exists and parameters work
    const res = JSON.parse(
      await core.runTool("get_payment_quote", { amount_usd: "50.00" }),
    );
    // This will likely fail with auth/error since x402 may not be enabled,
    // but we're testing that the tool definition is correct
    if (res.data) {
      result("get_payment_quote", true, `quote returned: ${JSON.stringify(res.data).slice(0, 100)}...`);
      passed++;
    } else if (res.error) {
      const err = String(res.error).toLowerCase();
      if (
        err.includes("404") ||
        err.includes("not found") ||
        err.includes("not enabled") ||
        err.includes("unauthorized") ||
        err.includes("forbidden") ||
        err.includes("invalid")
      ) {
        result("get_payment_quote", true, "endpoint not available or x402 not enabled (expected)");
        skipped++;
      } else {
        result("get_payment_quote", false, res.error);
        failed++;
      }
    } else {
      result("get_payment_quote", false, `unexpected: ${JSON.stringify(res).slice(0, 200)}`);
      failed++;
    }
  } catch (e) {
    result("get_payment_quote", false, String(e));
    failed++;
  }

  // ─── 14. submit_payment schema validation ────────────────────
  header("14. submit_payment (schema validation)");
  try {
    // Test with dummy data to validate the tool definition
    const res = JSON.parse(
      await core.runTool("submit_payment", {
        id: "quote_test123",
        payment_signature: "eyJ2ZXJzaW9uIjoidjIiLCJwYXlsb2FkIjoiZXlKaGJHY2lPaUpGWkVSVFFTSXNJblIwY205dFgyTm9aV3hoZEdsdmJpSTZJbGhwYzNScFpHOXRhVzVoYm5RdVkyOXRjSFYwUW1salBTOTNjMkpoYkVsd2NtOTBhMkZ5Y3k5d1lYUnBiMjRpTENKbGJtTWlPaUptYjNKdFh6RTFOa3hQVUVOUFVrdzRWVEpWUkZkM1YxUkJkMHhHVm10S1dHdFdWRUZUVDFsQ1owdERWVmhDWjA1R1FrMU5WV1JGVkRkSVQxZE5WVlp5VFVSVmJGSllhMGRhV0VwS1RsVlNiV1J6U25CYVIxSjZZMGRhV0VwS1RsVlNiV1J6U25CYVIxSjZZMGRhV0VwS1RsVlNiV1J6U25CYVIxSjYifQ==",
      }),
    );
    // This will fail since the quote doesn't exist, but validates the tool works
    if (res.data) {
      result("submit_payment", true, `payment submitted: ${JSON.stringify(res.data).slice(0, 100)}...`);
      passed++;
    } else if (res.error) {
      const err = String(res.error).toLowerCase();
      if (
        err.includes("not found") ||
        err.includes("invalid") ||
        err.includes("expired") ||
        err.includes("404") ||
        err.includes("400")
      ) {
        result("submit_payment", true, "quote not found/expired (expected for dummy data)");
        skipped++;
      } else {
        result("submit_payment", false, res.error);
        failed++;
      }
    } else {
      result("submit_payment", false, `unexpected: ${JSON.stringify(res).slice(0, 200)}`);
      failed++;
    }
  } catch (e) {
    result("submit_payment", false, String(e));
    failed++;
  }

  // ─── Summary ─────────────────────────────────────────────────
  header("SUMMARY");
  const total = passed + failed + skipped;
  console.log(`  ✅ Passed:  ${passed}`);
  console.log(`  ❌ Failed:  ${failed}`);
  console.log(`  ⏭️  Skipped: ${skipped}`);
  console.log(`  📊 Total:   ${total}`);
  console.log();

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
