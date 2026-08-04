/**
 * Edge case tests for setup-voice AIF-328:
 * - Empty outbound voice profiles list
 * - API error on call_control_applications POST
 * - API error on phone_numbers PATCH
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer, type Server } from "node:http";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliRoot = join(__dirname, "..");
const cliBin = join(cliRoot, "bin", "telnyx-agent.ts");

let mockServer: Server;
let mockPort: number;
let mode = "normal";

function startMockServer(): Promise<void> {
  return new Promise((resolve) => {
    mockServer = createServer((req, res) => {
      let body = "";
      req.on("data", (c) => (body += c.toString()));
      req.on("end", () => {
        let parsed: Record<string, unknown> | null = null;
        try { parsed = body ? JSON.parse(body) : null; } catch {}

        if (mode === "empty-profiles" && req.method === "GET" && req.url === "/v2/outbound_voice_profiles") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ data: [] }));
          return;
        }

        if (mode === "cca-error" && req.method === "POST" && req.url === "/v2/call_control_applications") {
          res.writeHead(422, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ errors: [{ code: "10014", detail: "Invalid webhook URL" }] }));
          return;
        }

        if (mode === "patch-error" && req.method === "PATCH" && req.url?.startsWith("/v2/phone_numbers/")) {
          res.writeHead(422, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ errors: [{ code: "10016", detail: "Number not found" }] }));
          return;
        }

        // Normal responses
        if (req.method === "GET" && req.url === "/v2/outbound_voice_profiles") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ data: [{ id: "ovp_test", name: "Default" }] }));
          return;
        }
        if (req.method === "POST" && req.url === "/v2/call_control_applications") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ data: { id: "cca_test", application_name: "test" } }));
          return;
        }
        if (req.method === "PATCH" && req.url?.startsWith("/v2/phone_numbers/")) {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ data: { id: "num_test" } }));
          return;
        }
        res.writeHead(404).end(JSON.stringify({ errors: [{ detail: "NF" }] }));
      });
    });
    mockServer.listen(0, "127.0.0.1", () => {
      const a = mockServer.address();
      mockPort = typeof a === "object" && a ? a.port : 0;
      resolve();
    });
  });
}

function stopMockServer(): Promise<void> {
  return new Promise((r) => mockServer.close(() => r()));
}

function setupFake(env: NodeJS.ProcessEnv, opts?: { unresolvableOrder?: boolean }): NodeJS.ProcessEnv {
  const tmp = mkdtempSync(join(tmpdir(), "aif328-edge-"));
  const bin = join(tmp, "bin");
  mkdirSync(bin, { recursive: true });
  const fake = join(bin, "telnyx");
  // When unresolvableOrder is set, the order SUCCEEDS but `phone-numbers
  // retrieve` never returns an id (simulating a post-order lookup that
  // times out / is eventually-consistent). This must trigger
  // NumberOrderedButUnresolvedError so setup-voice KEEPS the created app
  // (the number was likely bought and assigned) instead of orphaning it.
  const retrieveBody = opts?.unresolvableOrder
    ? `console.log(JSON.stringify({ data: {} }));`
    : `console.log(JSON.stringify({ data: { id: "num_123", phone_number: "+13125550001" } }));`;
  writeFileSync(fake, `#!/usr/bin/env node
const args = process.argv.slice(2).filter(a => a !== "--format" && a !== "json");
const cmd = args.join(" ");
if (cmd.startsWith("available-phone-numbers")) {
  console.log(JSON.stringify({ data: [{ phone_number: "+13125550001", country: "US" }] }));
} else if (cmd.startsWith("number-order") || cmd.startsWith("number-orders")) {
  console.log(JSON.stringify({ data: { id: "order_123", status: "complete" } }));
} else if (cmd.startsWith("phone-numbers retrieve")) {
  ${retrieveBody}
} else {
  console.log(JSON.stringify({ data: {} }));
}
`);
  chmodSync(fake, 0o755);
  return {
    ...env,
    PATH: `${bin}:${env.PATH}`,
    TELNYX_CLI_PATH: fake,
    TELNYX_API_KEY: "test_key",
    TELNYX_API_BASE_URL: `http://127.0.0.1:${mockPort}/v2`,
  };
}

function run(args: string[], env: NodeJS.ProcessEnv): Promise<{ status: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const c = spawn("npx", ["tsx", cliBin, ...args], { cwd: cliRoot, env });
    let out = "", err = "";
    c.stdout.on("data", (d) => (out += d.toString()));
    c.stderr.on("data", (d) => (err += d.toString()));
    c.on("close", (code) => resolve({ status: code ?? -1, stdout: out, stderr: err }));
  });
}

describe("setup-voice edge cases (AIF-328)", () => {
  before(async () => { await startMockServer(); });
  after(async () => { await stopMockServer(); });

  it("empty outbound voice profiles list → clear error", async () => {
    mode = "empty-profiles";
    const env = setupFake(process.env);
    const r = await run(["setup-voice", "--json"], env);
    assert.equal(r.status, 1);
    const data = JSON.parse(r.stdout);
    assert.equal(data.ready, false);
    assert.match(data.error, /No outbound voice profiles found/);
  });

  it("call_control_applications POST 422 → error in JSON", async () => {
    mode = "cca-error";
    const env = setupFake(process.env);
    const r = await run(["setup-voice", "--json"], env);
    assert.equal(r.status, 1);
    const data = JSON.parse(r.stdout);
    assert.equal(data.ready, false);
    assert.match(data.error, /Invalid webhook URL/);
    assert.match(data.error, /HTTP 422/);
  });

  it("phone_numbers PATCH error → error with step 5 failure", async () => {
    mode = "patch-error";
    const env = setupFake(process.env);
    const r = await run(["setup-voice", "--json"], env);
    assert.equal(r.status, 1);
    const data = JSON.parse(r.stdout);
    assert.equal(data.ready, false);
    // Steps 1-4 should succeed, step 5 should fail
    const step5 = data.steps.find((s: any) => s.step === 5);
    assert.equal(step5.status, "failed");
    assert.match(step5.detail, /Number not found/);
    // connection_id should be set (steps 1-2 succeeded)
    assert.ok(data.connection_id, "connection_id should be set even if step 5 fails");
  });

  it("human mode: empty profiles → prints error + steps", async () => {
    mode = "empty-profiles";
    const env = setupFake(process.env);
    const r = await run(["setup-voice"], env);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /No outbound voice profiles found/);
  });

  it("order placed but number id unresolvable → KEEPS the app (no orphaned paid number)", async () => {
    // The number order succeeds but the follow-up id lookup never resolves.
    // The number may already be bought AND assigned to the created app, so
    // deleting the app would orphan a paid number. setup-voice must keep it.
    mode = "normal";
    // --force so we always create a fresh app (createdAppId set) instead of
    // reusing/adopting an existing one.
    const env = setupFake(process.env, { unresolvableOrder: true });
    const r = await run(["setup-voice", "--force", "--json"], env);
    assert.equal(r.status, 1, "should exit non-zero when the number can't be resolved");
    const data = JSON.parse(r.stdout);
    assert.equal(data.ready, false);
    // The app created this run must be KEPT, not deleted — the number was
    // likely purchased and assigned to it.
    assert.equal(data.orphan_cleanup, "kept", "created app must be kept when the order was placed but unresolved");
    assert.ok(data.connection_id, "connection_id (the created app) should be reported");
  });
});
