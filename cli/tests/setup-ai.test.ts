/**
 * setup-ai step 4: the number must point at the assistant's own TeXML app
 * (telephony_settings.default_texml_app_id), whose voice_url serves the
 * assistant's TeXML. setup-ai used to create a second TeXML app with
 * voice_url .../ai/assistants/{id}/call, a route that answers 404, so calls
 * to the new number failed.
 *
 * Mock HTTP server for the REST calls, fake Go CLI binary for assistant
 * creation and the number search/order steps (same harness as
 * setup-assign-flags.test.ts).
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

const ASSISTANT_ID = "assistant-00000000-0000-4000-8000-000000000001";
const TEXML_APP_ID = "2900000000000000001";

interface CapturedRequest {
  method: string;
  path: string;
  body: Record<string, unknown> | null;
}

let mockServer: Server;
let mockPort: number;
let captured: CapturedRequest[] = [];

function startMockServer(): Promise<void> {
  return new Promise((resolve) => {
    mockServer = createServer((req, res) => {
      let body = "";
      req.on("data", (chunk: Buffer) => (body += chunk.toString()));
      req.on("end", () => {
        let parsed: Record<string, unknown> | null = null;
        try {
          parsed = body ? JSON.parse(body) : null;
        } catch { /* ignore */ }
        captured.push({ method: req.method ?? "", path: req.url ?? "", body: parsed });
        res.setHeader("Content-Type", "application/json");

        if (req.method === "GET" && req.url === `/v2/ai/assistants/${ASSISTANT_ID}`) {
          res.end(JSON.stringify({ id: ASSISTANT_ID, telephony_settings: { default_texml_app_id: TEXML_APP_ID } }));
          return;
        }
        if (req.method === "GET" && req.url?.startsWith("/v2/phone_numbers?")) {
          res.end(JSON.stringify({ data: [{ id: "num_123456", phone_number: "+13125550001" }] }));
          return;
        }
        if (req.method === "PATCH" && req.url?.startsWith("/v2/phone_numbers/")) {
          res.end(JSON.stringify({ data: { id: req.url.split("/").pop(), ...parsed } }));
          return;
        }
        res.writeHead(404);
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

/** A fake Go CLI; `withTelephony` controls whether assistant creation returns the TeXML app id. */
function fakeTelnyx(withTelephony: boolean): NodeJS.ProcessEnv {
  const binDir = join(mkdtempSync(join(tmpdir(), "telnyx-agent-setup-ai-")), "bin");
  mkdirSync(binDir, { recursive: true });
  const bin = join(binDir, "telnyx");
  const assistant = withTelephony
    ? { id: ASSISTANT_ID, telephony_settings: { default_texml_app_id: TEXML_APP_ID } }
    : { id: ASSISTANT_ID };
  writeFileSync(
    bin,
    `#!/usr/bin/env node
const cmd = process.argv.slice(2).filter((a, i, all) => a !== "--format" && all[i - 1] !== "--format").join(" ");
if (cmd.startsWith("ai:assistants create")) console.log(${JSON.stringify(JSON.stringify(assistant))});
else if (cmd.startsWith("available-phone-numbers list")) console.log(JSON.stringify({ data: [{ phone_number: "+13125550001", country: "US", capabilities: ["voice"] }] }));
else if (cmd.startsWith("number-orders create") || cmd.startsWith("number-order create")) console.log(JSON.stringify({ data: { id: "order_123", status: "success" } }));
else if (cmd.startsWith("phone-numbers retrieve")) console.log(JSON.stringify({ data: { id: "num_123456", phone_number: "+13125550001" } }));
else console.log(JSON.stringify({ data: {} }));
`,
  );
  chmodSync(bin, 0o755);
  return {
    ...process.env,
    PATH: `${binDir}:${process.env.PATH}`,
    TELNYX_CLI_PATH: bin,
    TELNYX_API_KEY: "***",
    TELNYX_API_BASE_URL: `http://127.0.0.1:${mockPort}/v2`,
  };
}

function run(env: NodeJS.ProcessEnv): Promise<{ status: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn("npx", ["tsx", cliBin, "setup-ai", "--json"], { cwd: cliRoot, env });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (c: Buffer) => (stdout += c.toString()));
    child.stderr.on("data", (c: Buffer) => (stderr += c.toString()));
    child.on("close", (code) => resolve({ status: code ?? -1, stdout, stderr }));
  });
}

describe("setup-ai step 4: wire the number to the assistant's TeXML app", () => {
  before(startMockServer);
  after(() => new Promise<void>((resolve) => mockServer.close(() => resolve())));

  it("assigns the assistant's default TeXML app and creates no other", async () => {
    captured = [];
    const r = await run(fakeTelnyx(true));

    assert.equal(r.status, 0, `expected exit 0, got ${r.status}: ${r.stderr}`);
    assert.equal(captured.filter((c) => c.path.startsWith("/v2/texml_applications")).length, 0);
    const patch = captured.find((c) => c.method === "PATCH");
    assert.ok(patch, "expected a PATCH /phone_numbers/:id");
    assert.equal(patch.path, "/v2/phone_numbers/num_123456");
    assert.deepEqual(patch.body, { connection_id: TEXML_APP_ID });
    const result = JSON.parse(r.stdout);
    assert.equal(result.ready, true);
    assert.equal(result.texml_app_id, TEXML_APP_ID);
  });

  it("reads the TeXML app id back when the create response leaves it out", async () => {
    captured = [];
    const r = await run(fakeTelnyx(false));

    assert.equal(r.status, 0, `expected exit 0, got ${r.status}: ${r.stderr}`);
    assert.ok(captured.some((c) => c.method === "GET" && c.path === `/v2/ai/assistants/${ASSISTANT_ID}`));
    assert.deepEqual(captured.find((c) => c.method === "PATCH")?.body, { connection_id: TEXML_APP_ID });
    assert.equal(JSON.parse(r.stdout).texml_app_id, TEXML_APP_ID);
  });
});
