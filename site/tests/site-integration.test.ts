/**
 * Integration tests for the Agent Portal site.
 * Starts the Express server on a random port, tests all endpoints.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { execSync, spawn, type ChildProcess } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 3457 + Math.floor(Math.random() * 1000);
const BASE = `http://localhost:${PORT}`;

let server: ChildProcess;

// Helper to wait for server to be ready
async function waitForServer(
  url: string,
  maxWaitMs = 30000
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    try {
      const r = await fetch(`${url}/health`);
      if (r.ok) return;
    } catch {
      /* not ready yet */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Server didn't start within ${maxWaitMs}ms`);
}

before(async () => {
  // Install deps if needed
  try {
    execSync("npm ci", { cwd: join(__dirname, ".."), stdio: "ignore" });
  } catch {
    /* already installed */
  }

  server = spawn("node", ["server.js"], {
    cwd: join(__dirname, ".."),
    env: { ...process.env, PORT: String(PORT) },
    stdio: "ignore",
  });

  await waitForServer(BASE);
});

after(() => {
  if (server) server.kill();
});

describe("Site — Health", () => {
  it("GET /health returns ok", async () => {
    const r = await fetch(`${BASE}/health`);
    assert.equal(r.status, 200);
    const body = (await r.json()) as any;
    assert.equal(body.status, "ok");
  });
});

describe("Site — Landing Page", () => {
  it("GET / with Accept: application/json returns agent manifest", async () => {
    const r = await fetch(BASE, {
      headers: { Accept: "application/json" },
    });
    assert.equal(r.status, 200);
    const body = (await r.json()) as any;
    assert.ok(body.name, "Missing name in manifest");
    assert.ok(body.capabilities || body.auth, "Missing capabilities or auth");
  });

  it("GET / with Accept: text/html returns HTML", async () => {
    const r = await fetch(BASE, {
      headers: { Accept: "text/html" },
    });
    assert.equal(r.status, 200);
    const text = await r.text();
    assert.ok(
      text.includes("<!DOCTYPE html>") || text.includes("<html"),
      "Not HTML"
    );
  });
});

describe("Site — Discovery", () => {
  it("GET /.well-known/agent.json returns manifest", async () => {
    const r = await fetch(`${BASE}/.well-known/agent.json`);
    assert.equal(r.status, 200);
    const ct = r.headers.get("content-type") || "";
    assert.ok(ct.includes("json"), `Expected JSON content-type, got ${ct}`);
    const body = (await r.json()) as any;
    assert.ok(body.name || body.auth);
  });
});

describe("Site — Getting Started", () => {
  const API_KEY = process.env.TELNYX_API_KEY;

  it("GET /v2/agent/getting-started without auth returns error", async () => {
    const r = await fetch(`${BASE}/v2/agent/getting-started`);
    assert.ok(r.status === 401 || r.status === 400 || r.status === 403,
      `Expected 401/400/403, got ${r.status}`);
  });

  it("GET /v1/getting-started without auth also returns error", async () => {
    const r = await fetch(`${BASE}/v1/getting-started`);
    assert.ok(r.status === 401 || r.status === 400 || r.status === 403,
      `Expected 401/400/403, got ${r.status}`);
  });

  it("GET /v2/agent/getting-started with invalid API key returns error", async () => {
    const r = await fetch(`${BASE}/v2/agent/getting-started`, {
      headers: {
        Authorization: "Bearer INVALID_KEY_12345",
        Accept: "application/json",
      },
    });
    // Should get some form of auth error (401/403) or 500 from upstream
    assert.ok([401, 403, 500].includes(r.status),
      `Expected auth error, got ${r.status}`);
  });

  if (API_KEY) {
    it("GET /v2/agent/getting-started with auth returns JSON with expected fields", async () => {
      const r = await fetch(`${BASE}/v2/agent/getting-started`, {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          Accept: "application/json",
        },
      });
      assert.equal(r.status, 200);
      const body = (await r.json()) as any;
      assert.ok(body && typeof body === "object", "Expected JSON object response");

      // Response wraps in data envelope
      const data = body.data || body;
      assert.ok(data.account_level !== undefined || data.level !== undefined,
        "Missing account_level/level field");
      assert.ok(data.progress_percent !== undefined || data.completion_percentage !== undefined,
        "Missing progress_percent/completion_percentage field");
      assert.ok(Array.isArray(data.completed_milestones) || Array.isArray(data.completed),
        "Missing completed_milestones/completed array");
      assert.ok(Array.isArray(data.suggested_next) || Array.isArray(data.next_steps),
        "Missing suggested_next/next_steps array");
    });

    it("GET /v2/agent/getting-started next_steps have correct shape", async () => {
      const r = await fetch(`${BASE}/v2/agent/getting-started`, {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          Accept: "application/json",
        },
      });
      assert.equal(r.status, 200);
      const body = (await r.json()) as any;
      const data = body.data || body;
      const steps = data.suggested_next || data.next_steps || [];

      if (Array.isArray(steps)) {
        for (const step of steps) {
          assert.ok(step.action || step.title, "next_step missing action/title");
          assert.ok(step.description || step.detail || step.title, "next_step missing description/detail");
          // Should have either command, api, or cli
          assert.ok(
            step.command || step.api || step.cli || step.href,
            `next_step '${step.action || step.title}' missing command/api/cli/href`
          );
        }
      }
    });

    it("GET /v2/agent/getting-started with Accept: text/html returns HTML", async () => {
      const r = await fetch(`${BASE}/v2/agent/getting-started`, {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          Accept: "text/html",
        },
      });
      assert.equal(r.status, 200);
      const ct = r.headers.get("content-type") || "";
      assert.ok(ct.includes("html"), `Expected HTML content-type, got ${ct}`);
      const text = await r.text();
      assert.ok(
        text.includes("<") && !text.startsWith("{"),
        "Expected HTML, got JSON"
      );
    });

    it("GET /v1/getting-started also works (legacy path)", async () => {
      const r = await fetch(`${BASE}/v1/getting-started`, {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          Accept: "application/json",
        },
      });
      assert.equal(r.status, 200);
      const body = (await r.json()) as any;
      assert.ok(body && typeof body === "object", "Expected JSON response from v1 path");
    });
  }
});
