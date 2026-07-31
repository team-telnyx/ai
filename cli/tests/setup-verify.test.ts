/**
 * Tests for the `telnyx-agent setup-verify` command.
 *
 * Step 1 (create verify profile) uses a direct REST POST /verify_profiles
 * with an SMS channel block (AIF-330 fix — Go CLI sent no channel settings).
 * Steps 2-4 (search number, buy number, link) still use the Go CLI.
 *
 * The test uses a mock HTTP server for the REST call and a fake Go CLI
 * binary for the number search/order steps.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, chmodSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer, type Server, type IncomingMessage, type ServerResponse } from "node:http";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliRoot = join(__dirname, "..");
const cliBin = join(cliRoot, "bin", "telnyx-agent.ts");

// ---------------------------------------------------------------------------
// Mock HTTP server for REST POST /verify_profiles
// ---------------------------------------------------------------------------

interface CapturedRequest {
  method: string;
  path: string;
  body: Record<string, unknown> | null;
}

let mockServer: Server;
let mockPort: number;
let lastRequest: CapturedRequest | null = null;

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
        lastRequest = { method: req.method ?? "", path: req.url ?? "", body: parsedBody };

        if (req.method === "POST" && req.url === "/v2/verify_profiles") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            data: {
              id: "prof_abc123",
              name: (parsedBody as Record<string, unknown>)?.name ?? "test",
              record_type: "verify_profile",
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

function capturedRequest(): CapturedRequest {
  assert.ok(lastRequest, "expected the mock server to have received a request");
  return lastRequest as CapturedRequest;
}

// ---------------------------------------------------------------------------
// Fake Go CLI binary for number search/order steps
// ---------------------------------------------------------------------------

function setupFakeTelnyx(): { fakeTelnyx: string; logPath: string; env: NodeJS.ProcessEnv } {
  const tempDir = mkdtempSync(join(tmpdir(), "telnyx-agent-setup-verify-"));
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

// Strip --format raw and --format json to inspect the command
const fmtIdx = args.indexOf("--format");
const fmt = fmtIdx >= 0 ? args[fmtIdx + 1] : "json";
const cmd = args.filter((a, i) => !(a === "--format" || (i > 0 && args[i-1] === "--format")));
const joined = cmd.join(" ");

if (joined.startsWith("available-phone-numbers list")) {
  // With --format raw, output { data: [...] } envelope
  const out = { data: [
    { phone_number: "+13125550001", country: "US", capabilities: ["sms", "voice"] },
  ] };
  if (fmt === "raw") {
    console.log(JSON.stringify(out));
  } else {
    console.log(JSON.stringify(out));
  }
} else if (joined.startsWith("number-order create") || joined.startsWith("number-orders create")) {
  console.log(JSON.stringify({ data: { id: "order_123", phone_number: "+13125550001" } }));
} else if (joined.startsWith("phone-numbers retrieve")) {
  console.log(JSON.stringify({ data: { id: "num_123", phone_number: "+13125550001" } }));
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

function readLoggedArgs(logPath: string): string[][] {
  if (!existsSync(logPath)) return [];
  return readFileSync(logPath, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

// Async spawn — mock server needs event loop
function runSetupVerifyAsync(args: string[], env: NodeJS.ProcessEnv): Promise<{ status: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn("npx", ["tsx", cliBin, "setup-verify", ...args], {
      cwd: cliRoot,
      env,
    });
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

describe("setup-verify (AIF-330: profile with SMS channel settings)", () => {
  before(async () => {
    await startMockServer();
  });

  after(async () => {
    await stopMockServer();
  });

  it("POSTs to /verify_profiles with SMS channel block and default US destination", async () => {
    lastRequest = null;
    const fake = setupFakeTelnyx();
    const r = await runSetupVerifyAsync(["--json"], fake.env);

    assert.equal(r.status, 0, `expected exit 0, got ${r.status}: ${r.stderr}`);
    const req = capturedRequest();
    assert.equal(req.method, "POST");
    assert.equal(req.path, "/v2/verify_profiles");

    const body = capturedRequest().body as Record<string, unknown> | null;
    assert.ok(body);
    const sms = body!.sms as Record<string, unknown> | undefined;
    assert.ok(sms, "expected sms channel block in request body");
    assert.ok(sms!.whitelisted_destinations, "expected whitelisted_destinations");
    assert.deepEqual(sms!.whitelisted_destinations, ["US"]);
    assert.equal(sms!.code_length, 6);
    assert.equal(sms!.default_verification_timeout_secs, 300);
  });

  it("accepts --destinations flag with multiple countries", async () => {
    lastRequest = null;
    const fake = setupFakeTelnyx();
    const r = await runSetupVerifyAsync(["--destinations", "US,GB,LK", "--json"], fake.env);

    assert.equal(r.status, 0, `expected exit 0, got ${r.status}: ${r.stderr}`);
    const body = capturedRequest().body as Record<string, unknown> | null;
    assert.ok(body);
    const sms = body!.sms as Record<string, unknown> | undefined;
    assert.ok(sms);
    assert.deepEqual(sms!.whitelisted_destinations, ["US", "GB", "LK"]);
  });

  it("accepts --profile-name and includes it in the request body", async () => {
    lastRequest = null;
    const fake = setupFakeTelnyx();
    const r = await runSetupVerifyAsync(["--profile-name", "My Custom Profile", "--json"], fake.env);

    assert.equal(r.status, 0, `expected exit 0, got ${r.status}: ${r.stderr}`);
    const body = capturedRequest().body as Record<string, unknown> | null;
    assert.ok(body);
    assert.equal(body!.name, "My Custom Profile");
  });

  it("returns profile_id and ready in JSON output (no number bought)", async () => {
    lastRequest = null;
    const fake = setupFakeTelnyx();
    const r = await runSetupVerifyAsync(["--json"], fake.env);

    assert.equal(r.status, 0);
    const data = JSON.parse(r.stdout);
    assert.equal(data.profile_id, "prof_abc123");
    assert.equal(data.ready, true);
    // Verify uses Telnyx's managed sender pool — setup-verify must NOT buy a
    // number, so no phone_number/phone_number_id fields should appear.
    assert.equal(data.phone_number, undefined, "setup-verify must not buy/return a number");
    assert.equal(data.phone_number_id, undefined, "setup-verify must not buy/return a number id");
  });

  it("is a single profile-creation step (no search/buy) and never orders a number", async () => {
    lastRequest = null;
    const fake = setupFakeTelnyx();
    const r = await runSetupVerifyAsync(["--json"], fake.env);

    assert.equal(r.status, 0);
    const data = JSON.parse(r.stdout);
    assert.equal(data.steps.length, 1);
    assert.equal(data.steps[0].name, "Create verify profile");
    assert.equal(data.steps[0].status, "completed");
    // The fake Go CLI logs any invocation; a number order would shell out to it.
    const cliLog = existsSync(fake.logPath) ? readFileSync(fake.logPath, "utf8") : "";
    assert.ok(!/number|order|available/i.test(cliLog), "setup-verify must not invoke the number search/order CLI");
  });

  it("lists setup-verify in the help text", () => {
    const { stdout, status } = (function () {
      try {
        const out = execFileSync("npx", ["tsx", cliBin, "help"], {
          cwd: cliRoot,
          encoding: "utf8",
          env: { ...process.env },
          timeout: 30000,
        });
        return { stdout: out, status: 0 };
      } catch (err: any) {
        return { stdout: err.stdout?.toString() ?? "", status: err.status ?? 1 };
      }
    })();

    assert.equal(status, 0);
    assert.match(stdout, /setup-verify/);
    assert.match(stdout, /--destinations/);
  });
});
