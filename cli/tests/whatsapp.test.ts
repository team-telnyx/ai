/**
 * Tests for WhatsApp commands.
 *
 * whatsapp-send still shells out to the Go CLI (`messages send-whatsapp`), so
 * those tests use the fake `telnyx` binary and assert flag passing.
 *
 * whatsapp-templates and setup-whatsapp now call the Telnyx REST API directly
 * (AIF-326: the pinned Go CLI built a doubled `/v2/v2/whatsapp/...` path that
 * 404'd every whatsapp:* resource command). Those tests stand up a throwaway
 * local HTTP server as the API and assert on the requests it receives.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliRoot = join(__dirname, "..");
const cliBin = join(cliRoot, "bin", "telnyx-agent.ts");

/**
 * Create a fake `telnyx` binary that logs its args and returns canned JSON
 * based on the subcommand being called.
 */
function setupFakeTelnyx(): { fakeTelnyx: string; logPath: string; env: NodeJS.ProcessEnv } {
  const tempDir = mkdtempSync(join(tmpdir(), "telnyx-agent-wa-"));
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
const format = fmtIdx >= 0 ? args[fmtIdx + 1] : "json";
const cmd = args.filter((a, i) => i !== fmtIdx && i !== fmtIdx + 1);

// Emulate the real Go CLI list behavior: with --format json, list commands
// route through ShowJSONIterator and print each item as a SEPARATE
// pretty-printed JSON document (concatenated — NOT a JSON array, NOT a
// { data: [...] } envelope). Only --format raw prints the REST envelope.
function printList(items) {
  if (format === "raw") {
    console.log(JSON.stringify({ data: items, meta: { total_results: items.length } }));
  } else {
    for (const item of items) console.log(JSON.stringify(item, null, 2));
  }
}

// WhatsApp Business Accounts — list
if (cmd[0] === "whatsapp:business-accounts" && cmd[1] === "list") {
  printList([{ id: "waba_test123", name: "Test WABA" }]);
}
// WhatsApp Business Account phone numbers — list
else if (cmd[0] === "whatsapp:business-accounts:phone-numbers" && cmd[1] === "list") {
  printList([]);
}
// WhatsApp Business Account phone numbers — initialize-verification
else if (cmd[0] === "whatsapp:business-accounts:phone-numbers" && cmd[1] === "initialize-verification") {
  console.log(JSON.stringify({ data: { id: "wa_ph_test", status: "pending" } }));
}
// WhatsApp phone numbers — verify
else if (cmd[0] === "whatsapp:phone-numbers" && cmd[1] === "verify") {
  console.log(JSON.stringify({ data: { phone_number: cmd[cmd.indexOf("--phone-number") + 1], status: "verified" } }));
}
// WhatsApp phone numbers — profile retrieve
else if (cmd[0] === "whatsapp:phone-numbers:profile" && cmd[1] === "retrieve") {
  console.log(JSON.stringify({ data: { display_name: "Test", about: "Hello" } }));
}
// WhatsApp phone numbers — profile update
else if (cmd[0] === "whatsapp:phone-numbers:profile" && cmd[1] === "update") {
  console.log(JSON.stringify({ data: { display_name: "Updated", status: "updated" } }));
}
// WhatsApp templates — list
else if (cmd[0] === "whatsapp:templates" && cmd[1] === "list") {
  printList([{ id: "tpl_1", name: "order_ready", language: "en_US", category: "UTILITY", status: "APPROVED" }, { id: "tpl_2", name: "order_shipped", language: "en_US", category: "UTILITY", status: "PENDING" }]);
}
// WhatsApp templates — create
else if (cmd[0] === "whatsapp:templates" && cmd[1] === "create") {
  console.log(JSON.stringify({ data: { id: "tpl_new", name: cmd[cmd.indexOf("--name") + 1], status: "PENDING" } }));
}
// Messages send-whatsapp
else if (cmd[0] === "messages" && cmd[1] === "send-whatsapp") {
  // Mirror the real Telnyx envelope: per-recipient state lives in to[0].status
  // while the top-level status is a coarse "submitted". The wrapper must
  // surface the recipient status, not the top-level one.
  console.log(JSON.stringify({ data: { id: "msg_abc123", to: [{ status: "queued" }], status: "submitted" } }));
}
// available-phone-numbers list (for setup-whatsapp number search).
// Pre-existing callers (utils/number-order.ts) still read this with
// --format json, so keep the envelope here regardless of format.
else if (cmd[0] === "available-phone-numbers" && cmd[1] === "list") {
  console.log(JSON.stringify({ data: [{ phone_number: "+15551234567" }] }));
}
// number-orders create (for setup-whatsapp number buy)
else if (cmd[0] === "number-orders" && cmd[1] === "create") {
  console.log(JSON.stringify({ data: { id: "order_123", status: "pending" } }));
}
// phone-numbers retrieve (for searchAndBuyNumber resolution)
else if (cmd[0] === "phone-numbers" && cmd[1] === "retrieve") {
  console.log(JSON.stringify({ data: { id: "ph_test123", phone_number: "+15551234567" } }));
}
// phone-numbers update
else if (cmd[0] === "phone-numbers" && cmd[1] === "update") {
  console.log(JSON.stringify({ data: { id: "ph_test123", status: "updated" } }));
}
// Fallback
else {
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
      TELNYX_CLI_PATH: fakeTelnyx,
      TELNYX_FAKE_ARGS_LOG: logPath,
      TELNYX_API_KEY: "KEY_fake_test",
    },
  };
}

function readLoggedArgs(logPath: string): string[][] {
  return readFileSync(logPath, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function runCli(args: string[], env: NodeJS.ProcessEnv): string {
  return execFileSync("npx", ["tsx", cliBin, ...args], {
    cwd: cliRoot,
    encoding: "utf8",
    env,
    timeout: 30000,
  });
}

/**
 * Async spawn of the CLI. Required for the REST tests: the mock HTTP server runs
 * in this same process, so the CLI must be spawned asynchronously (a synchronous
 * execFileSync would block the event loop and the in-process server could never
 * accept the connection).
 */
function runCliAsync(args: string[], env: NodeJS.ProcessEnv): Promise<{ status: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn("npx", ["tsx", cliBin, ...args], { cwd: cliRoot, env });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`timeout running: ${args.join(" ")}`));
    }, 30000);
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (status) => {
      clearTimeout(timer);
      resolve({ status, stdout, stderr });
    });
  });
}

interface RecordedRequest {
  method: string;
  url: string;
  path: string;
  query: URLSearchParams;
  body: Record<string, unknown> | undefined;
}

interface MockApi {
  baseUrl: string;
  requests: RecordedRequest[];
  close: () => Promise<void>;
}

type RouteResponder = (req: RecordedRequest) => { status?: number; json: unknown } | undefined;

/**
 * Stand up a throwaway local HTTP server that stands in for the Telnyx REST API.
 * Every request is recorded (method, path, query, parsed JSON body) and the
 * responder decides the reply. An unmatched route returns 404 with a
 * Telnyx-shaped error envelope so a regression to the doubled `/v2/v2` path or
 * a wrong endpoint fails loudly (this is exactly the AIF-326 symptom).
 */
function startMockApi(responder: RouteResponder): Promise<MockApi> {
  const requests: RecordedRequest[] = [];
  return new Promise((resolve) => {
    const server = createServer((req: IncomingMessage, res: ServerResponse) => {
      let raw = "";
      req.on("data", (c) => (raw += c.toString()));
      req.on("end", () => {
        const parsed = new URL(req.url ?? "/", "http://127.0.0.1");
        const record: RecordedRequest = {
          method: req.method ?? "GET",
          url: req.url ?? "/",
          path: parsed.pathname,
          query: parsed.searchParams,
          body: raw ? (JSON.parse(raw) as Record<string, unknown>) : undefined,
        };
        requests.push(record);
        const out = responder(record);
        if (out) {
          res.writeHead(out.status ?? 200, { "content-type": "application/json" });
          res.end(JSON.stringify(out.json));
        } else {
          res.writeHead(404, { "content-type": "application/json" });
          res.end(JSON.stringify({ errors: [{ code: "10005", title: "Resource not found", detail: `no route for ${record.method} ${record.path}` }] }));
        }
      });
    });
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      resolve({
        baseUrl: `http://127.0.0.1:${port}`,
        requests,
        close: () => new Promise((done) => server.close(() => done())),
      });
    });
  });
}

/** Env for REST-path tests: point the client at the mock and give it a key. */
function restEnv(mock: MockApi): NodeJS.ProcessEnv {
  return { ...process.env, TELNYX_API_KEY: "KEY_fake_test", TELNYX_API_BASE_URL: mock.baseUrl };
}

/**
 * Responder for the setup-whatsapp happy path with a single existing phone
 * number in the given status ("connected" reuses+verifies; "pending" requires a
 * --code). Covers WABA list, phone-number list, verify, and profile
 * retrieve/update endpoints — all on the un-doubled /v2/whatsapp/... paths.
 */
function setupWhatsappResponder(numberStatus: string): RouteResponder {
  const phone = "+155****4567";
  return (req) => {
    if (req.method === "GET" && req.path === "/whatsapp/business_accounts") {
      return { json: { data: [{ id: "waba_test123", name: "Test WABA" }] } };
    }
    if (req.method === "GET" && req.path === "/whatsapp/business_accounts/waba_test123/phone_numbers") {
      return { json: { data: [{ phone_number: phone, status: numberStatus, enabled: true }] } };
    }
    if (req.method === "POST" && /\/whatsapp\/phone_numbers\/.+\/verify$/.test(req.path)) {
      return { json: { data: { phone_number: phone, status: "verified" } } };
    }
    if (req.method === "POST" && /\/whatsapp\/business_accounts\/.+\/phone_numbers$/.test(req.path)) {
      return { json: { data: { id: "wa_ph_test", status: "pending" } } };
    }
    if (req.method === "PATCH" && /\/whatsapp\/phone_numbers\/.+\/profile$/.test(req.path)) {
      return { json: { data: { display_name: "Updated", status: "updated" } } };
    }
    if (req.method === "GET" && /\/whatsapp\/phone_numbers\/.+\/profile$/.test(req.path)) {
      return { json: { data: { display_name: "Test", about: "Hello" } } };
    }
    if (req.method === "POST" && req.path === "/messaging_profiles") {
      return { json: { data: { id: "mp_test123" } } };
    }
    return undefined;
  };
}

describe("WhatsApp commands", () => {
  it("help text includes WhatsApp commands", () => {
    const fake = setupFakeTelnyx();
    const output = runCli(["help"], fake.env);
    assert.ok(output.includes("setup-whatsapp"), "help must list setup-whatsapp");
    assert.ok(output.includes("whatsapp-send"), "help must list whatsapp-send");
    assert.ok(output.includes("whatsapp-templates"), "help must list whatsapp-templates");
    assert.ok(output.includes("--waba-id"), "help must document --waba-id flag");
    assert.ok(output.includes("--template-name"), "help must document --template-name flag");
  });

  it("capabilities includes WhatsApp category", () => {
    const fake = setupFakeTelnyx();
    const output = runCli(["capabilities", "--json"], fake.env);
    const data = JSON.parse(output);
    assert.ok(data.api_capabilities["💬 WhatsApp"], "capabilities must include WhatsApp category");
    assert.ok(
      data.api_capabilities["💬 WhatsApp"][0].actions.includes("send_whatsapp_message"),
      "WhatsApp capabilities must include send_whatsapp_message action",
    );
  });

  it("whatsapp-send constructs correct text message JSON and passes to Go CLI", () => {
    const fake = setupFakeTelnyx();
    const output = runCli(
      ["whatsapp-send", "--from", "+15551234567", "--to", "+15559876543", "--text", "Hello World!", "--json"],
      fake.env,
    );

    const data = JSON.parse(output);
    assert.equal(data.status, "queued");
    assert.equal(data.from, "+15551234567");
    assert.equal(data.to, "+15559876543");
    assert.equal(data.message_type, "text");

    const calls = readLoggedArgs(fake.logPath);
    const sendCall = calls.find((a) => a.slice(0, 2).join(" ") === "messages send-whatsapp");
    assert.ok(sendCall, "must call messages send-whatsapp");

    // Verify the --whatsapp-message JSON was constructed correctly
    const msgIdx = sendCall.indexOf("--whatsapp-message");
    assert.notEqual(msgIdx, -1, "must include --whatsapp-message flag");
    const msgJson = JSON.parse(sendCall[msgIdx + 1]);
    assert.equal(msgJson.type, "text");
    assert.equal(msgJson.text.body, "Hello World!");
  });

  it("whatsapp-send constructs correct template message JSON", () => {
    const fake = setupFakeTelnyx();
    runCli(
      ["whatsapp-send", "--from", "+15551234567", "--to", "+15559876543", "--template-name", "order_ready", "--template-language", "es_ES", "--json"],
      fake.env,
    );

    const calls = readLoggedArgs(fake.logPath);
    const sendCall = calls.find((a) => a.slice(0, 2).join(" ") === "messages send-whatsapp");
    assert.ok(sendCall, "must call messages send-whatsapp");

    const msgIdx = sendCall.indexOf("--whatsapp-message");
    const msgJson = JSON.parse(sendCall[msgIdx + 1]);
    assert.equal(msgJson.type, "template");
    assert.equal(msgJson.template.name, "order_ready");
    assert.equal(msgJson.template.language.code, "es_ES");
  });

  it("whatsapp-send fails without --text or --template-name", () => {
    const fake = setupFakeTelnyx();
    try {
      runCli(["whatsapp-send", "--from", "+15551234567", "--to", "+15559876543", "--json"], fake.env);
      assert.fail("should have exited with error");
    } catch (err: any) {
      assert.ok(err.status !== 0, "non-zero exit expected");
    }
  });

  it("whatsapp-templates list GETs /v2/whatsapp/message_templates WITHOUT the broken filter[waba_id] (AIF-326)", async () => {
    const mock = await startMockApi((req) => {
      if (req.method === "GET" && req.path === "/whatsapp/message_templates") {
        // Live API returns waba_id: null on records — the server-side filter would
        // hide everything, so the CLI must not send it.
        return { json: { data: [{ id: "tpl_1", name: "order_ready", language: "en_US", category: "UTILITY", status: "APPROVED", waba_id: null }] } };
      }
      return undefined;
    });
    try {
      const { status, stdout } = await runCliAsync(["whatsapp-templates", "--waba-id", "waba_abc", "--json"], restEnv(mock));
      assert.equal(status, 0, `expected success, stderr present? stdout=${stdout}`);
      const data = JSON.parse(stdout);
      assert.equal(data.waba_id, "waba_abc");
      assert.ok(data.templates.length > 0, "should still return templates whose waba_id is null");
      // The single request must hit the un-doubled resource path (the AIF-326 bug
      // was a doubled `/v2/v2/...`; the mock base URL already carries the /v2).
      assert.equal(mock.requests.length, 1);
      assert.equal(mock.requests[0].path, "/whatsapp/message_templates");
      // The broken server-side waba filter must NOT be sent.
      assert.equal(mock.requests[0].query.get("filter[waba_id]"), null);
    } finally {
      await mock.close();
    }
  });

  it("whatsapp-templates list works without --waba-id (list mode no longer requires it)", async () => {
    const mock = await startMockApi((req) => {
      if (req.method === "GET" && req.path === "/whatsapp/message_templates") {
        return { json: { data: [{ id: "tpl_1", name: "order_ready", language: "en_US", category: "UTILITY", status: "APPROVED", waba_id: null }] } };
      }
      return undefined;
    });
    try {
      const { status, stdout } = await runCliAsync(["whatsapp-templates", "--json"], restEnv(mock));
      assert.equal(status, 0, `expected success without --waba-id; stdout=${stdout}`);
      const data = JSON.parse(stdout);
      assert.ok(data.templates.length > 0, "should list templates without a waba id");
      assert.equal(mock.requests[0].query.get("filter[waba_id]"), null);
    } finally {
      await mock.close();
    }
  });

  it("whatsapp-templates list narrows client-side when records DO carry a matching waba_id", async () => {
    const mock = await startMockApi((req) => {
      if (req.method === "GET" && req.path === "/whatsapp/message_templates") {
        return { json: { data: [
          { id: "tpl_1", name: "mine", language: "en_US", category: "UTILITY", status: "APPROVED", waba_id: "waba_abc" },
          { id: "tpl_2", name: "other", language: "en_US", category: "UTILITY", status: "APPROVED", waba_id: "waba_xyz" },
        ] } };
      }
      return undefined;
    });
    try {
      const { status, stdout } = await runCliAsync(["whatsapp-templates", "--waba-id", "waba_abc", "--json"], restEnv(mock));
      assert.equal(status, 0);
      const data = JSON.parse(stdout);
      assert.equal(data.templates.length, 1, "should keep only the matching waba_id");
      assert.equal(data.templates[0].name, "mine");
    } finally {
      await mock.close();
    }
  });

  it("whatsapp-templates list forwards filter[status] when --status is provided (AIF-326)", async () => {
    const mock = await startMockApi((req) => {
      if (req.method === "GET" && req.path === "/whatsapp/message_templates") {
        return { json: { data: [] } };
      }
      return undefined;
    });
    try {
      const { status } = await runCliAsync(["whatsapp-templates", "--waba-id", "waba_abc", "--status", "APPROVED", "--json"], restEnv(mock));
      assert.equal(status, 0);
      // waba filter must not be sent; status filter still is.
      assert.equal(mock.requests[0].query.get("filter[waba_id]"), null);
      assert.equal(mock.requests[0].query.get("filter[status]"), "APPROVED");
    } finally {
      await mock.close();
    }
  });

  it("whatsapp-templates create POSTs /v2/whatsapp/message_templates with the components array (AIF-326)", async () => {
    const mock = await startMockApi((req) => {
      if (req.method === "POST" && req.path === "/whatsapp/message_templates") {
        return { json: { data: { id: "tpl_new", name: (req.body?.name as string) ?? "", status: "PENDING" } } };
      }
      return undefined;
    });
    try {
      const component = '[{"type":"BODY","text":"Your order is ready"}]';
      const { status, stdout } = await runCliAsync(
        ["whatsapp-templates", "--waba-id", "waba_abc", "--create", "--name", "order_ready", "--language", "en_US", "--category", "UTILITY", "--component", component, "--json"],
        restEnv(mock),
      );
      assert.equal(status, 0);
      const data = JSON.parse(stdout);
      assert.equal(data.name, "order_ready");
      assert.equal(data.category, "UTILITY");

      assert.equal(mock.requests.length, 1);
      const body = mock.requests[0].body!;
      assert.equal(body.waba_id, "waba_abc");
      assert.equal(body.name, "order_ready");
      assert.equal(body.language, "en_US");
      assert.equal(body.category, "UTILITY");
      const components = body.components as Array<Record<string, unknown>>;
      assert.ok(Array.isArray(components), "components must be a JSON array");
      assert.equal(components.length, 1);
      assert.equal(components[0].type, "BODY");
      assert.equal(components[0].text, "Your order is ready");
    } finally {
      await mock.close();
    }
  });

  it("setup-whatsapp GETs the un-doubled WABA + phone-number REST paths and picks the first WABA (AIF-326)", async () => {
    const mock = await startMockApi(setupWhatsappResponder("connected"));
    try {
      const { status, stdout } = await runCliAsync(["setup-whatsapp", "--json"], restEnv(mock));
      assert.equal(status, 0, `expected success, stdout=${stdout}`);
      const data = JSON.parse(stdout);
      assert.equal(data.waba_id, "waba_test123");

      // Both list calls must hit the singular /v2/whatsapp/... path (no /v2/v2).
      assert.ok(mock.requests.some((r) => r.method === "GET" && r.path === "/whatsapp/business_accounts"), "must GET /whatsapp/business_accounts");
      assert.ok(
        mock.requests.some((r) => r.method === "GET" && r.path === "/whatsapp/business_accounts/waba_test123/phone_numbers"),
        "must GET the WABA phone_numbers subresource",
      );
      // No request path may contain a doubled /v2 segment.
      assert.ok(!mock.requests.some((r) => r.path.includes("/v2/")), "no request path should contain a doubled /v2");
    } finally {
      await mock.close();
    }
  });

  it("setup-whatsapp with --code POSTs the verify endpoint with the code (AIF-326)", async () => {
    const mock = await startMockApi(setupWhatsappResponder("pending"));
    try {
      const { status } = await runCliAsync(["setup-whatsapp", "--code", "123456", "--json"], restEnv(mock));
      assert.equal(status, 0);
      const verify = mock.requests.find((r) => r.method === "POST" && /\/whatsapp\/phone_numbers\/.+\/verify$/.test(r.path));
      assert.ok(verify, "must POST the whatsapp verify endpoint when --code is provided");
      assert.equal(verify!.body?.code, "123456");
    } finally {
      await mock.close();
    }
  });

  it("setup-whatsapp with --display-name and --category PATCHes the profile (AIF-326)", async () => {
    const mock = await startMockApi(setupWhatsappResponder("connected"));
    try {
      const { status } = await runCliAsync(["setup-whatsapp", "--display-name", "Acme", "--category", "RETAIL", "--json"], restEnv(mock));
      assert.equal(status, 0);
      const profile = mock.requests.find((r) => r.method === "PATCH" && /\/whatsapp\/phone_numbers\/.+\/profile$/.test(r.path));
      assert.ok(profile, "must PATCH the profile endpoint when profile flags are provided");
      assert.equal(profile!.body?.display_name, "Acme");
      assert.equal(profile!.body?.category, "RETAIL");
    } finally {
      await mock.close();
    }
  });

  it("setup-whatsapp reports ready=true when number is connected (no --code needed)", async () => {
    const mock = await startMockApi(setupWhatsappResponder("connected"));
    try {
      const { status, stdout } = await runCliAsync(["setup-whatsapp", "--json"], restEnv(mock));
      assert.equal(status, 0);
      const data = JSON.parse(stdout);
      assert.equal(data.verified, true);
      assert.equal(data.ready, true);
    } finally {
      await mock.close();
    }
  });

  it("setup-whatsapp reports ready=false when number is pending and no --code", async () => {
    const mock = await startMockApi(setupWhatsappResponder("pending"));
    try {
      const { status, stdout } = await runCliAsync(["setup-whatsapp", "--json"], restEnv(mock));
      assert.equal(status, 0);
      const data = JSON.parse(stdout);
      assert.equal(data.verified, false);
      assert.equal(data.ready, false);
    } finally {
      await mock.close();
    }
  });

  it("whatsapp-templates list parses the full data envelope (AIF-326)", async () => {
    const mock = await startMockApi((req) => {
      if (req.method === "GET" && req.path === "/whatsapp/message_templates") {
        return {
          json: {
            data: [
              { id: "tpl_1", name: "order_ready", language: "en_US", category: "UTILITY", status: "APPROVED" },
              { id: "tpl_2", name: "order_shipped", language: "en_US", category: "UTILITY", status: "PENDING" },
            ],
          },
        };
      }
      return undefined;
    });
    try {
      const { status, stdout } = await runCliAsync(["whatsapp-templates", "--waba-id", "waba_abc", "--json"], restEnv(mock));
      assert.equal(status, 0);
      const data = JSON.parse(stdout);
      assert.equal(data.templates.length, 2, "must parse all templates from the data envelope");
    } finally {
      await mock.close();
    }
  });
});
