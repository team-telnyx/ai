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
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, chmodSync, existsSync } from "node:fs";
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

// AIF-336 idempotency fixtures. When set, the mock returns an existing
// agent-created Call Control App and an assigned number so setup-voice can
// detect and reuse them. Default empty => fresh-setup path (existing tests).
let existingVoiceApps: Array<Record<string, unknown>> = [];
let assignedVoiceNumbers: Array<Record<string, unknown>> = [];

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

        // GET /call_control_applications/:id (single-app detail lookup used by
        // the reuse/adopt branches to read webhook + outbound profile)
        const ccaDetail = req.url?.match(/^\/v2\/call_control_applications\/([^/?]+)$/);
        if (req.method === "GET" && ccaDetail) {
          const found = existingVoiceApps.find((a) => String(a.id) === ccaDetail[1]) ?? { id: ccaDetail[1] };
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ data: found }));
          return;
        }

        // AIF-336: GET /call_control_applications (idempotency reuse lookup, list)
        if (req.method === "GET" && req.url?.startsWith("/v2/call_control_applications")) {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ data: existingVoiceApps }));
          return;
        }

        // AIF-336: GET /phone_numbers?filter[connection_id]=... (assigned number)
        if (req.method === "GET" && req.url?.startsWith("/v2/phone_numbers?")) {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ data: assignedVoiceNumbers }));
          return;
        }

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

        // PATCH /call_control_applications/:id (adopt-with-flags: apply the
        // requested webhook / outbound profile to an adopted bare app)
        if (req.method === "PATCH" && req.url?.startsWith("/v2/call_control_applications/")) {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            data: { id: req.url.split("/").pop(), ...(parsedBody ?? {}) },
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

  // ------------------------------------------------------------------
  // AIF-336: idempotency — reuse existing agent resources, --force to renew
  // ------------------------------------------------------------------

  it("reuses an existing agent Call Control App + number instead of buying again (AIF-336)", async () => {
    capturedRequests = [];
    existingVoiceApps = [
      { id: "cca_existing", application_name: "Agent Voice App - 2026-07-24 10:00:00" },
    ];
    assignedVoiceNumbers = [{ id: "num_existing", phone_number: "+13125559999" }];
    try {
      const fake = setupFakeTelnyx();
      const r = await runAsync(["setup-voice", "--json"], fake.env);
      assert.equal(r.status, 0, `expected exit 0, got ${r.status}: ${r.stderr}`);
      const data = JSON.parse(r.stdout);
      assert.equal(data.reused, true, "should report reused=true");
      assert.equal(data.connection_id, "cca_existing");
      assert.equal(data.phone_number, "+13125559999");
      assert.equal(data.ready, true);

      // Must NOT create a new app and must NOT buy a number.
      assert.equal(postRequests(/\/v2\/call_control_applications/).length, 0, "must not POST a new app when reusing");
      const cliLog = existsSync(fake.logPath) ? readFileSync(fake.logPath, "utf8") : "";
      assert.ok(!cliLog.includes("number-orders"), "must not order a number when reusing");
    } finally {
      existingVoiceApps = [];
      assignedVoiceNumbers = [];
    }
  });

  it("does NOT reuse a US number when --country GB is explicit (country is material)", async () => {
    // An existing agent app+number is US, but the user explicitly asks for a GB
    // number. Reusing the US number would silently hand back the wrong country
    // while reporting ready. setup-voice must skip reuse and provision fresh.
    capturedRequests = [];
    existingVoiceApps = [
      { id: "cca_existing", application_name: "Agent Voice App - 2026-07-24 10:00:00" },
    ];
    // Use the REAL live GET /phone_numbers field (`country_iso_alpha2`) — not a
    // synthetic `country_code` — so this regression covers the actual API shape.
    assignedVoiceNumbers = [{ id: "num_existing", phone_number: "+13125559999", country_iso_alpha2: "US", connection_id: "cca_existing" }];
    try {
      const fake = setupFakeTelnyx();
      const r = await runAsync(["setup-voice", "--country", "GB", "--json"], fake.env);
      assert.equal(r.status, 0, `expected exit 0, got ${r.status}: ${r.stderr}`);
      const data = JSON.parse(r.stdout);
      // Core contract: the US number must NOT be handed back for a GB request,
      // and a fresh number MUST be ordered (in the requested country).
      assert.notEqual(data.phone_number, "+13125559999", "must not hand back the US number for a GB request");
      const cliLog = existsSync(fake.logPath) ? readFileSync(fake.logPath, "utf8") : "";
      assert.ok(cliLog.includes("number-order"), "should order a new number in the requested country");
      // And the GB search must have been issued for GB, not US.
      assert.ok(/available-phone-numbers[\s\S]*GB/.test(cliLog) || cliLog.includes("GB"), "should search in the requested country (GB)");
      // Codex round-5 fix #2: the live US app (which already has a number) must
      // NOT be adopted. A fresh app must be created so the GB number is not
      // stacked onto — and the existing app's config not mutated by — the US app.
      assert.notEqual(data.connection_id, "cca_existing", "must NOT adopt the live US app for a GB request");
      assert.ok(postRequests(/\/v2\/call_control_applications$/).length > 0, "must create a fresh app instead of adopting the live US app");
    } finally {
      existingVoiceApps = [];
      assignedVoiceNumbers = [];
    }
  });

  it("still reuses when --country matches the existing number's country", async () => {
    // Sanity: an explicit --country US with an existing US number should still
    // reuse (country guard must not over-block matching-country reuse).
    capturedRequests = [];
    existingVoiceApps = [
      { id: "cca_existing", application_name: "Agent Voice App - 2026-07-24 10:00:00" },
    ];
    assignedVoiceNumbers = [{ id: "num_existing", phone_number: "+13125559999", country_iso_alpha2: "US", connection_id: "cca_existing" }];
    try {
      const fake = setupFakeTelnyx();
      const r = await runAsync(["setup-voice", "--country", "US", "--json"], fake.env);
      assert.equal(r.status, 0, `expected exit 0, got ${r.status}: ${r.stderr}`);
      const data = JSON.parse(r.stdout);
      assert.equal(data.reused, true, "should reuse the matching-country number");
      assert.equal(data.phone_number, "+13125559999");
    } finally {
      existingVoiceApps = [];
      assignedVoiceNumbers = [];
    }
  });

  it("adopts an existing BARE app (no number) and buys+assigns a number instead of creating a new app", async () => {
    // Earlier failed run left an app with no number. setup-voice should adopt it
    // rather than spawn yet another app.
    capturedRequests = [];
    existingVoiceApps = [
      { id: "cca_bare", application_name: "Agent Voice App - 2026-07-27 09:00:00" },
    ];
    assignedVoiceNumbers = []; // no number assigned => not a full reusable pair
    try {
      const fake = setupFakeTelnyx();
      const r = await runAsync(["setup-voice", "--json"], fake.env);
      assert.equal(r.status, 0, `expected exit 0, got ${r.status}: ${r.stderr}`);
      const data = JSON.parse(r.stdout);
      assert.equal(data.connection_id, "cca_bare", "should adopt the existing bare app");
      assert.equal(data.reused, true, "adopting a bare app counts as reuse");
      // Must NOT create a new app...
      assert.equal(postRequests(/\/v2\/call_control_applications$/).length, 0, "must not POST a new app when adopting");
      // ...but MUST buy + assign a number to the adopted app.
      const cliLog = existsSync(fake.logPath) ? readFileSync(fake.logPath, "utf8") : "";
      assert.ok(cliLog.includes("number-order"), "should buy a number for the adopted app");
      assert.ok(patchRequests().some((p) => p.path.includes("/phone_numbers/")), "should assign the number to the adopted app");
    } finally {
      existingVoiceApps = [];
      assignedVoiceNumbers = [];
    }
  });

  it("PATCHes a resolved DEFAULT outbound profile onto an adopted bare app (no explicit flag)", async () => {
    // Codex round-6: adopting a bare app that has NO outbound profile, with no
    // --outbound-voice-profile-id passed, used to resolve a default profile and
    // report it as ready WITHOUT patching it onto the app — so the app had no
    // profile and outbound calls would fail. The adopted app must be PATCHed
    // with the resolved default.
    capturedRequests = [];
    existingVoiceApps = [
      // Bare app: no `outbound` block at all => no outbound profile configured.
      { id: "cca_bare", application_name: "Agent Voice App - 2026-07-27 09:00:00" },
    ];
    assignedVoiceNumbers = []; // bare app => not a full reusable pair
    try {
      const fake = setupFakeTelnyx();
      const r = await runAsync(["setup-voice", "--json"], fake.env);
      assert.equal(r.status, 0, `expected exit 0, got ${r.status}: ${r.stderr}`);
      const data = JSON.parse(r.stdout);
      assert.equal(data.connection_id, "cca_bare", "should adopt the bare app");
      // The resolved default profile must actually be PATCHed onto the app.
      const profilePatch = patchRequests().find(
        (p) => p.path.includes("/call_control_applications/") &&
          !!((p.body as Record<string, unknown>)?.outbound as Record<string, unknown> | undefined)?.outbound_voice_profile_id,
      );
      assert.ok(profilePatch, "must PATCH the resolved default outbound profile onto the adopted app");
      const patchedProfile = ((profilePatch!.body as Record<string, unknown>).outbound as Record<string, unknown>).outbound_voice_profile_id;
      assert.equal(patchedProfile, data.outbound_voice_profile_id, "patched profile must match the reported one");
      assert.ok(String(patchedProfile).length > 0, "a real profile id must be applied");
    } finally {
      existingVoiceApps = [];
      assignedVoiceNumbers = [];
    }
  });

  it("applies requested --webhook to an ADOPTED bare app (no stale webhook)", async () => {
    // Bug: adopting a bare app while the user passed --webhook-url used to keep
    // the app's stale/default webhook while reporting the requested one, so call
    // events went to the wrong URL. The adopted app must be PATCHed.
    capturedRequests = [];
    existingVoiceApps = [
      { id: "cca_bare", application_name: "Agent Voice App - 2026-07-27 09:00:00", webhook_event_url: "https://old.example.com/stale" },
    ];
    assignedVoiceNumbers = []; // bare app => not a full reusable pair
    try {
      const fake = setupFakeTelnyx();
      const r = await runAsync(["setup-voice", "--webhook", "https://mine.example.com/hook", "--json"], fake.env);
      assert.equal(r.status, 0, `expected exit 0, got ${r.status}: ${r.stderr}`);
      const data = JSON.parse(r.stdout);
      assert.equal(data.connection_id, "cca_bare", "should adopt the bare app");
      // The adopted app must be PATCHed with the requested webhook.
      const ccaPatch = patchRequests().find((p) => p.path.includes("/call_control_applications/"));
      assert.ok(ccaPatch, "must PATCH the adopted app to apply requested settings");
      assert.equal((ccaPatch!.body as Record<string, unknown>)?.webhook_event_url, "https://mine.example.com/hook", "must apply the requested webhook to the adopted app");
    } finally {
      existingVoiceApps = [];
      assignedVoiceNumbers = [];
    }
  });

  it("flags --outbound-voice-profile-id as not applied when reusing a complete app+number", async () => {
    // Reuse of a complete pair must not silently ignore a requested outbound
    // profile: report outbound_profile_not_applied and keep the real profile.
    capturedRequests = [];
    existingVoiceApps = [
      { id: "cca_existing", application_name: "Agent Voice App - 2026-07-24 10:00:00", outbound: { outbound_voice_profile_id: "ovp_real" } },
    ];
    assignedVoiceNumbers = [{ id: "num_existing", phone_number: "+13125559999" }];
    try {
      const fake = setupFakeTelnyx();
      const r = await runAsync(["setup-voice", "--outbound-voice-profile-id", "ovp_requested", "--json"], fake.env);
      assert.equal(r.status, 0, `expected exit 0, got ${r.status}: ${r.stderr}`);
      const data = JSON.parse(r.stdout);
      assert.equal(data.reused, true);
      assert.equal(data.outbound_profile_not_applied, true, "should flag the requested outbound profile was not applied");
      assert.notEqual(data.outbound_voice_profile_id, "ovp_requested", "must not echo an unapplied outbound profile as if set");
    } finally {
      existingVoiceApps = [];
      assignedVoiceNumbers = [];
    }
  });

  it("does NOT claim a --webhook was applied when reusing an existing app (honesty)", async () => {
    // Newcomer passes --webhook but an existing agent app is reused: the reused
    // app keeps its own webhook, so we must not echo the requested one as if set.
    capturedRequests = [];
    existingVoiceApps = [
      { id: "cca_existing", application_name: "Agent Voice App - 2026-07-24 10:00:00" },
    ];
    assignedVoiceNumbers = [{ id: "num_existing", phone_number: "+13125559999" }];
    try {
      const fake = setupFakeTelnyx();
      const r = await runAsync(["setup-voice", "--webhook", "https://mine.example.com/hook", "--json"], fake.env);
      assert.equal(r.status, 0, `expected exit 0, got ${r.status}: ${r.stderr}`);
      const data = JSON.parse(r.stdout);
      assert.equal(data.reused, true);
      assert.equal(data.webhook_not_applied, true, "should flag that the requested webhook was not applied");
      assert.notEqual(data.webhook_url, "https://mine.example.com/hook", "must not echo an unapplied webhook as if it were set");
    } finally {
      existingVoiceApps = [];
      assignedVoiceNumbers = [];
    }
  });

  it("--force provisions a fresh app + number even when an agent app already exists (AIF-336)", async () => {
    capturedRequests = [];
    existingVoiceApps = [
      { id: "cca_existing", application_name: "Agent Voice App - 2026-07-24 10:00:00" },
    ];
    assignedVoiceNumbers = [{ id: "num_existing", phone_number: "+13125559999" }];
    try {
      const fake = setupFakeTelnyx();
      const r = await runAsync(["setup-voice", "--force", "--json"], fake.env);
      assert.equal(r.status, 0, `expected exit 0, got ${r.status}: ${r.stderr}`);
      const data = JSON.parse(r.stdout);
      assert.equal(data.reused, false, "--force must not reuse");
      // A brand-new app must be created.
      assert.equal(postRequests(/\/v2\/call_control_applications/).length, 1, "--force must POST a new app");
    } finally {
      existingVoiceApps = [];
      assignedVoiceNumbers = [];
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
