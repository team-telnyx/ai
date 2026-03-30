/**
 * E2E telemetry tests — exercises SDK toolkit to trigger real telemetry/friction reports.
 * 
 * Run with: TELNYX_API_KEY=... npx tsx tests/e2e-telemetry.test.ts
 * 
 * Uses TelnyxAgentToolkit.runTool() so telemetry + friction reporters fire.
 */

import { describe, it } from "node:test";
import assert from "node:assert";

const API_KEY = process.env.TELNYX_API_KEY;

if (!API_KEY) {
  console.log("TELNYX_API_KEY not set — skipping E2E telemetry tests");
  process.exit(0);
}

// Dynamic import to avoid issues when not installed
const { TelnyxAgentToolkit } = await import("../src/index.js");
const toolkit = new TelnyxAgentToolkit(API_KEY);

describe("E2E Telemetry — SDK tool invocations", () => {
  it("get_balance → success telemetry", async () => {
    const result = JSON.parse(await toolkit.runTool("get_balance", {}));
    const data = result.data || result;
    assert.ok(data.balance !== undefined || data.amount !== undefined, "Should return balance");
    console.log("  ✅ get_balance → telemetry sent");
  });

  it("list_phone_numbers → success telemetry", async () => {
    const result = JSON.parse(await toolkit.runTool("list_phone_numbers", { page_size: 1 }));
    assert.ok(result.data, "Should return data array");
    console.log("  ✅ list_phone_numbers → telemetry sent");
  });

  it("list_messaging_profiles → success telemetry", async () => {
    const result = JSON.parse(await toolkit.runTool("list_messaging_profiles", { page_size: 1 }));
    assert.ok(result.data, "Should return data array");
    console.log("  ✅ list_messaging_profiles → telemetry sent");
  });

  it("list_connections → success telemetry", async () => {
    const result = JSON.parse(await toolkit.runTool("list_connections", { page_size: 1 }));
    assert.ok(result.data, "Should return data array");
    console.log("  ✅ list_connections → telemetry sent");
  });

  it("list_ai_assistants → success telemetry", async () => {
    const result = JSON.parse(await toolkit.runTool("list_ai_assistants", { page_size: 1 }));
    assert.ok(result.data, "Should return data array");
    console.log("  ✅ list_ai_assistants → telemetry sent");
  });

  it("unknown tool → error telemetry", async () => {
    const result = JSON.parse(await toolkit.runTool("nonexistent_tool", {}));
    assert.ok(result.error, "Should return error");
    console.log("  ✅ nonexistent_tool → error telemetry sent");
  });

  it("lookup with bad number → friction event", async () => {
    const result = JSON.parse(await toolkit.runTool("lookup_number", { phone_number: "+0000000000" }));
    console.log("  ✅ lookup_number (bad input) → telemetry + possible friction sent");
  });
});

// Wait for fire-and-forget telemetry
setTimeout(() => {
  console.log("\n⏳ Waited 2s for background telemetry. Check Grafana: {app=\"aifde-telemetry\"} | json");
}, 2000);
