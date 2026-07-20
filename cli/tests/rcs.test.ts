/**
 * Mock-backed tests for the scoped RCS agent commands.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliRoot = join(__dirname, "..");
const cliBin = join(cliRoot, "bin", "telnyx-agent.ts");

function setupFakeTelnyx(): { logPath: string; env: NodeJS.ProcessEnv } {
  const tempDir = mkdtempSync(join(tmpdir(), "telnyx-agent-rcs-"));
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

function flag(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
}

if (args[0] === "messages:rcs" && args[1] === "send") {
  console.log(JSON.stringify({ data: {
    id: "rcs-msg-123",
    type: "RCS",
    messaging_profile_id: flag("--messaging-profile-id"),
    from: { agent_id: flag("--agent-id"), agent_name: "Example Agent" },
    to: [{ phone_number: flag("--to"), status: "queued" }]
  } }));
} else if (args[0] === "messaging:rcs" && args[1] === "retrieve-capabilities") {
  console.log(process.env.TELNYX_FAKE_RCS_CAPABILITIES || JSON.stringify({ data: {
    agent_id: flag("--agent-id"),
    agent_name: "Example Agent",
    phone_number: flag("--phone-number"),
    record_type: "rcs.capabilities",
    features: ["RICHCARD_STANDALONE", "ACTION_OPEN_URL"],
    status: "Success"
  } }));
} else {
  console.log(JSON.stringify({ data: {} }));
}
`,
  );
  chmodSync(fakeTelnyx, 0o755);

  return {
    logPath,
    env: {
      ...process.env,
      PATH: `${binDir}:${process.env.PATH}`,
      TELNYX_CLI_PATH: fakeTelnyx,
      TELNYX_FAKE_ARGS_LOG: logPath,
    },
  };
}

function runAgent(args: string[], env: NodeJS.ProcessEnv): string {
  return execFileSync(process.execPath, ["--import", "tsx", cliBin, ...args], {
    cwd: cliRoot,
    encoding: "utf8",
    env,
    timeout: 30000,
  });
}

function loggedArgs(logPath: string): string[][] {
  const raw = readFileSync(logPath, "utf8");
  assert.ok(raw.endsWith("\n"), "fake binary log should end with one newline");
  assert.ok(!raw.endsWith("\n\n"), "fake binary should not write a blank line");
  return raw.trimEnd().split("\n").map((line) => JSON.parse(line));
}

function expectFailure(args: string[], env: NodeJS.ProcessEnv, expected: RegExp): void {
  const result = spawnSync(process.execPath, ["--import", "tsx", cliBin, ...args], {
    cwd: cliRoot,
    encoding: "utf8",
    env,
    timeout: 30000,
  });
  assert.notEqual(result.status, 0, "command should fail");
  assert.match(`${result.stderr}${result.stdout}`, expected);
}

describe("RCS action commands", () => {
  it("rcs-send maps text to the generated messages:rcs send flags and returns stable JSON", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent([
      "rcs-send",
      "--agent-id", "agent-123",
      "--messaging-profile-id", "profile-123",
      "--to", "+131****0001",
      "--text", "Hello RCS",
      "--json",
    ], fake.env);

    assert.deepEqual(JSON.parse(output), {
      message_id: "rcs-msg-123",
      status: "queued",
      type: "RCS",
      agent_id: "agent-123",
      messaging_profile_id: "profile-123",
      to: "+131****0001",
    });
    assert.deepEqual(loggedArgs(fake.logPath), [[
      "messages:rcs", "send",
      "--agent-id", "agent-123",
      "--agent-message.content-message", "{\"text\":\"Hello RCS\"}",
      "--messaging-profile-id", "profile-123",
      "--to", "+131****0001",
      "--type", "RCS",
      "--format", "json",
    ]]);
  });

  it("rcs-send maps optional TTL and webhook flags to their exact generated names", () => {
    const fake = setupFakeTelnyx();
    runAgent([
      "rcs-send",
      "--agent-id", "agent-123",
      "--messaging-profile-id", "profile-123",
      "--to", "+131****0001",
      "--text", "Hello RCS",
      "--ttl", "300s",
      "--webhook-url", "https://example.com/rcs-events",
      "--json",
    ], fake.env);

    assert.deepEqual(loggedArgs(fake.logPath), [[
      "messages:rcs", "send",
      "--agent-id", "agent-123",
      "--agent-message.content-message", "{\"text\":\"Hello RCS\"}",
      "--messaging-profile-id", "profile-123",
      "--to", "+131****0001",
      "--type", "RCS",
      "--agent-message.ttl", "300s",
      "--webhook-url", "https://example.com/rcs-events",
      "--format", "json",
    ]]);
  });

  it("rcs-capabilities calls the generated recipient endpoint and returns stable JSON", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent([
      "rcs-capabilities",
      "--agent-id", "agent-123",
      "--phone-number", "+131****0001",
      "--json",
    ], fake.env);

    assert.deepEqual(JSON.parse(output), {
      agent_id: "agent-123",
      agent_name: "Example Agent",
      phone_number: "+131****0001",
      features: ["RICHCARD_STANDALONE", "ACTION_OPEN_URL"],
      status: "Success",
      rcs_enabled: true,
    });
    assert.deepEqual(loggedArgs(fake.logPath), [[
      "messaging:rcs", "retrieve-capabilities",
      "--agent-id", "agent-123",
      "--phone-number", "+131****0001",
      "--format", "json",
    ]]);
  });

  it("rcs-capabilities preserves disabled status and null features in JSON", () => {
    const fake = setupFakeTelnyx();
    fake.env.TELNYX_FAKE_RCS_CAPABILITIES = JSON.stringify({ data: {
      features: null,
      status: "RCS is disabled or agent is not provisioned for the carrier",
    } });

    const output = runAgent([
      "rcs-capabilities",
      "--agent-id", "agent-123",
      "--phone-number", "+131****0001",
      "--json",
    ], fake.env);

    assert.deepEqual(JSON.parse(output), {
      agent_id: "agent-123",
      agent_name: "",
      phone_number: "+131****0001",
      features: null,
      status: "RCS is disabled or agent is not provisioned for the carrier",
      rcs_enabled: false,
    });
  });

  it("rcs-capabilities distinguishes an empty supported feature set in human output", () => {
    const fake = setupFakeTelnyx();
    fake.env.TELNYX_FAKE_RCS_CAPABILITIES = JSON.stringify({ data: {
      features: [],
      status: "Success",
    } });

    const output = runAgent([
      "rcs-capabilities",
      "--agent-id", "agent-123",
      "--phone-number", "+131****0001",
    ], fake.env);

    assert.match(output, /Status\s+Success/);
    assert.match(output, /RCS enabled\s+Yes/);
    assert.match(output, /Features\s+None reported/);
  });

  it("rcs-capabilities shows disabled status in human output for non-array features", () => {
    const fake = setupFakeTelnyx();
    fake.env.TELNYX_FAKE_RCS_CAPABILITIES = JSON.stringify({ data: {
      features: "unavailable",
      status: "RCS is disabled or agent is not provisioned for the carrier",
    } });

    const output = runAgent([
      "rcs-capabilities",
      "--agent-id", "agent-123",
      "--phone-number", "+131****0001",
    ], fake.env);

    assert.match(output, /Status\s+RCS is disabled or agent is not provisioned for the carrier/);
    assert.match(output, /RCS enabled\s+No/);
    assert.match(output, /Features\s+Unavailable/);
  });

  it("validates required RCS flags before invoking the Go CLI", () => {
    const fake = setupFakeTelnyx();
    expectFailure([
      "rcs-send",
      "--agent-id", "agent-123",
      "--messaging-profile-id", "profile-123",
      "--to", "+131****0001",
      "--json",
    ], fake.env, /--text is required/);
    expectFailure([
      "rcs-capabilities",
      "--agent-id", "agent-123",
      "--json",
    ], fake.env, /--phone-number is required/);
  });

  it("wires both RCS commands into help and self-described capabilities", () => {
    const help = runAgent(["help"], process.env);
    assert.match(help, /rcs-send/);
    assert.match(help, /rcs-capabilities/);

    const capabilities = JSON.parse(runAgent(["capabilities", "--json"], process.env));
    assert.deepEqual(
      capabilities.api_capabilities["💬 RCS"][0].actions,
      ["send_rcs_message", "check_rcs_capabilities"],
    );
    const commandNames = capabilities.composite_commands.map((command: { name: string }) => command.name);
    assert.ok(commandNames.includes("telnyx-agent rcs-send"));
    assert.ok(commandNames.includes("telnyx-agent rcs-capabilities"));
  });
});
