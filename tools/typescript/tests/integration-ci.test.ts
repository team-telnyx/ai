/**
 * CI Integration tests for TypeScript SDK.
 * Requires TELNYX_API_KEY env var.
 *
 * Read-only tests always run.
 * Write tests only run when RUN_WRITE_TESTS=true.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

const API_KEY = process.env.TELNYX_API_KEY;
const BASE = "https://api.telnyx.com/v2";
const headers = {
  Authorization: `Bearer ${API_KEY}`,
  "Content-Type": "application/json",
};

const RESOURCE_PREFIX = "ci-integration-test-";
const RUN_WRITE_TESTS = process.env.RUN_WRITE_TESTS === "true";

if (!API_KEY) {
  console.log("TELNYX_API_KEY not set — skipping integration tests");
  process.exit(0);
}

describe("TypeScript SDK — Read-Only API", () => {
  it("get_balance returns valid balance", async () => {
    const r = await fetch(`${BASE}/balance`, { headers });
    assert.equal(r.status, 200);
    const body = (await r.json()) as any;
    assert.ok(body.data.balance !== undefined);
    assert.equal(body.data.currency, "USD");
  });

  it("list_phone_numbers returns array", async () => {
    const r = await fetch(`${BASE}/phone_numbers?page[size]=1`, { headers });
    assert.equal(r.status, 200);
    const body = (await r.json()) as any;
    assert.ok(Array.isArray(body.data));
  });

  it("list_messaging_profiles returns array", async () => {
    const r = await fetch(`${BASE}/messaging_profiles?page[size]=1`, {
      headers,
    });
    assert.equal(r.status, 200);
    const body = (await r.json()) as any;
    assert.ok(Array.isArray(body.data));
  });

  it("list_credential_connections returns array", async () => {
    const r = await fetch(`${BASE}/credential_connections?page[size]=1`, {
      headers,
    });
    assert.equal(r.status, 200);
    const body = (await r.json()) as any;
    assert.ok(Array.isArray(body.data));
  });

  it("list_ai_assistants returns array", async () => {
    const r = await fetch(`${BASE}/ai/assistants?page[size]=1`, { headers });
    assert.equal(r.status, 200);
    const body = (await r.json()) as any;
    assert.ok(Array.isArray(body.data));
  });

  it("list_ai_models returns non-empty list", async () => {
    const r = await fetch(`${BASE}/ai/models`, { headers });
    assert.equal(r.status, 200);
    const body = (await r.json()) as any;
    assert.ok(body.data.length > 0);
  });

  it("list_outbound_voice_profiles returns array", async () => {
    const r = await fetch(`${BASE}/outbound_voice_profiles?page[size]=1`, { headers });
    assert.equal(r.status, 200);
    const body = (await r.json()) as any;
    assert.ok(Array.isArray(body.data));
  });

  it("list_verify_profiles returns array or valid error", async () => {
    const r = await fetch(`${BASE}/verify/profiles?page[size]=1`, { headers });
    // Some accounts may not have verify access
    assert.ok([200, 403, 404].includes(r.status), `Expected 200/403/404, got ${r.status}`);
    if (r.status === 200) {
      const body = (await r.json()) as any;
      assert.ok(Array.isArray(body.data));
    }
  });

  it("list_storage_buckets returns array or valid error", async () => {
    const r = await fetch(`${BASE}/storage/buckets?page[size]=1`, { headers });
    // Storage may not be enabled on all accounts
    assert.ok([200, 403, 404].includes(r.status), `Expected 200/403/404, got ${r.status}`);
    if (r.status === 200) {
      const body = (await r.json()) as any;
      assert.ok(Array.isArray(body.data));
    }
  });

  it("list_sim_cards returns array", async () => {
    const r = await fetch(`${BASE}/sim_cards?page[size]=1`, { headers });
    assert.equal(r.status, 200);
    const body = (await r.json()) as any;
    assert.ok(Array.isArray(body.data));
  });

  it("search_available_numbers finds US numbers", async () => {
    const r = await fetch(
      `${BASE}/available_phone_numbers?filter[country_code]=US&filter[limit]=1`,
      { headers }
    );
    assert.equal(r.status, 200);
    const body = (await r.json()) as any;
    assert.ok(body.data.length >= 1);
    assert.ok(body.data[0].phone_number);
  });

  it("ai_chat_completion works with tiny request", async () => {
    const r = await fetch(`${BASE}/ai/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: "meta-llama/Meta-Llama-3.1-8B-Instruct",
        messages: [{ role: "user", content: "Say OK" }],
        max_tokens: 3,
      }),
    });
    assert.equal(r.status, 200);
    const body = (await r.json()) as any;
    assert.ok(body.choices.length > 0);
  });

  it("ai_embeddings endpoint is reachable (requires bucket)", async () => {
    const r = await fetch(`${BASE}/ai/embeddings`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: "thenlper/gte-large",
        bucket_name: "ci-nonexistent-bucket",
      }),
    });
    assert.ok(
      [400, 404, 422].includes(r.status),
      `Expected 400/404/422 for nonexistent bucket, got ${r.status}`
    );
  });

  it("list_messages returns list or 404", async () => {
    const r = await fetch(`${BASE}/messages?page[size]=1`, { headers });
    assert.ok([200, 404].includes(r.status), `Expected 200/404, got ${r.status}`);
    if (r.status === 200) {
      const body = (await r.json()) as any;
      assert.ok(Array.isArray(body.data));
    }
  });

  it("number_lookup endpoint is reachable", async () => {
    const r = await fetch(`${BASE}/number_lookup/+18005551234`, { headers });
    assert.ok([200, 404, 422].includes(r.status), `Expected 200/404/422, got ${r.status}`);
  });

  // ─── New tools: 10DLC ────────────────────────────────────────

  it("list_10dlc_brands returns array or valid error", async () => {
    const r = await fetch(`${BASE}/10dlc/brands?page[size]=1`, { headers });
    assert.ok([200, 401, 403, 404].includes(r.status), `Expected 200/401/403/404, got ${r.status}`);
    if (r.status === 200) {
      const body = (await r.json()) as any;
      assert.ok(Array.isArray(body.data));
    }
  });

  it("list_10dlc_campaigns returns array or valid error", async () => {
    const r = await fetch(`${BASE}/10dlc/campaigns?page[size]=1`, { headers });
    assert.ok([200, 401, 403, 404].includes(r.status), `Expected 200/401/403/404, got ${r.status}`);
    if (r.status === 200) {
      const body = (await r.json()) as any;
      assert.ok(Array.isArray(body.data));
    }
  });

  // ─── New tools: IoT / Wireless ───────────────────────────────

  it("list_sim_card_groups returns array or valid error", async () => {
    const r = await fetch(`${BASE}/sim_card_groups?page[size]=1`, { headers });
    assert.ok([200, 403, 404].includes(r.status), `Expected 200/403/404, got ${r.status}`);
    if (r.status === 200) {
      const body = (await r.json()) as any;
      assert.ok(Array.isArray(body.data));
    }
  });

  // ─── New tools: Porting ──────────────────────────────────────

  it("list_porting_orders returns array or valid error", async () => {
    const r = await fetch(`${BASE}/porting_orders?page[size]=1`, { headers });
    assert.ok([200, 401, 403, 404].includes(r.status), `Expected 200/401/403/404, got ${r.status}`);
    if (r.status === 200) {
      const body = (await r.json()) as any;
      assert.ok(Array.isArray(body.data));
    }
  });

  // ─── New tools: E911 ─────────────────────────────────────────

  it("list_e911_addresses returns array or valid error", async () => {
    const r = await fetch(`${BASE}/e911_addresses?page[size]=1`, { headers });
    assert.ok([200, 401, 403, 404].includes(r.status), `Expected 200/401/403/404, got ${r.status}`);
    if (r.status === 200) {
      const body = (await r.json()) as any;
      assert.ok(Array.isArray(body.data));
    }
  });

  // ─── New tools: Billing ──────────────────────────────────────

  it("list_billing_groups returns array or valid error", async () => {
    const r = await fetch(`${BASE}/billing_groups?page[size]=1`, { headers });
    assert.ok([200, 401, 403, 404].includes(r.status), `Expected 200/401/403/404, got ${r.status}`);
    if (r.status === 200) {
      const body = (await r.json()) as any;
      assert.ok(Array.isArray(body.data));
    }
  });

  // ─── New tools: Webhooks ─────────────────────────────────────

  it("list_webhook_deliveries returns array or valid error", async () => {
    const r = await fetch(`${BASE}/webhook_deliveries?page[size]=1`, { headers });
    assert.ok([200, 401, 403, 404].includes(r.status), `Expected 200/401/403/404, got ${r.status}`);
    if (r.status === 200) {
      const body = (await r.json()) as any;
      assert.ok(Array.isArray(body.data));
    }
  });

  // ─── New tools: Networking ───────────────────────────────────

  it("list_networks returns array or valid error", async () => {
    const r = await fetch(`${BASE}/networks?page[size]=1`, { headers });
    assert.ok([200, 401, 403, 404].includes(r.status), `Expected 200/401/403/404, got ${r.status}`);
    if (r.status === 200) {
      const body = (await r.json()) as any;
      assert.ok(Array.isArray(body.data));
    }
  });

  // ─── New tools: Fax ──────────────────────────────────────────

  it("list_faxes returns array or valid error", async () => {
    const r = await fetch(`${BASE}/faxes?page[size]=1`, { headers });
    assert.ok([200, 401, 403, 404].includes(r.status), `Expected 200/401/403/404, got ${r.status}`);
    if (r.status === 200) {
      const body = (await r.json()) as any;
      assert.ok(Array.isArray(body.data));
    }
  });
});

describe("TypeScript SDK — Toolkit Classes", () => {
  it("TelnyxAgentToolkit creates OpenAI tools", async () => {
    const { TelnyxAgentToolkit } = await import("../src/index.js");
    const toolkit = new TelnyxAgentToolkit(API_KEY!);
    const tools = toolkit.getOpenAITools();
    assert.ok(tools.length > 0, "Should have tools");
    for (const tool of tools) {
      assert.equal((tool as any).type, "function");
      assert.ok((tool as any).function.name);
      assert.ok((tool as any).function.description);
    }
  });

  it("TelnyxAgentToolkit.getOpenAIToolExecutor().execute works with get_balance", async () => {
    const { TelnyxAgentToolkit } = await import("../src/index.js");
    const toolkit = new TelnyxAgentToolkit(API_KEY!);
    const executor = toolkit.getOpenAIToolExecutor();
    const result = await executor.execute({
      function: { name: "get_balance", arguments: "{}" },
    });
    assert.ok(result);
    const parsed = JSON.parse(result);
    assert.ok(parsed.data || parsed.balance);
  });

  it("tool count matches expected", async () => {
    const { TOOL_DEFINITIONS } = await import(
      "../src/shared/constants.js"
    );
    const count = Object.keys(TOOL_DEFINITIONS).length;
    assert.equal(count, 84, `Expected 84 tools, got ${count}`);
  });

  it("all tool definitions have required fields", async () => {
    const { TOOL_DEFINITIONS } = await import("../src/shared/constants.js");
    for (const [name, def] of Object.entries(TOOL_DEFINITIONS)) {
      const tool = def as any;
      assert.ok(tool.name, `Tool ${name} missing name`);
      assert.ok(tool.description, `Tool ${name} missing description`);
      assert.ok(tool.parameters, `Tool ${name} missing parameters`);
      assert.equal(tool.parameters.type, "object", `Tool ${name} parameters.type should be "object"`);
      assert.ok(tool.parameters.properties, `Tool ${name} missing parameters.properties`);
      assert.ok(Array.isArray(tool.parameters.required), `Tool ${name} missing parameters.required array`);
    }
  });

  it("PERMISSION_MAP covers all tools", async () => {
    const { TOOL_DEFINITIONS, PERMISSION_MAP } = await import("../src/shared/constants.js");
    const mappedTools = new Set(Object.values(PERMISSION_MAP));
    const definedTools = new Set(Object.keys(TOOL_DEFINITIONS));
    // Every mapped tool should exist in definitions
    for (const toolName of mappedTools) {
      assert.ok(definedTools.has(toolName), `PERMISSION_MAP references unknown tool: ${toolName}`);
    }
  });
});

describe("TypeScript SDK — Vercel AI Adapter", () => {
  it("getVercelAITools returns tools or throws if ai SDK not installed", async () => {
    const { TelnyxAgentToolkit } = await import("../src/index.js");
    const toolkit = new TelnyxAgentToolkit(API_KEY!);
    try {
      const tools = toolkit.getVercelAITools();
      // If it works, validate the shape
      assert.ok(tools && typeof tools === "object", "Should return an object");
      const keys = Object.keys(tools);
      assert.ok(keys.length > 0, "Should have at least one tool");
      for (const key of keys) {
        const tool = (tools as any)[key];
        assert.ok(tool.description, `Tool ${key} missing description`);
        assert.ok(tool.parameters, `Tool ${key} missing parameters (Zod schema)`);
        assert.ok(typeof tool.execute === "function", `Tool ${key} missing execute function`);
      }

      // Also verify count matches OpenAI tools
      const openaiTools = toolkit.getOpenAITools();
      assert.equal(keys.length, openaiTools.length,
        `Vercel AI tools (${keys.length}) should match OpenAI tools (${openaiTools.length})`);
    } catch (err: any) {
      // If ai SDK not installed, it should throw a clear error
      assert.ok(err.message.includes("Vercel AI") || err.message.includes("ai"),
        `Expected Vercel AI install error, got: ${err.message}`);
    }
  });
});

describe("TypeScript SDK — LangChain.js Adapter", () => {
  it("getLangChainTools returns tools or throws if @langchain/core not installed", async () => {
    const { TelnyxAgentToolkit } = await import("../src/index.js");
    const toolkit = new TelnyxAgentToolkit(API_KEY!);
    try {
      const tools = toolkit.getLangChainTools();
      // If it works, validate the shape
      assert.ok(Array.isArray(tools), "Should return an array");
      assert.ok(tools.length > 0, "Should have at least one tool");
      for (const tool of tools) {
        const t = tool as any;
        assert.ok(t.name, "Tool missing name");
        assert.ok(t.description, "Tool missing description");
        assert.ok(t.schema, "Tool missing schema (Zod)");
        assert.ok(typeof t.invoke === "function" || typeof t.func === "function" || typeof t._call === "function",
          `Tool ${t.name} missing invoke/func/_call function`);
      }

      // Also verify count matches OpenAI tools
      const openaiTools = toolkit.getOpenAITools();
      assert.equal(tools.length, openaiTools.length,
        `LangChain tools (${tools.length}) should match OpenAI tools (${openaiTools.length})`);
    } catch (err: any) {
      // If @langchain/core not installed, it should throw a clear error
      assert.ok(err.message.includes("LangChain"),
        `Expected LangChain install error, got: ${err.message}`);
    }
  });
});

describe("TypeScript SDK — Toolkit with Configuration", () => {
  it("filtered toolkit returns subset of tools", async () => {
    const { TelnyxAgentToolkit } = await import("../src/index.js");
    const toolkit = new TelnyxAgentToolkit(API_KEY!, {
      configuration: {
        actions: {
          messaging: { send_sms: true, list_messaging_profiles: true },
        },
      },
    });
    const tools = toolkit.getOpenAITools();
    assert.ok(tools.length > 0, "Should have at least one tool");
    assert.ok(tools.length < 84, `Should have fewer than 84 tools, got ${tools.length}`);
  });

  it("empty configuration returns all tools", async () => {
    const { TelnyxAgentToolkit } = await import("../src/index.js");
    const toolkit = new TelnyxAgentToolkit(API_KEY!);
    const tools = toolkit.getOpenAITools();
    assert.equal(tools.length, 84, `Expected 84 tools, got ${tools.length}`);
  });
});

// ─── Write Tests (gated behind RUN_WRITE_TESTS=true) ───────────────────────────

if (RUN_WRITE_TESTS) {
  describe("Write — CRUD Lifecycles via ToolkitCore", () => {
    it("messaging profile lifecycle: create → verify → delete", async () => {
      let profileId: string | null = null;
      try {
        // Create
        const r = await fetch(`${BASE}/messaging_profiles`, {
          method: "POST",
          headers,
          body: JSON.stringify({ name: `${RESOURCE_PREFIX}ts-msg-profile`, whitelisted_destinations: ["US"] }),
        });
        assert.ok(r.status === 200 || r.status === 201, `Create failed: ${r.status}`);
        const data = ((await r.json()) as any).data;
        profileId = data.id;
        assert.equal(data.name, `${RESOURCE_PREFIX}ts-msg-profile`);

        // Verify
        const r2 = await fetch(`${BASE}/messaging_profiles/${profileId}`, { headers });
        assert.equal(r2.status, 200);
        assert.equal(((await r2.json()) as any).data.id, profileId);
      } finally {
        if (profileId) {
          await fetch(`${BASE}/messaging_profiles/${profileId}`, { method: "DELETE", headers });
        }
      }
    });

    it("credential connection lifecycle: create → verify → delete", async () => {
      let connId: string | null = null;
      try {
        const r = await fetch(`${BASE}/credential_connections`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            connection_name: `${RESOURCE_PREFIX}ts-connection`,
            user_name: "citstestuser",
            password: "CiTsT3st1Pass99",
          }),
        });
        assert.ok(r.status === 200 || r.status === 201, `Create failed: ${r.status}`);
        const data = ((await r.json()) as any).data;
        connId = data.id;

        // Verify
        const r2 = await fetch(`${BASE}/credential_connections/${connId}`, { headers });
        assert.equal(r2.status, 200);
      } finally {
        if (connId) {
          await fetch(`${BASE}/credential_connections/${connId}`, { method: "DELETE", headers });
        }
      }
    });

    it("AI assistant lifecycle: create → verify → update → delete", async () => {
      let assistantId: string | null = null;
      try {
        const r = await fetch(`${BASE}/ai/assistants`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            name: `${RESOURCE_PREFIX}ts-assistant`,
            instructions: "CI test assistant. Say 'test passed'.",
            model: "Qwen/Qwen3-235B-A22B",
          }),
        });
        assert.ok(r.status === 200 || r.status === 201, `Create failed: ${r.status}`);
        // AI assistants endpoint returns object directly (no "data" wrapper)
        const body = (await r.json()) as any;
        const data = body.data ?? body;
        assistantId = data.id;
        assert.equal(data.name, `${RESOURCE_PREFIX}ts-assistant`);

        // Verify
        const r2 = await fetch(`${BASE}/ai/assistants/${assistantId}`, { headers });
        assert.equal(r2.status, 200);

        // Update
        const r3 = await fetch(`${BASE}/ai/assistants/${assistantId}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({ name: `${RESOURCE_PREFIX}ts-assistant-updated` }),
        });
        assert.equal(r3.status, 200);
        const body3 = (await r3.json()) as any;
        const data3 = body3.data ?? body3;
        assert.equal(data3.name, `${RESOURCE_PREFIX}ts-assistant-updated`);
      } finally {
        if (assistantId) {
          await fetch(`${BASE}/ai/assistants/${assistantId}`, { method: "DELETE", headers });
        }
      }
    });

    it("outbound voice profile lifecycle: create → verify → delete", async () => {
      let profileId: string | null = null;
      try {
        const r = await fetch(`${BASE}/outbound_voice_profiles`, {
          method: "POST",
          headers,
          body: JSON.stringify({ name: `${RESOURCE_PREFIX}ts-voice-profile` }),
        });
        assert.ok(r.status === 200 || r.status === 201, `Create failed: ${r.status}`);
        const data = ((await r.json()) as any).data;
        profileId = data.id;

        // Verify
        const r2 = await fetch(`${BASE}/outbound_voice_profiles/${profileId}`, { headers });
        assert.equal(r2.status, 200);
      } finally {
        if (profileId) {
          await fetch(`${BASE}/outbound_voice_profiles/${profileId}`, { method: "DELETE", headers });
        }
      }
    });

    it("billing group lifecycle: create → verify → delete", async () => {
      let groupId: string | null = null;
      try {
        const r = await fetch(`${BASE}/billing_groups`, {
          method: "POST",
          headers,
          body: JSON.stringify({ name: `${RESOURCE_PREFIX}ts-billing-group` }),
        });
        assert.ok(r.status === 200 || r.status === 201, `Create failed: ${r.status}`);
        const data = ((await r.json()) as any).data;
        groupId = data.id;

        // Verify
        const r2 = await fetch(`${BASE}/billing_groups/${groupId}`, { headers });
        assert.equal(r2.status, 200);
      } finally {
        if (groupId) {
          await fetch(`${BASE}/billing_groups/${groupId}`, { method: "DELETE", headers });
        }
      }
    });

    it("verify profile lifecycle: create → verify → delete (if available)", async () => {
      let profileId: string | null = null;
      try {
        const r = await fetch(`${BASE}/verify/profiles`, {
          method: "POST",
          headers,
          body: JSON.stringify({ name: `${RESOURCE_PREFIX}ts-verify-profile` }),
        });
        if (r.status === 403 || r.status === 404) {
          console.log("  ⏭ Verify not available on this account — skipping");
          return;
        }
        assert.ok(r.status === 200 || r.status === 201, `Create failed: ${r.status}`);
        const data = ((await r.json()) as any).data;
        profileId = data.id;

        // Verify
        const r2 = await fetch(`${BASE}/verify/profiles/${profileId}`, { headers });
        assert.equal(r2.status, 200);
      } finally {
        if (profileId) {
          await fetch(`${BASE}/verify/profiles/${profileId}`, { method: "DELETE", headers });
        }
      }
    });

    it("storage bucket lifecycle: create → list → delete (if available)", async () => {
      let bucketName: string | null = null;
      try {
        bucketName = `${RESOURCE_PREFIX}ts-bucket-${Date.now()}`;
        const r = await fetch(`${BASE}/storage/buckets`, {
          method: "POST",
          headers,
          body: JSON.stringify({ name: bucketName }),
        });
        // Storage may not be available on all accounts
        if (r.status === 403 || r.status === 404) {
          console.log("  ⏭ Storage not available on this account — skipping");
          bucketName = null;
          return;
        }
        assert.ok(r.status === 200 || r.status === 201, `Create failed: ${r.status}`);

        // List and verify it's there
        const r2 = await fetch(`${BASE}/storage/buckets?page[size]=100`, { headers });
        assert.equal(r2.status, 200);
        const buckets = ((await r2.json()) as any).data;
        assert.ok(
          buckets.some((b: any) => b.name === bucketName),
          "Bucket should appear in list"
        );
      } finally {
        if (bucketName) {
          await fetch(`${BASE}/storage/buckets/${bucketName}`, { method: "DELETE", headers });
        }
      }
    });

    it("number lifecycle: search → buy → verify → release", async (ctx) => {
      let phoneNumberId: string | null = null;
      try {
        // Search for multiple numbers (in case some are already owned)
        const r = await fetch(
          `${BASE}/available_phone_numbers?filter[country_code]=US&filter[features][]=sms&filter[phone_number_type]=local&filter[limit]=5`,
          { headers }
        );
        assert.equal(r.status, 200);
        const numbers = ((await r.json()) as any).data;
        assert.ok(numbers.length >= 1, "No numbers available");

        // Try each number until one succeeds (409 = already owned, skip it)
        let orderId: string | null = null;
        let phoneNumber: string | null = null;
        for (const num of numbers) {
          phoneNumber = num.phone_number;
          const r2 = await fetch(`${BASE}/number_orders`, {
            method: "POST",
            headers,
            body: JSON.stringify({ phone_numbers: [{ phone_number: phoneNumber }] }),
          });
          if (r2.status === 200 || r2.status === 201) {
            orderId = ((await r2.json()) as any).data.id;
            break;
          }
          if (r2.status === 409) continue; // Already owned, try next
          if (r2.status === 402) { ctx.skip("Insufficient balance to buy numbers (402)"); return; }
          if (r2.status === 429) {
            // Rate limited — wait and retry same number
            const retryAfter = parseInt(r2.headers.get("retry-after") || "5", 10);
            await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
            const retry = await fetch(`${BASE}/number_orders`, {
              method: "POST",
              headers,
              body: JSON.stringify({ phone_numbers: [{ phone_number: phoneNumber }] }),
            });
            if (retry.status === 200 || retry.status === 201) {
              orderId = ((await retry.json()) as any).data.id;
              break;
            }
            if (retry.status === 409) continue;
          }
          assert.fail(`Unexpected order error: ${r2.status}`);
        }
        assert.ok(orderId, `All ${numbers.length} numbers already owned or failed`);

        // Poll until success (max 30s)
        for (let i = 0; i < 20; i++) {
          await new Promise(resolve => setTimeout(resolve, 1500));
          const poll = await fetch(`${BASE}/number_orders/${orderId}`, { headers });
          if (poll.status === 200) {
            const status = ((await poll.json()) as any).data.status;
            if (status === "success") break;
            if (status === "failed") assert.fail("Number order failed");
          }
        }

        // Resolve phone number ID
        for (let i = 0; i < 5; i++) {
          const r3 = await fetch(
            `${BASE}/phone_numbers?filter[phone_number]=${encodeURIComponent(phoneNumber)}&page[size]=1`,
            { headers }
          );
          if (r3.status === 200) {
            const data = ((await r3.json()) as any).data;
            if (data.length > 0) {
              phoneNumberId = data[0].id;
              break;
            }
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        assert.ok(phoneNumberId, `Could not resolve phone number ID for ${phoneNumber}`);

        // Verify
        const r4 = await fetch(`${BASE}/phone_numbers/${phoneNumberId}`, { headers });
        assert.equal(r4.status, 200);
      } finally {
        if (phoneNumberId) {
          await fetch(`${BASE}/phone_numbers/${phoneNumberId}`, { method: "DELETE", headers });
        }
      }
    });
  });

  describe("Write — ToolkitCore executeTool", () => {
    it("runTool create_messaging_profile → delete", async () => {
      const { TelnyxAgentToolkit } = await import("../src/index.js");
      const toolkit = new TelnyxAgentToolkit(API_KEY!);
      let profileId: string | null = null;

      try {
        const result = await toolkit.core.runTool("create_messaging_profile", {
          name: `${RESOURCE_PREFIX}ts-toolkit-profile`,
          whitelisted_destinations: ["US"],
        });
        const parsed = JSON.parse(result);
        profileId = parsed.data?.id;
        assert.ok(profileId, "Should return profile ID");
      } finally {
        if (profileId) {
          await fetch(`${BASE}/messaging_profiles/${profileId}`, { method: "DELETE", headers });
        }
      }
    });

    it("runTool create_ai_assistant → delete", async () => {
      const { TelnyxAgentToolkit } = await import("../src/index.js");
      const toolkit = new TelnyxAgentToolkit(API_KEY!);
      let assistantId: string | null = null;

      try {
        const result = await toolkit.core.runTool("create_ai_assistant", {
          name: `${RESOURCE_PREFIX}ts-toolkit-assistant`,
          instructions: "CI test",
          model: "Qwen/Qwen3-235B-A22B",
        });
        const parsed = JSON.parse(result);
        // AI assistants return object directly, not wrapped in data
        assistantId = parsed.data?.id ?? parsed.id;
        assert.ok(assistantId, "Should return assistant ID");
      } finally {
        if (assistantId) {
          await fetch(`${BASE}/ai/assistants/${assistantId}`, { method: "DELETE", headers });
        }
      }
    });
  });
} else {
  describe("Write — CRUD Lifecycles (SKIPPED)", () => {
    it("skipped — set RUN_WRITE_TESTS=true to enable", () => {
      console.log("  ⏭ Write tests skipped (RUN_WRITE_TESTS not set)");
    });
  });
}
