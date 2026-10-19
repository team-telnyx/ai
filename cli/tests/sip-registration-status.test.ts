/** Mock-binary coverage for SIP registration-status lookup parity. */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliRoot = join(__dirname, "..");
const cliBin = join(cliRoot, "bin", "telnyx-agent.ts");

function setupFakeTelnyx(version = "0.33.0"): { env: NodeJS.ProcessEnv; logPath: string } {
  const tempDir = mkdtempSync(join(tmpdir(), "telnyx-agent-sip-registration-status-"));
  const binDir = join(tempDir, "bin");
  const logPath = join(tempDir, "args.jsonl");
  const fakeTelnyx = join(binDir, "telnyx");
  mkdirSync(binDir, { recursive: true });
  writeFileSync(fakeTelnyx, `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
if (args[0] === "--version") {
  process.stdout.write("telnyx version ${version}\\n");
  process.exit(0);
}
fs.appendFileSync(process.env.TELNYX_FAKE_ARGS_LOG, JSON.stringify(args) + "\\n");
function flag(name) {
  const index = args.indexOf(name);
  return index < 0 ? undefined : args[index + 1];
}
if (args[0] !== "sip-registration-status" || args[1] !== "list") {
  process.stderr.write("unexpected fake telnyx invocation: " + args.join(" "));
  process.exit(2);
}
const credentialType = flag("--credential-type");
if (credentialType === "uac_external_credential") {
  process.stdout.write(JSON.stringify({ data: {
    connection_id: flag("--connection-id"),
    connection_name: "External PBX",
    credential_type: credentialType,
    credential_username: "pbx-user",
    registered: true,
    sip_registration_status: "registered",
    last_registration_response: "200 OK",
    sip_registration_details: { expires: 1777777777, failures: 0, sip_uri_user_host: "pbx-user@pbx.example.com" }
  } }) + "\\n");
} else {
  process.stdout.write(JSON.stringify({ data: {
    connection_id: "conn-sip-1",
    connection_name: "SIP Credential Connection",
    credential_type: credentialType,
    credential_username: flag("--username"),
    registered: false,
    sip_registration_status: "failed",
    last_registration_response: null,
    sip_registration_details: { expires: 3600, transport: "TLS", ua_ip: "203.0.113.10", ua_port: 5061, last_modified: "2026-10-19T12:00:00Z" }
  } }) + "\\n");
}
`);
  chmodSync(fakeTelnyx, 0o755);
  return {
    logPath,
    env: {
      ...process.env,
      TELNYX_CLI_PATH: fakeTelnyx,
      TELNYX_FAKE_ARGS_LOG: logPath,
    },
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
  } catch (err: any) {
    return { status: err.status ?? 1, stdout: err.stdout?.toString() ?? "", stderr: err.stderr?.toString() ?? "" };
  }
}

function loggedArgs(logPath: string): string[][] {
  if (!existsSync(logPath)) return [];
  const contents = readFileSync(logPath, "utf8");
  assert.ok(contents.endsWith("\n"), "fake binary JSONL must use a real newline terminator");
  assert.ok(!contents.endsWith("\n\n"), "fake binary must not write a blank JSONL record");
  return contents.trimEnd().split("\n").map((line) => JSON.parse(line) as string[]);
}

describe("sip-registration-status", () => {
  it("maps a UAC external credential lookup to the exact v0.33 generated command and returns stable JSON", () => {
    const fake = setupFakeTelnyx();
    const result = runAgent([
      "sip-registration-status",
      "--credential-type", "uac_external_credential",
      "--connection-id", "conn-uac-1",
      "--json",
    ], fake.env);

    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), {
      credential_type: "uac_external_credential",
      connection_id: "conn-uac-1",
      connection_name: "External PBX",
      credential_username: "pbx-user",
      registered: true,
      sip_registration_status: "registered",
      last_registration_response: "200 OK",
      sip_registration_details: {
        expires: 1777777777,
        failures: 0,
        sip_uri_user_host: "pbx-user@pbx.example.com",
      },
    });
    assert.deepEqual(loggedArgs(fake.logPath), [[
      "sip-registration-status", "list",
      "--credential-type", "uac_external_credential",
      "--connection-id", "conn-uac-1",
      "--format", "json",
    ]]);
  });

  it("maps username credential types and produces useful human output", () => {
    const fake = setupFakeTelnyx();
    const result = runAgent([
      "sip-registration-status",
      "--credential-type", "sip_credential_connection",
      "--username", "alice",
    ], fake.env);

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /SIP registration status retrieved!/);
    assert.match(result.stdout, /SIP Username\s+alice/);
    assert.match(result.stdout, /Registered\s+No/);
    assert.match(result.stdout, /Status\s+failed/);
    assert.match(result.stdout, /Transport: TLS/);
    assert.match(result.stdout, /User Agent: 203\.0\.113\.10:5061/);
    assert.deepEqual(loggedArgs(fake.logPath), [[
      "sip-registration-status", "list",
      "--credential-type", "sip_credential_connection",
      "--username", "alice",
      "--format", "json",
    ]]);
  });

  it("validates enums and credential-type-specific lookup keys before dispatch", () => {
    const invalidInputs = [
      ["sip-registration-status", "--json"],
      ["sip-registration-status", "--credential-type", "invalid", "--connection-id", "conn-1", "--json"],
      ["sip-registration-status", "--credential-type", "uac_external_credential", "--json"],
      ["sip-registration-status", "--credential-type", "uac_external_credential", "--connection-id", "conn-1", "--username", "alice", "--json"],
      ["sip-registration-status", "--credential-type", "telephony_credential", "--json"],
      ["sip-registration-status", "--credential-type", "telephony_credential", "--username", "alice", "--connection-id", "conn-1", "--json"],
      ["sip-registration-status", "--credential-type", "sip_credential_connection", "--username", "--json"],
    ];

    for (const args of invalidInputs) {
      const fake = setupFakeTelnyx();
      const result = runAgent(args, fake.env);
      assert.equal(result.status, 1, args.join(" "));
      assert.ok(JSON.parse(result.stdout).error, args.join(" "));
      assert.deepEqual(loggedArgs(fake.logPath), [], args.join(" "));
    }
  });

  it("requires Go CLI v0.33.0 before dispatching the generated action", () => {
    const fake = setupFakeTelnyx("0.32.0");
    const result = runAgent([
      "sip-registration-status",
      "--credential-type", "telephony_credential",
      "--username", "alice",
      "--json",
    ], fake.env);

    assert.equal(result.status, 1);
    assert.match(JSON.parse(result.stdout).error, /Telnyx Go CLI 0\.32\.0, but this command requires >= 0\.33\.0/);
    assert.deepEqual(loggedArgs(fake.logPath), []);
  });

  it("registers help and capability metadata without invoking the Go CLI", () => {
    const fake = setupFakeTelnyx();
    const help = runAgent(["help"], fake.env);
    const capabilities = runAgent(["capabilities", "--json"], fake.env);

    assert.equal(help.status, 0, help.stderr);
    assert.match(help.stdout, /sip-registration-status/);
    assert.match(help.stdout, /--credential-type <type>/);
    assert.match(help.stdout, /uac_external_credential/);
    assert.equal(capabilities.status, 0, capabilities.stderr);
    const voiceCapabilities = JSON.parse(capabilities.stdout).api_capabilities["📞 Voice"] as Array<{ actions: string[] }>;
    assert.ok(voiceCapabilities.some((capability) => capability.actions.includes("get_sip_registration_status")));
    assert.ok(JSON.parse(capabilities.stdout).composite_commands.some(
      (entry: { name: string }) => entry.name === "telnyx-agent sip-registration-status",
    ));
    assert.deepEqual(loggedArgs(fake.logPath), []);
  });
});
