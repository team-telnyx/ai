/** Mock-binary coverage for WhatsApp Hosted Signup actions added in Go CLI v0.34. */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliRoot = join(__dirname, "..");
const cliBin = join(cliRoot, "bin", "telnyx-agent.ts");

function setupFakeTelnyx(version = "0.34.0"): { env: NodeJS.ProcessEnv; logPath: string } {
  const tempDir = mkdtempSync(join(tmpdir(), "telnyx-agent-hosted-signup-"));
  const binDir = join(tempDir, "bin");
  const logPath = join(tempDir, "args.jsonl");
  const fakeTelnyx = join(binDir, "telnyx");
  mkdirSync(binDir, { recursive: true });
  writeFileSync(fakeTelnyx, `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
if (args[0] === "--version") { console.log("telnyx version ${version}"); process.exit(0); }
fs.appendFileSync(process.env.TELNYX_FAKE_ARGS_LOG, JSON.stringify(args) + "\\n");
const fmtIdx = args.indexOf("--format");
const cmd = fmtIdx >= 0 ? args.filter((_, i) => i !== fmtIdx && i !== fmtIdx + 1) : args;
if (cmd[0] === "whatsapp:hosted-signups" && cmd[1] === "create") {
  console.log(JSON.stringify({ data: { id: "hs_123", app_id: cmd[cmd.indexOf("--app-id") + 1], signup_type: cmd[cmd.indexOf("--signup-type") + 1], onboarding_url: "https://signup.example/hs_123" } }));
} else if (cmd[0] === "whatsapp:hosted-signups" && cmd[1] === "retrieve") {
  console.log(JSON.stringify({ data: { id: cmd[cmd.indexOf("--id") + 1], signup_type: "standard", onboarding_url: "https://signup.example/hs_123" } }));
} else if (cmd[0] === "whatsapp:hosted-signups" && cmd[1] === "list") {
  console.log(JSON.stringify({ data: [{ id: "hs_123", signup_type: "standard" }, { id: "hs_456", signup_type: "coexistence" }], meta: { total_results: 2 } }));
} else {
  console.log(JSON.stringify({ data: {} }));
}
`);
  chmodSync(fakeTelnyx, 0o755);
  return {
    env: { ...process.env, TELNYX_CLI_PATH: fakeTelnyx, TELNYX_FAKE_ARGS_LOG: logPath },
    logPath,
  };
}

function runAgent(args: string[], env: NodeJS.ProcessEnv): { status: number; stdout: string; stderr: string } {
  try {
    const stdout = execFileSync(process.execPath, ["--import", "tsx", cliBin, ...args], {
      cwd: cliRoot,
      encoding: "utf8",
      env,
      timeout: 30_000,
    });
    return { status: 0, stdout, stderr: "" };
  } catch (error: any) {
    return { status: error.status ?? 1, stdout: error.stdout?.toString() ?? "", stderr: error.stderr?.toString() ?? "" };
  }
}

function loggedArgs(logPath: string): string[][] {
  if (!existsSync(logPath)) return [];
  const content = readFileSync(logPath, "utf8");
  assert.ok(content.endsWith("\n"), "fake binary JSONL must use a real newline terminator");
  return content.trimEnd().split("\n").map((line) => JSON.parse(line) as string[]);
}

describe("WhatsApp hosted signups", () => {
  it("creates, retrieves, and lists hosted signups with the exact v0.34 generated actions", () => {
    const fake = setupFakeTelnyx();
    const create = runAgent([
      "create-whatsapp-hosted-signup", "--app-id", "meta-app-123", "--signup-type", "coexistence",
      "--expires-at", "2026-10-27T12:00:00Z", "--json",
    ], fake.env);
    assert.equal(create.status, 0, create.stderr);
    assert.deepEqual(JSON.parse(create.stdout), {
      hosted_signup: {
        id: "hs_123",
        app_id: "meta-app-123",
        signup_type: "coexistence",
        onboarding_url: "https://signup.example/hs_123",
      },
    });

    const get = runAgent(["get-whatsapp-hosted-signup", "--id", "hs_123", "--json"], fake.env);
    assert.equal(get.status, 0, get.stderr);
    assert.equal(JSON.parse(get.stdout).hosted_signup.id, "hs_123");

    const list = runAgent([
      "list-whatsapp-hosted-signups", "--page-number", "2", "--page-size", "10", "--max-items", "1", "--json",
    ], fake.env);
    assert.equal(list.status, 0, list.stderr);
    assert.deepEqual(JSON.parse(list.stdout), {
      count: 1,
      hosted_signups: [{ id: "hs_123", signup_type: "standard" }],
      meta: { total_results: 2 },
    });

    assert.deepEqual(loggedArgs(fake.logPath), [
      ["whatsapp:hosted-signups", "create", "--app-id", "meta-app-123", "--signup-type", "coexistence", "--expires-at", "2026-10-27T12:00:00Z", "--format", "json"],
      ["whatsapp:hosted-signups", "retrieve", "--id", "hs_123", "--format", "json"],
      ["whatsapp:hosted-signups", "list", "--page-number", "2", "--page-size", "10", "--max-items", "1", "--format", "raw"],
    ]);
  });

  it("uses the generated standard default and blocks v0.33 before dispatch", () => {
    const compatible = setupFakeTelnyx();
    const create = runAgent(["create-whatsapp-hosted-signup", "--app-id", "meta-app-123", "--json"], compatible.env);
    assert.equal(create.status, 0, create.stderr);
    assert.deepEqual(loggedArgs(compatible.logPath), [[
      "whatsapp:hosted-signups", "create", "--app-id", "meta-app-123", "--signup-type", "standard", "--format", "json",
    ]]);

    const outdated = setupFakeTelnyx("0.33.0");
    const rejected = runAgent(["get-whatsapp-hosted-signup", "--id", "hs_123", "--json"], outdated.env);
    assert.equal(rejected.status, 1);
    assert.match(rejected.stdout, /requires >= 0\.34\.0/);
    assert.deepEqual(loggedArgs(outdated.logPath), []);
  });

  it("forwards a BSUID and idempotency key only after the v0.34 compatibility check", () => {
    const compatible = setupFakeTelnyx();
    const sent = runAgent([
      "whatsapp-send", "--from", "+15551234567", "--to", "US.13491208655302741918",
      "--text", "Hello", "--idempotency-key", "wa-send-123", "--json",
    ], compatible.env);
    assert.equal(sent.status, 0, sent.stderr);
    assert.deepEqual(loggedArgs(compatible.logPath), [
      ["messages", "--help"],
      [
        "messages", "whatsapp", "--from", "+15551234567", "--to", "US.13491208655302741918",
        "--whatsapp-message", '{"type":"text","text":{"body":"Hello"}}', "--type", "WHATSAPP",
        "--idempotency-key", "wa-send-123", "--format", "json",
      ],
    ]);

    const outdated = setupFakeTelnyx("0.33.0");
    const rejected = runAgent([
      "whatsapp-send", "--from", "+15551234567", "--to", "US.13491208655302741918", "--text", "Hello", "--json",
    ], outdated.env);
    assert.equal(rejected.status, 1);
    assert.match(rejected.stdout, /requires >= 0\.34\.0/);
    assert.deepEqual(loggedArgs(outdated.logPath), [["messages", "--help"]]);
  });

  it("validates required and pagination inputs before dispatch", () => {
    for (const args of [
      ["create-whatsapp-hosted-signup", "--json"],
      ["get-whatsapp-hosted-signup", "--json"],
      ["list-whatsapp-hosted-signups", "--page-size", "0", "--json"],
      ["list-whatsapp-hosted-signups", "--max-items", "-2", "--json"],
    ]) {
      const fake = setupFakeTelnyx();
      const result = runAgent(args, fake.env);
      assert.equal(result.status, 1);
      assert.deepEqual(loggedArgs(fake.logPath), []);
    }
  });

  it("advertises hosted signup actions and v0.34 WhatsApp recipient support", () => {
    const fake = setupFakeTelnyx();
    const help = runAgent(["help"], fake.env);
    assert.equal(help.status, 0, help.stderr);
    assert.match(help.stdout, /create-whatsapp-hosted-signup/);
    assert.match(help.stdout, /list-whatsapp-hosted-signups/);
    assert.match(help.stdout, /WhatsApp BSUID/);

    const capabilities = runAgent(["capabilities", "--json"], fake.env);
    assert.equal(capabilities.status, 0, capabilities.stderr);
    const whatsapp = JSON.parse(capabilities.stdout).api_capabilities["💬 WhatsApp"][0].actions as string[];
    assert.ok(whatsapp.includes("create_whatsapp_hosted_signup"));
    assert.ok(whatsapp.includes("get_whatsapp_hosted_signup"));
    assert.ok(whatsapp.includes("list_whatsapp_hosted_signups"));
    assert.deepEqual(loggedArgs(fake.logPath), []);
  });
});
