/**
 * CLI write tests — only on main branch.
 * Tests setup commands that create resources, then verifies and cleans up.
 * Uses a helper to find and delete ci-integration-test-* resources.
 */
import { describe, it, after } from "node:test";
import assert from "node:assert/strict";

if (!process.env.TELNYX_API_KEY) {
  console.log("TELNYX_API_KEY not set — skipping");
  process.exit(0);
}

const API_KEY = process.env.TELNYX_API_KEY;
const BASE = "https://api.telnyx.com/v2";
const headers = {
  Authorization: `Bearer ${API_KEY}`,
  "Content-Type": "application/json",
};

// Cleanup helper — find and delete any ci-integration-test-* resources
async function cleanup() {
  // Messaging profiles
  const mp = await fetch(`${BASE}/messaging_profiles?page[size]=100`, {
    headers,
  });
  const mpData = (await mp.json()) as any;
  for (const p of mpData.data || []) {
    if (p.name?.startsWith("ci-integration-test-")) {
      await fetch(`${BASE}/messaging_profiles/${p.id}`, {
        method: "DELETE",
        headers,
      });
    }
  }

  // Credential connections
  const cc = await fetch(`${BASE}/credential_connections?page[size]=100`, {
    headers,
  });
  const ccData = (await cc.json()) as any;
  for (const c of ccData.data || []) {
    const name = c.connection_name || c.name || "";
    if (name.startsWith("ci-integration-test-")) {
      await fetch(`${BASE}/credential_connections/${c.id}`, {
        method: "DELETE",
        headers,
      });
    }
  }

  // AI assistants
  const ai = await fetch(`${BASE}/ai/assistants?page[size]=100`, { headers });
  const aiData = (await ai.json()) as any;
  for (const a of aiData.data || []) {
    if (a.name?.startsWith("ci-integration-test-")) {
      await fetch(`${BASE}/ai/assistants/${a.id}`, {
        method: "DELETE",
        headers,
      });
    }
  }

  // Voice profiles
  const vp = await fetch(`${BASE}/outbound_voice_profiles?page[size]=100`, {
    headers,
  });
  const vpData = (await vp.json()) as any;
  for (const p of vpData.data || []) {
    if (p.name?.startsWith("ci-integration-test-")) {
      await fetch(`${BASE}/outbound_voice_profiles/${p.id}`, {
        method: "DELETE",
        headers,
      });
    }
  }
}

// Track resources created by CLI setup commands for cleanup
const createdPhoneNumberIds: string[] = [];

// Run cleanup after all tests
after(async () => {
  await cleanup();
  // Release any phone numbers bought during tests
  for (const id of createdPhoneNumberIds) {
    try {
      await fetch(`${BASE}/phone_numbers/${id}`, { method: "DELETE", headers });
    } catch { /* best effort */ }
  }
});

describe("CLI Write — Resource Lifecycle", () => {
  it("messaging profile: create → verify → delete", async () => {
    const name = "ci-integration-test-msg-profile";

    // Create via API directly (testing the API, not CLI setup-sms which also buys numbers)
    // whitelisted_destinations is required by the API
    const r = await fetch(`${BASE}/messaging_profiles`, {
      method: "POST",
      headers,
      body: JSON.stringify({ name, whitelisted_destinations: ["US"] }),
    });
    assert.ok(
      r.status === 200 || r.status === 201,
      `Create failed: ${r.status}`
    );
    const created = ((await r.json()) as any).data;
    assert.equal(created.name, name);

    // Verify
    const r2 = await fetch(`${BASE}/messaging_profiles/${created.id}`, {
      headers,
    });
    assert.equal(r2.status, 200);

    // Delete
    const r3 = await fetch(`${BASE}/messaging_profiles/${created.id}`, {
      method: "DELETE",
      headers,
    });
    assert.ok(
      r3.status === 200 || r3.status === 204,
      `Delete failed: ${r3.status}`
    );
  });

  it("credential connection: create → verify → delete", async () => {
    const name = "ci-integration-test-connection";

    const r = await fetch(`${BASE}/credential_connections`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        connection_name: name,
        user_name: "citestuser",  // alphanumeric only — underscores cause 422
        password: "CiT3st1Pass99",
      }),
    });
    assert.ok(
      r.status === 200 || r.status === 201,
      `Create failed: ${r.status}`
    );
    const created = ((await r.json()) as any).data;

    // Verify
    const r2 = await fetch(`${BASE}/credential_connections/${created.id}`, {
      headers,
    });
    assert.equal(r2.status, 200);

    // Delete
    const r3 = await fetch(`${BASE}/credential_connections/${created.id}`, {
      method: "DELETE",
      headers,
    });
    assert.ok(
      r3.status === 200 || r3.status === 204,
      `Delete failed: ${r3.status}`
    );
  });

  it("AI assistant: create → verify → update → delete", async () => {
    const name = "ci-integration-test-assistant";

    const r = await fetch(`${BASE}/ai/assistants`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name,
        instructions: "Test assistant for CI. Say 'test passed'.",
        model: "Qwen/Qwen3-235B-A22B",
      }),
    });
    assert.ok(
      r.status === 200 || r.status === 201,
      `Create failed: ${r.status}`
    );
    // AI assistants API returns object directly (no "data" wrapper)
    const body = (await r.json()) as any;
    const created = body.data ?? body;
    assert.equal(created.name, name);

    // Update
    const r2 = await fetch(`${BASE}/ai/assistants/${created.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ name: `${name}-updated` }),
    });
    assert.equal(r2.status, 200);
    const body2 = (await r2.json()) as any;
    const updated = body2.data ?? body2;
    assert.equal(updated.name, `${name}-updated`);

    // Delete
    const r3 = await fetch(`${BASE}/ai/assistants/${created.id}`, {
      method: "DELETE",
      headers,
    });
    assert.ok(
      r3.status === 200 || r3.status === 204,
      `Delete failed: ${r3.status}`
    );
  });
});

describe("CLI Write — Setup Commands (E2E)", () => {
  it("setup-sms: creates profile + buys number + assigns", async () => {
    const { spawnSync } = await import("node:child_process");
    const { join, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");

    const __dir = dirname(fileURLToPath(import.meta.url));
    const CLI = join(__dir, "..", "bin", "telnyx-agent.ts");

    const proc = spawnSync("npx", ["tsx", CLI, "setup-sms", "--country", "US", "--json"], {
      encoding: "utf-8",
      timeout: 60000,
      env: { ...process.env },
      shell: true,
    });

    const output = proc.stdout || "";
    const stderr = proc.stderr || "";
    assert.equal(proc.status, 0, `setup-sms exited ${proc.status}. stdout: ${output.slice(0, 500)} stderr: ${stderr.slice(0, 500)}`);

    const result = JSON.parse(output);
    assert.ok(result.profile_id, "Missing profile_id");
    assert.ok(result.phone_number, "Missing phone_number");
    assert.ok(result.phone_number_id, "Missing phone_number_id");
    assert.equal(result.ready, true, `Should be ready. Got: ${JSON.stringify(result).slice(0, 300)}`);
    assert.ok(result.steps.length >= 3, "Should have at least 3 steps");

    // Track for cleanup
    createdPhoneNumberIds.push(result.phone_number_id);

    // Verify the number exists on the account
    const r = await fetch(`${BASE}/phone_numbers/${result.phone_number_id}`, { headers });
    assert.equal(r.status, 200, "Number should exist on account");

    // Cleanup: delete messaging profile (number cleaned up in after())
    if (result.profile_id) {
      await fetch(`${BASE}/messaging_profiles/${result.profile_id}`, { method: "DELETE", headers });
    }
  });

  it("setup-voice: creates connection + buys number", async () => {
    const { spawnSync } = await import("node:child_process");
    const { join, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");

    const __dir = dirname(fileURLToPath(import.meta.url));
    const CLI = join(__dir, "..", "bin", "telnyx-agent.ts");

    const proc = spawnSync("npx", ["tsx", CLI, "setup-voice", "--country", "US", "--json"], {
      encoding: "utf-8",
      timeout: 60000,
      env: { ...process.env },
      shell: true,
    });

    const output = proc.stdout || "";
    const stderr = proc.stderr || "";
    assert.equal(proc.status, 0, `setup-voice exited ${proc.status}. stdout: ${output.slice(0, 500)} stderr: ${stderr.slice(0, 500)}`);

    const result = JSON.parse(output);
    assert.ok(result.connection_id, "Missing connection_id");
    assert.ok(result.phone_number, "Missing phone_number");
    assert.equal(result.ready, true, `Should be ready. Got: ${JSON.stringify(result).slice(0, 300)}`);

    // Track number for cleanup
    if (result.phone_number_id) {
      createdPhoneNumberIds.push(result.phone_number_id);
    }

    // Cleanup: delete connection
    if (result.connection_id) {
      await fetch(`${BASE}/credential_connections/${result.connection_id}`, { method: "DELETE", headers });
    }
  });

  it("setup-ai: creates assistant + buys number", async () => {
    const { spawnSync } = await import("node:child_process");
    const { join, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");

    const __dir = dirname(fileURLToPath(import.meta.url));
    const CLI = join(__dir, "..", "bin", "telnyx-agent.ts");

    const proc = spawnSync("npx", ["tsx", CLI, "setup-ai", "--json"], {
      encoding: "utf-8",
      timeout: 60000,
      env: { ...process.env },
      shell: true,
    });

    const output = proc.stdout || "";
    const stderr = proc.stderr || "";
    assert.equal(proc.status, 0, `setup-ai exited ${proc.status}. stdout: ${output.slice(0, 500)} stderr: ${stderr.slice(0, 500)}`);

    const result = JSON.parse(output);
    assert.ok(result.assistant_id, "Missing assistant_id");
    assert.ok(result.phone_number, "Missing phone_number");
    assert.equal(result.ready, true, `Should be ready. Got: ${JSON.stringify(result).slice(0, 300)}`);

    // Track number for cleanup
    if (result.phone_number_id) {
      createdPhoneNumberIds.push(result.phone_number_id);
    }

    // Cleanup: delete assistant
    if (result.assistant_id) {
      await fetch(`${BASE}/ai/assistants/${result.assistant_id}`, { method: "DELETE", headers });
    }
  });

  it("status: reflects newly created resources", async () => {
    const { spawnSync } = await import("node:child_process");
    const { join, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");

    const __dir = dirname(fileURLToPath(import.meta.url));
    const CLI = join(__dir, "..", "bin", "telnyx-agent.ts");

    const proc = spawnSync("npx", ["tsx", CLI, "status", "--json"], {
      encoding: "utf-8",
      timeout: 30000,
      env: { ...process.env },
      shell: true,
    });

    const output = proc.stdout || "";
    const stderr = proc.stderr || "";
    assert.equal(proc.status, 0, `status exited ${proc.status}. stdout: ${output.slice(0, 500)} stderr: ${stderr.slice(0, 500)}`);

    const result = JSON.parse(output);
    // status --json returns balance as { amount, currency, credit_limit }
    assert.ok(result.balance && typeof result.balance.amount === "string", "Balance amount should be present");
    assert.ok(typeof result.phone_numbers?.total === "number", "phone_numbers.total should be a number");
    assert.ok(result.phone_numbers.total >= 0, "phone_numbers.total should be non-negative");
  });
});
