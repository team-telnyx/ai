import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, chmodSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer, type Server } from "node:http";

const root = new URL("../", import.meta.url).pathname;
let server: Server;
let port: number;
let dir: string;
let requests: Array<{ method: string; path: string; body: any }> = [];
let appMode = "ok";
let assignmentFails = false;
let assignmentConfirmed = true;

before(async () => {
  dir = mkdtempSync(join(tmpdir(), "setup-ai-"));
  const fake = join(dir, "telnyx");
  writeFileSync(fake, `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.TEST_ARGS_LOG, JSON.stringify(args) + '\\n');
const cmd = args.slice(0, 2).join(' ');
let data;
if (cmd === 'ai:assistants create' || cmd === 'ai:assistants retrieve') {
  data = process.env.TEST_MODE === 'missing-assistant' ? {} : { id: 'assistant-1', name: 'Existing assistant', ...(process.env.TEST_MODE === 'default-app' ? {telephony_settings: {default_texml_app_id: 'app-1'}} : {}) };
} else if (cmd === 'available-phone-numbers list') {
  data = [{ phone_number: '+13125550001' }];
} else if (cmd === 'number-orders create') {
  data = { id: 'order-1', status: 'success' };
} else if (cmd === 'phone-numbers retrieve') {
  if (process.env.TEST_MODE === 'unresolved-number') { console.error('lookup failed'); process.exit(1); }
  data = { id: 'number-1', phone_number: '+13125550001', country_iso_alpha2: 'US', connection_id: process.env.TEST_MODE === 'assigned-elsewhere' ? 'other-app' : process.env.TEST_MODE === 'assigned-here' ? 'app-1' : null };
} else { console.error('Unexpected command ' + args.join(' ')); process.exit(1); }
console.log(JSON.stringify({data}));
`);
  chmodSync(fake, 0o755);
  server = createServer((req, res) => {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", () => {
      requests.push({ method: req.method!, path: req.url!, body: body ? JSON.parse(body) : null });
      res.setHeader("Content-Type", "application/json");
      if (req.method === "GET" && req.url === "/v2/texml_applications/app-1") {
        res.end(JSON.stringify({ data: { id: appMode === "wrong-id" ? "other-app" : "app-1", active: appMode !== "inactive", voice_url: `https://api.telnyx.com/v2/ai/assistants/${appMode === "mismatch" ? "other" : "assistant-1"}/${appMode === "legacy" ? "call" : "texml"}`, voice_method: appMode === "wrong-method" ? "post" : "get" } }));
      } else if (req.method === "POST" && req.url === "/v2/texml_applications") {
        res.end(JSON.stringify({ data: appMode === "missing" ? {} : { id: "app-1" } }));
      } else if (req.method === "PATCH" && req.url === "/v2/phone_numbers/number-1") {
        if (assignmentFails) { res.statusCode = 400; res.end(JSON.stringify({ errors: [{ detail: "assignment rejected" }] })); }
        else res.end(JSON.stringify({ data: { id: "number-1", ...(assignmentConfirmed ? JSON.parse(body) : {}) } }));
      } else { res.statusCode = 404; res.end('{}'); }
    });
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  port = (server.address() as { port: number }).port;
});
after(async () => {
  await new Promise<void>(resolve => server.close(() => resolve()));
  rmSync(dir, { recursive: true, force: true });
});
beforeEach(() => { requests = []; appMode = "ok"; assignmentFails = false; assignmentConfirmed = true; writeFileSync(join(dir, "args"), ""); });

async function run(args: string[] = [], mode = "ok") {
  const child = spawn(process.execPath, ["--import", "tsx", "bin/telnyx-agent.ts", "setup-ai", "--json", ...args], {
    cwd: root,
    env: { ...process.env, TELNYX_API_KEY: "test-only", TELNYX_API_BASE_URL: `http://127.0.0.1:${port}/v2`, TELNYX_CLI_PATH: join(dir, "telnyx"), TEST_ARGS_LOG: join(dir, "args"), TEST_MODE: mode, TELNYX_TELEMETRY_ENDPOINT: "", TELNYX_FRICTION_ENDPOINT: "" },
  });
  let stdout = ""; let stderr = "";
  child.stdout.on("data", c => stdout += c); child.stderr.on("data", c => stderr += c);
  const status = await new Promise(resolve => child.on("close", resolve));
  assert.ok(stdout.trim(), stderr);
  return { status, data: JSON.parse(stdout), stderr };
}
function commands(): string[] { return readFileSync(join(dir, "args"), "utf8").trim().split("\n").filter(Boolean).map(l => JSON.parse(l).slice(0, 2).join(" ")); }
const resume = ["--assistant-id", "assistant-1", "--phone-number-id", "number-1", "--texml-app-id", "app-1"];

describe("setup-ai recovery", () => {
  it("reports ready only after assigning the number to the returned app", async () => {
    const result = await run();
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.data.ready, true);
    assert.equal(result.data.texml_app_id, "app-1");
    const createArgs = readFileSync(join(dir, "args"), "utf8").trim().split("\n").map(line => JSON.parse(line)).find(args => args[0] === "ai:assistants" && args[1] === "create");
    assert.deepEqual(createArgs, ["ai:assistants", "create", "--name", createArgs[3], "--instructions", "You are a helpful assistant.", "--format", "json"]);
    assert.deepEqual(requests.find(r => r.method === "POST")?.body, {
      friendly_name: requests.find(r => r.method === "POST")?.body.friendly_name,
      active: true,
      voice_url: "https://api.telnyx.com/v2/ai/assistants/assistant-1/texml",
      voice_method: "GET",
    });
    assert.deepEqual(requests.find(r => r.method === "PATCH"), { method: "PATCH", path: "/v2/phone_numbers/number-1", body: { connection_id: "app-1" } });
  });
  it("stops before buying a number when assistant creation returns no ID", async () => {
    const result = await run([], "missing-assistant");
    assert.equal(result.status, 1);
    assert.equal(result.data.ready, false);
    assert.ok(!commands().includes("number-orders create"));
  });
  it("does not report success or assign a number when app creation returns no ID", async () => {
    appMode = "missing";
    const result = await run();
    assert.equal(result.status, 1);
    assert.equal(result.data.ready, false);
    assert.equal(result.data.phone_number_id, "number-1");
    assert.ok(!requests.some(r => r.method === "PATCH"));
  });
  it("preserves all known IDs on assignment failure and resumes without duplicate purchases", async () => {
    assignmentFails = true;
    const failed = await run();
    assert.equal(failed.status, 1);
    assert.equal(failed.data.assistant_id, "assistant-1");
    assert.equal(failed.data.phone_number_id, "number-1");
    assert.equal(failed.data.texml_app_id, "app-1");
    assert.equal(failed.data.number_order_id, "order-1");
    assignmentFails = false;
    requests = []; writeFileSync(join(dir, "args"), "");
    for (let i = 0; i < 2; i++) assert.equal((await run(resume)).data.ready, true);
    assert.ok(!commands().some(c => c.endsWith(" create")));
    assert.ok(!requests.some(r => r.method === "POST"));
  });
  it("refuses an app linked to another assistant before making changes", async () => {
    appMode = "mismatch";
    assert.equal((await run(resume)).status, 1);
    assert.ok(requests.every(r => r.method === "GET"));
  });
  it("reuses the assistant-created default app without creating a duplicate", async () => {
    const result = await run([], "default-app");
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.data.texml_app_id, "app-1");
    assert.ok(!requests.some(r => r.method === "POST"));
  });
  it("reuses the default app during partial resumption", async () => {
    const result = await run(resume.slice(0, 4), "default-app");
    assert.equal(result.status, 0, result.stderr);
    assert.ok(!commands().some(c => c.endsWith(" create")));
    assert.ok(!requests.some(r => r.method === "POST"));
  });
  it("rejects inactive, legacy, wrong-method, and wrong-ID apps before mutation", async () => {
    for (const mode of ["inactive", "legacy", "wrong-method", "wrong-id"]) {
      requests = []; appMode = mode;
      const result = await run(resume);
      assert.equal(result.status, 1, mode);
      assert.equal(result.data.texml_app_id, "app-1");
      assert.ok(requests.every(r => r.method === "GET"));
    }
  });
  it("validates a new assistant's default app before buying a number", async () => {
    appMode = "legacy";
    const result = await run([], "default-app");
    assert.equal(result.status, 1);
    assert.equal(result.data.assistant_id, "assistant-1");
    assert.equal(result.data.texml_app_id, "app-1");
    assert.ok(!commands().includes("number-orders create"));
  });
  it("does not report ready when a successful response does not confirm assignment", async () => {
    assignmentConfirmed = false;
    const result = await run();
    assert.equal(result.status, 1);
    assert.equal(result.data.ready, false);
    assert.equal(result.data.texml_app_id, "app-1");
  });
  it("creates only the missing app when resuming with an assistant and number", async () => {
    const result = await run(resume.slice(0, 4));
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.data.assistant_name, "Existing assistant");
    assert.ok(!commands().some(c => c.endsWith(" create")));
    assert.equal(requests.filter(r => r.method === "POST").length, 1);
  });
  it("accepts an E.164 number already assigned to the supplied app", async () => {
    const result = await run(["--assistant-id", "assistant-1", "--phone-number-id", "+13125550001", "--texml-app-id", "app-1"], "assigned-here");
    assert.equal(result.status, 0, result.stderr);
    assert.ok(!commands().some(c => c.endsWith(" create")));
    assert.ok(!requests.some(r => r.method === "POST"));
  });
  it("rejects a retrieved number that does not match the supplied ID", async () => {
    const result = await run(["--phone-number-id", "wrong-number"]);
    assert.equal(result.status, 1);
    assert.ok(!commands().some(c => c.endsWith(" create")));
    assert.deepEqual(requests, []);
  });
  it("refuses to replace another connection on an existing number", async () => {
    assert.equal((await run(resume, "assigned-elsewhere")).status, 1);
    assert.ok(requests.every(r => r.method === "GET"));
  });
  it("rejects conflicting country and assistant update options", async () => {
    assert.equal((await run([...resume, "--country", "GB"])).status, 1);
    assert.equal((await run([...resume, "--instructions", "new instructions"])).status, 1);
    assert.ok(requests.every(r => r.method === "GET"));
  });
  it("rejects valueless resume flags before provisioning", async () => {
    assert.equal((await run(["--assistant-id"])).status, 1);
    assert.deepEqual(commands(), []);
  });
  it("preserves the accepted order and number when resource-ID lookup fails", async () => {
    const result = await run([], "unresolved-number");
    assert.equal(result.status, 1);
    assert.equal(result.data.phone_number, "+13125550001");
    assert.equal(result.data.number_order_id, "order-1");
    assert.match(result.data.recovery, /Reconcile/);
  });
});
