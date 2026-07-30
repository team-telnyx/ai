/**
 * Regression tests for schedule-sms REST path (AIF-332).
 *
 * schedule-sms was REST-swapped from the Go CLI `messages schedule`
 * subcommand (which hit a nonexistent /v2/messages/schedule endpoint → 404)
 * to a direct POST /v2/messages with a `send_at` field.
 *
 * Tests use a mock HTTP server to verify the request payload and response parsing.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer, type Server, type IncomingMessage, type ServerResponse } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliRoot = join(__dirname, "..");
const launcher = join(cliRoot, "bin", "telnyx-agent.ts");

interface CapturedRequest {
  method: string;
  path: string;
  body: Record<string, unknown> | null;
}

let mockServer: Server;
let mockPort: number;

// Track the last request for assertions
let lastRequest: CapturedRequest | null = null;

/** Assert a request was captured and return it with a non-null type. */
function capturedRequest(): CapturedRequest {
  assert.ok(lastRequest, "expected the mock server to have received a request");
  return lastRequest as CapturedRequest;
}

function startMockServer(): Promise<void> {
  return new Promise((resolve) => {
    mockServer = createServer((req: IncomingMessage, res: ServerResponse) => {
      let body = "";
      req.on("data", (chunk: Buffer) => (body += chunk.toString()));
      req.on("end", () => {
        let parsedBody: Record<string, unknown> | null = null;
        try {
          parsedBody = body ? JSON.parse(body) : null;
        } catch { /* ignore parse errors */ }
        lastRequest = { method: req.method ?? "", path: req.url ?? "", body: parsedBody };

        if (req.method === "POST" && req.url === "/v2/messages") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            data: {
              id: "sched-abc-123",
              record_type: "message",
              direction: "outbound",
              from: { phone_number: parsedBody?.from ?? "", carrier: "", line_type: "" },
              to: [{ phone_number: parsedBody?.to ?? "", status: "scheduled", carrier: "", line_type: "" }],
              send_at: null, // API quirk: echoes null even though scheduling is in effect
              text: parsedBody?.text ?? "",
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

describe("schedule-sms REST (AIF-332)", () => {
  before(async () => {
    await startMockServer();
  });

  after(async () => {
    await stopMockServer();
  });

  // NOTE: must be async (spawn, not spawnSync). The mock HTTP server runs in
  // this same process; a synchronous spawn would block the event loop and the
  // server could never respond to the CLI's request → deadlock.
  function run(args: string[]): Promise<{ status: number; stdout: string; stderr: string }> {
    return new Promise((resolve) => {
      const child = spawn("npx", ["tsx", launcher, "schedule-sms", ...args], {
        cwd: cliRoot,
        env: {
          ...process.env,
          TELNYX_API_KEY: "***",
          TELNYX_API_BASE_URL: `http://127.0.0.1:${mockPort}/v2`,
        },
      });
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (c: Buffer) => (stdout += c.toString()));
      child.stderr.on("data", (c: Buffer) => (stderr += c.toString()));
      child.on("close", (code) => resolve({ status: code ?? -1, stdout, stderr }));
    });
  }

  it("POSTs to /v2/messages (not /v2/messages/schedule)", async () => {
    lastRequest = null;
    const r = await run(["--from", "+13125550000", "--to", "+13125550001", "--text", "later", "--send-at", "2026-12-31T00:00:00Z", "--json"]);
    assert.equal(r.status, 0, `exit 0 expected, got ${r.status}: ${r.stderr}`);
    const req = capturedRequest();
    assert.equal(req.method, "POST");
    assert.equal(req.path, "/v2/messages");
  });

  it("includes send_at, from, to, text in the request body", async () => {
    lastRequest = null;
    await run(["--from", "+13125550000", "--to", "+13125550001", "--text", "later", "--send-at", "2026-12-31T00:00:00Z", "--json"]);
    const body = capturedRequest().body;
    assert.ok(body);
    assert.equal(body.send_at, "2026-12-31T00:00:00Z");
    assert.equal(body.from, "+13125550000");
    assert.equal(body.to, "+13125550001");
    assert.equal(body.text, "later");
  });

  it("parses scheduled status from to[].status (API quirk: send_at echoes null)", async () => {
    const r = await run(["--from", "+13125550000", "--to", "+13125550001", "--text", "later", "--send-at", "2026-12-31T00:00:00Z", "--json"]);
    assert.equal(r.status, 0);
    const data = JSON.parse(r.stdout);
    assert.equal(data.message_id, "sched-abc-123");
    assert.equal(data.status, "scheduled");
    assert.equal(data.scheduled, true);
    assert.equal(data.send_at, "2026-12-31T00:00:00Z");
  });

  it("passes messaging-profile-id in the request body", async () => {
    lastRequest = null;
    await run(["--from", "+13125550000", "--to", "+13125550001", "--text", "later", "--send-at", "2026-12-31T00:00:00Z", "--messaging-profile-id", "prof_abc123", "--json"]);
    const body = capturedRequest().body;
    assert.ok(body);
    assert.equal(body.messaging_profile_id, "prof_abc123");
  });

  it("passes media-url as media_urls array in the request body", async () => {
    lastRequest = null;
    await run(["--from", "+13125550000", "--to", "+13125550001", "--text", "later", "--send-at", "2026-12-31T00:00:00Z", "--media-url", "https://example.com/image.png", "--json"]);
    const body = capturedRequest().body;
    assert.ok(body);
    assert.deepEqual(body.media_urls, ["https://example.com/image.png"]);
  });

  it("exits non-zero when --from is missing", async () => {
    const r = await run(["--to", "+13125550001", "--text", "later", "--send-at", "2026-12-31T00:00:00Z", "--json"]);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /--from is required/);
  });

  it("exits non-zero when --to is missing", async () => {
    const r = await run(["--from", "+13125550000", "--text", "later", "--send-at", "2026-12-31T00:00:00Z", "--json"]);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /--to is required/);
  });

  it("exits non-zero when --text is missing", async () => {
    const r = await run(["--from", "+13125550000", "--to", "+13125550001", "--send-at", "2026-12-31T00:00:00Z", "--json"]);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /--text is required/);
  });

  it("exits non-zero when --send-at is missing", async () => {
    const r = await run(["--from", "+13125550000", "--to", "+13125550001", "--text", "later", "--json"]);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /--send-at is required/);
  });

  it("exits non-zero when --send-at is not valid ISO 8601", async () => {
    const r = await run(["--from", "+13125550000", "--to", "+13125550001", "--text", "later", "--send-at", "not-a-date", "--json"]);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /--send-at must be a valid ISO 8601/);
  });

  it("does not call the Go CLI binary", async () => {
    const r = await run(["--from", "+13125550000", "--to", "+13125550001", "--text", "later", "--send-at", "2026-12-31T00:00:00Z", "--json"]);
    assert.equal(r.status, 0);
    assert.doesNotMatch(r.stderr, /telnyx CLI not found/i);
  });
});
