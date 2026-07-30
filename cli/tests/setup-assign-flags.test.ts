/**
 * Tests for AIF-329: setup-voice and setup-sms step 4 (assign number) via REST PATCH.
 *
 * The Go CLI's `phone-numbers update` doesn't support --force or
 * --messaging-profile-id on v0.21.0. Step 4 now uses direct REST
 * PATCH /phone_numbers/{id} instead.
 *
 * These tests verify the PATCH call is made with the correct path and body
 * by using a mock HTTP server for the REST calls and a fake Go CLI binary
 * for the number search/order steps (steps 2-3).
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer, type Server, type IncomingMessage, type ServerResponse } from "node:http";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliRoot = join(__dirname, "..");
const cliBin = join(cliRoot, "bin", "telnyx-agent.ts");

// ---------------------------------------------------------------------------
// Mock HTTP server
// ---------------------------------------------------------------------------

interface CapturedRequest {
  method: string;
  path: string;
  body: Record<string, unknown> | null;
}

let mockServer: Server;
let mockPort: number;
let capturedRequests: CapturedRequest[] = [];

function startMockServer(): Promise<void> {
  return new Promise((resolve) => {
    mockServer = createServer((req: IncomingMessage, res: ServerResponse) => {
      let body = "";
      req.on("data", (chunk: Buffer) => (body += chunk.toString()));
      req.on("end", () => {
        let parsedBody: Record<string, unknown> | null = null;
        try {
          parsedBody = body ? JSON.parse(body) : null;
        } catch { /* ignore */ }
        const captured: CapturedRequest = { method: req.method ?? "", path: req.url ?? "", body: parsedBody };
        capturedRequests.push(captured);

        // GET /outbound_voice_profiles (setup-voice step 1 — AIF-328 flow)
        if (req.method === "GET" && req.url === "/v2/outbound_voice_profiles") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ data: [{ id: "ovp_abc123", name: "default" }] }));
          return;
        }

        // POST /call_control_applications (setup-voice step 2 — AIF-328 flow;
        // setup-voice now creates a Call Control App, not a credential connection)
        if (req.method === "POST" && req.url === "/v2/call_control_applications") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            data: {
              id: "conn_abc123",
              application_name: (parsedBody as Record<string, unknown>)?.application_name ?? "test",
            },
          }));
          return;
        }

        // POST /messaging_profiles (setup-sms step 1)
        if (req.method === "POST" && req.url === "/v2/messaging_profiles") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            data: {
              id: "prof_abc123",
              name: (parsedBody as Record<string, unknown>)?.name ?? "test",
            },
          }));
          return;
        }

        // PATCH /phone_numbers/:id (step 4 — the AIF-329 fix)
        if (req.method === "PATCH" && req.url?.startsWith("/v2/phone_numbers/")) {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            data: {
              id: req.url.split("/").pop(),
              ...parsedBody,
            },
          }));
          return;
        }

        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ errors: [{ code: "10005", detail: "Not found" }] }));
      });
    });
    mockServer.listen(0, "127.0.0.1", () => {
      const addr = mockServer.address();
      mockPort = typeof addr === "object" && addr ? addr.port : 0;
      resolve();
    });
  });
}

function stopMockServer(): Promise<void> {
  return new Promise((resolve) => {
    mockServer.close(() => resolve());
  });
}

function patchRequests(): CapturedRequest[] {
  return capturedRequests.filter((r) => r.method === "PATCH");
}

// ---------------------------------------------------------------------------
// Fake Go CLI binary for number search/order steps
// ---------------------------------------------------------------------------

function setupFakeTelnyx(): { fakeTelnyx: string; logPath: string; env: NodeJS.ProcessEnv } {
  const tempDir = mkdtempSync(join(tmpdir(), "telnyx-agent-aif329-"));
  const binDir = join(tempDir, "bin");
  const logPath = join(tempDir, "args.jsonl");
  mkdirSync(binDir, { recursive: true });

  const fakeTelnyx = join(binDir, "telnyx");
  writeFileSync(
    fakeTelnyx,
    `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
fs.appendFileSync(process.env.TELNYX_FAKE_ARGS_LOG, JSON.stringify(args) + "\\n");

// Strip --format raw/json to inspect the command
const fmtIdx = args.indexOf("--format");
const cmd = args.filter((a, i) => !(a === "--format" || (i > 0 && args[i-1] === "--format")));

if (cmd.join(" ").startsWith("available-phone-numbers list")) {
  console.log(JSON.stringify({ data: [
    { phone_number: "+13125550001", country: "US", capabilities: ["sms", "voice"] },
  ] }));
} else if (cmd.join(" ").startsWith("number-orders create") || cmd.join(" ").startsWith("number-order create")) {
  console.log(JSON.stringify({ data: { id: "order_123", status: "complete" } }));
} else if (cmd.join(" ").startsWith("phone-numbers retrieve")) {
  console.log(JSON.stringify({ data: { id: "num_123456", phone_number: "+13125550001" } }));
} else {
  console.log(JSON.stringify({ data: {} }));
}
`,
  );
  chmodSync(fakeTelnyx, 0o755);

  return {
    fakeTelnyx,
    logPath,
    env: {
      ...process.env,
      PATH: `${binDir}:${process.env.PATH}`,
      TELNYX_CLI_PATH: fakeTelnyx,
      TELNYX_FAKE_ARGS_LOG: logPath,
      TELNYX_API_KEY: "***",
      TELNYX_API_BASE_URL: `http://127.0.0.1:${mockPort}/v2`,
    },
  };
}

function runAsync(args: string[], env: NodeJS.ProcessEnv): Promise<{ status: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn("npx", ["tsx", cliBin, ...args], { cwd: cliRoot, env });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (c: Buffer) => (stdout += c.toString()));
    child.stderr.on("data", (c: Buffer) => (stderr += c.toString()));
    child.on("close", (code) => resolve({ status: code ?? -1, stdout, stderr }));
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("setup-voice step 4 (AIF-329: REST PATCH instead of Go CLI)", () => {
  before(async () => { await startMockServer(); });
  after(async () => { await stopMockServer(); });

  it("PATCHes /phone_numbers/:id with connection_id instead of Go CLI --force", async () => {
    capturedRequests = [];
    const fake = setupFakeTelnyx();
    const r = await runAsync(["setup-voice", "--json"], fake.env);

    assert.equal(r.status, 0, `expected exit 0, got ${r.status}: ${r.stderr}`);
    const patches = patchRequests();
    assert.equal(patches.length, 1, "expected exactly one PATCH request");
    assert.match(patches[0].path, /^\/v2\/phone_numbers\//);
    assert.ok(patches[0].body);
    assert.ok(patches[0].body!.connection_id, "expected connection_id in PATCH body");
  });

  it("does not invoke Go CLI phone-numbers update with --force", async () => {
    const fake = setupFakeTelnyx();
    await runAsync(["setup-voice", "--json"], fake.env);

    const logPath = fake.logPath;
    const { readFileSync } = await import("node:fs");
    if (readFileSync(logPath, "utf8").trim()) {
      const calls = readFileSync(logPath, "utf8").trim().split("\n").map((l) => JSON.parse(l));
      const updateCall = calls.find((a: string[]) => a.slice(0, 2).join(" ") === "phone-numbers update");
      assert.equal(updateCall, undefined, "expected no Go CLI phone-numbers update call");
    }
  });

  it("reports ready=true and assigns the number as the final step", async () => {
    capturedRequests = [];
    const fake = setupFakeTelnyx();
    const r = await runAsync(["setup-voice", "--json"], fake.env);

    assert.equal(r.status, 0);
    const data = JSON.parse(r.stdout);
    assert.equal(data.ready, true);
    // AIF-328 changed setup-voice to a 5-step Call Control App flow; the final
    // step is the REST assign (AIF-329). Assert on the last step by identity
    // rather than a hard-coded count so the two fixes stay compatible.
    const last = data.steps[data.steps.length - 1];
    assert.equal(last.status, "completed");
    assert.equal(last.name, "Assign number to Call Control App");
  });
});

describe("setup-sms step 4 (AIF-329: REST PATCH instead of Go CLI)", () => {
  before(async () => { await startMockServer(); });
  after(async () => { await stopMockServer(); });

  it("PATCHes /phone_numbers/:id with messaging_profile_id instead of Go CLI --messaging-profile-id", async () => {
    capturedRequests = [];
    const fake = setupFakeTelnyx();
    const r = await runAsync(["setup-sms", "--json"], fake.env);

    assert.equal(r.status, 0, `expected exit 0, got ${r.status}: ${r.stderr}`);
    const patches = patchRequests();
    assert.equal(patches.length, 1, "expected exactly one PATCH request");
    assert.match(patches[0].path, /^\/v2\/phone_numbers\//);
    assert.ok(patches[0].body);
    assert.ok(patches[0].body!.messaging_profile_id, "expected messaging_profile_id in PATCH body");
  });

  it("does not invoke Go CLI phone-numbers update with --messaging-profile-id", async () => {
    const fake = setupFakeTelnyx();
    await runAsync(["setup-sms", "--json"], fake.env);

    const logPath = fake.logPath;
    const { readFileSync } = await import("node:fs");
    if (readFileSync(logPath, "utf8").trim()) {
      const calls = readFileSync(logPath, "utf8").trim().split("\n").map((l) => JSON.parse(l));
      const updateCall = calls.find((a: string[]) => a.slice(0, 2).join(" ") === "phone-numbers update");
      assert.equal(updateCall, undefined, "expected no Go CLI phone-numbers update call");
    }
  });

  it("reports ready=true and 4 completed steps", async () => {
    capturedRequests = [];
    const fake = setupFakeTelnyx();
    const r = await runAsync(["setup-sms", "--json"], fake.env);

    assert.equal(r.status, 0);
    const data = JSON.parse(r.stdout);
    assert.equal(data.ready, true);
    assert.equal(data.steps.length, 4);
    assert.equal(data.steps[3].status, "completed");
    assert.equal(data.steps[3].name, "Assign number to profile");
  });
});

describe("AIF-329 help text (unchanged)", () => {
  it("still lists setup-voice and setup-sms in help", () => {
    let stdout = "";
    let status = 0;
    try {
      stdout = execFileSync("npx", ["tsx", cliBin, "help"], { cwd: cliRoot, encoding: "utf8", env: { ...process.env }, timeout: 30000 });
    } catch (err: any) {
      status = err.status ?? 1;
      stdout = err.stdout?.toString() ?? "";
    }
    assert.equal(status, 0);
    assert.match(stdout, /setup-voice/);
    assert.match(stdout, /setup-sms/);
  });
});
