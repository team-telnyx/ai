/**
 * Tests for AIF-328: setup-voice creates a Call Control Application
 * (not a credential connection) so call-dial can use the output.
 *
 * The test uses a mock HTTP server for REST calls and a fake Go CLI
 * binary for number search/order steps.
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
        capturedRequests.push({ method: req.method ?? "", path: req.url ?? "", body: parsedBody });

        // GET /outbound_voice_profiles
        if (req.method === "GET" && req.url === "/v2/outbound_voice_profiles") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            data: [
              { id: "ovp_abc123", name: "Default Voice Profile", active: true },
            ],
          }));
          return;
        }

        // POST /call_control_applications
        if (req.method === "POST" && req.url === "/v2/call_control_applications") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            data: {
              id: "cca_abc123",
              application_name: (parsedBody as Record<string, unknown>)?.application_name ?? "test",
              webhook_event_url: (parsedBody as Record<string, unknown>)?.webhook_event_url ?? "",
            },
          }));
          return;
        }

        // PATCH /phone_numbers/:id
        if (req.method === "PATCH" && req.url?.startsWith("/v2/phone_numbers/")) {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            data: { id: req.url.split("/").pop(), ...parsedBody },
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

function postRequests(pathPattern: RegExp): CapturedRequest[] {
  return capturedRequests.filter((r) => r.method === "POST" && pathPattern.test(r.path));
}

function patchRequests(): CapturedRequest[] {
  return capturedRequests.filter((r) => r.method === "PATCH");
}

function getRequests(pathPattern: RegExp): CapturedRequest[] {
  return capturedRequests.filter((r) => r.method === "GET" && pathPattern.test(r.path));
}

// ---------------------------------------------------------------------------
// Fake Go CLI binary for number search/order
// ---------------------------------------------------------------------------

function setupFakeTelnyx(): { fakeTelnyx: string; logPath: string; env: NodeJS.ProcessEnv } {
  const tempDir = mkdtempSync(join(tmpdir(), "telnyx-agent-aif328-"));
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

const fmtIdx = args.indexOf("--format");
const cmd = args.filter((a, i) => !(a === "--format" || (i > 0 && args[i-1] === "--format")));

if (cmd.join(" ").startsWith("available-phone-numbers list")) {
  console.log(JSON.stringify({ data: [
    { phone_number: "+13125550001", country: "US", capabilities: ["voice"] },
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

describe("setup-voice (AIF-328: Call Control Application, not credential connection)", () => {
  before(async () => { await startMockServer(); });
  after(async () => { await stopMockServer(); });

  it("POSTs to /call_control_applications (not /credential_connections)", async () => {
    capturedRequests = [];
    const fake = setupFakeTelnyx();
    const r = await runAsync(["setup-voice", "--json"], fake.env);

    assert.equal(r.status, 0, `expected exit 0, got ${r.status}: ${r.stderr}`);
    const ccaPosts = postRequests(/\/v2\/call_control_applications/);
    assert.equal(ccaPosts.length, 1, "expected exactly one POST /call_control_applications");
    const credPosts = postRequests(/\/v2\/credential_connections/);
    assert.equal(credPosts.length, 0, "expected zero POST /credential_connections");
  });

  it("includes webhook_event_url and outbound_voice_profile_id in the app body", async () => {
    capturedRequests = [];
    const fake = setupFakeTelnyx();
    await runAsync(["setup-voice", "--webhook-url", "https://myhook.example.com/calls", "--json"], fake.env);

    const ccaPosts = postRequests(/\/v2\/call_control_applications/);
    assert.equal(ccaPosts.length, 1);
    const body = ccaPosts[0].body as Record<string, unknown>;
    assert.ok(body);
    assert.equal(body.webhook_event_url, "https://myhook.example.com/calls");
    assert.ok(body.outbound, "expected outbound block in app body");
    const outbound = body.outbound as Record<string, unknown>;
    assert.ok(outbound.outbound_voice_profile_id, "expected outbound_voice_profile_id");
  });

  it("GETs /outbound_voice_profiles when --outbound-voice-profile-id is not provided", async () => {
    capturedRequests = [];
    const fake = setupFakeTelnyx();
    await runAsync(["setup-voice", "--json"], fake.env);

    const profileGets = getRequests(/\/v2\/outbound_voice_profiles/);
    assert.equal(profileGets.length, 1, "expected one GET /outbound_voice_profiles");
  });

  it("skips GET /outbound_voice_profiles when --outbound-voice-profile-id is provided", async () => {
    capturedRequests = [];
    const fake = setupFakeTelnyx();
    await runAsync(["setup-voice", "--outbound-voice-profile-id", "ovp_explicit123", "--json"], fake.env);

    const profileGets = getRequests(/\/v2\/outbound_voice_profiles/);
    assert.equal(profileGets.length, 0, "expected zero GET /outbound_voice_profiles when explicit ID provided");

    const ccaPosts = postRequests(/\/v2\/call_control_applications/);
    const outbound = (ccaPosts[0].body as Record<string, unknown>).outbound as Record<string, unknown>;
    assert.equal(outbound.outbound_voice_profile_id, "ovp_explicit123");
  });

  it("uses default webhook URL when --webhook-url is not provided", async () => {
    capturedRequests = [];
    const fake = setupFakeTelnyx();
    await runAsync(["setup-voice", "--json"], fake.env);

    const ccaPosts = postRequests(/\/v2\/call_control_applications/);
    const body = ccaPosts[0].body as Record<string, unknown>;
    assert.ok(body.webhook_event_url, "expected webhook_event_url even without flag");
    assert.equal(body.webhook_event_url, "https://example.com/webhook");
  });

  it("accepts --webhook as alias for --webhook-url", async () => {
    capturedRequests = [];
    const fake = setupFakeTelnyx();
    await runAsync(["setup-voice", "--webhook", "https://alias.example.com/hook", "--json"], fake.env);

    const ccaPosts = postRequests(/\/v2\/call_control_applications/);
    const body = ccaPosts[0].body as Record<string, unknown>;
    assert.equal(body.webhook_event_url, "https://alias.example.com/hook");
  });

  it("PATCHes /phone_numbers/:id with the Call Control App connection_id", async () => {
    capturedRequests = [];
    const fake = setupFakeTelnyx();
    await runAsync(["setup-voice", "--json"], fake.env);

    const patches = patchRequests();
    assert.equal(patches.length, 1, "expected one PATCH");
    assert.match(patches[0].path, /^\/v2\/phone_numbers\//);
    const body = patches[0].body as Record<string, unknown>;
    assert.ok(body);
    assert.equal(body.connection_id, "cca_abc123", "expected connection_id to be the Call Control App ID");
  });

  it("does NOT POST to /credential_connections", async () => {
    capturedRequests = [];
    const fake = setupFakeTelnyx();
    await runAsync(["setup-voice", "--json"], fake.env);

    const credPosts = postRequests(/\/v2\/credential_connections/);
    assert.equal(credPosts.length, 0, "must not create credential connections");
  });

  it("returns connection_id, phone_number, webhook_url, outbound_voice_profile_id in JSON", async () => {
    capturedRequests = [];
    const fake = setupFakeTelnyx();
    const r = await runAsync(["setup-voice", "--json"], fake.env);

    assert.equal(r.status, 0);
    const data = JSON.parse(r.stdout);
    assert.equal(data.connection_id, "cca_abc123");
    assert.ok(data.phone_number, "expected phone_number in output");
    assert.ok(data.webhook_url, "expected webhook_url in output");
    assert.ok(data.outbound_voice_profile_id, "expected outbound_voice_profile_id in output");
    assert.equal(data.ready, true);
  });

  it("has 5 steps with correct names", async () => {
    capturedRequests = [];
    const fake = setupFakeTelnyx();
    const r = await runAsync(["setup-voice", "--json"], fake.env);

    assert.equal(r.status, 0);
    const data = JSON.parse(r.stdout);
    assert.equal(data.steps.length, 5);
    assert.equal(data.steps[0].name, "Resolve outbound voice profile");
    assert.equal(data.steps[1].name, "Create Call Control Application");
    assert.equal(data.steps[2].name, "Search for number");
    assert.equal(data.steps[3].name, "Buy number");
    assert.equal(data.steps[4].name, "Assign number to Call Control App");
    for (const s of data.steps) {
      assert.equal(s.status, "completed");
    }
  });

  it("lists setup-voice in help with --outbound-voice-profile-id flag", () => {
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
    assert.match(stdout, /--outbound-voice-profile-id/);
  });
});
