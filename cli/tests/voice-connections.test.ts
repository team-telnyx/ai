/**
 * Mock-binary coverage for direct voice-connection discovery actions.
 */
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

function setupFakeTelnyx(): { logPath: string; env: NodeJS.ProcessEnv } {
  const tempDir = mkdtempSync(join(tmpdir(), "telnyx-agent-voice-connections-"));
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
function flag(name) { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : undefined; }

if (args[0] === "connections" && args[1] === "list") {
  console.log(JSON.stringify({
    data: [
      { id: "conn-1", connection_name: "Primary Voice", record_type: "call_control_application", active: true },
      { id: "conn-2", connection_name: "Backup SIP", record_type: "credential_connection", active: false }
    ],
    meta: { page_number: 2, page_size: 25, total_results: 2 }
  }));
} else if (args[0] === "connections" && args[1] === "retrieve") {
  console.log(JSON.stringify({ data: {
    id: flag("--id"),
    connection_name: "Primary Voice",
    record_type: "call_control_application",
    active: true,
    outbound_voice_profile_id: "ovp-1"
  } }));
} else if (args[0] === "connections" && args[1] === "list-active-calls") {
  console.log(JSON.stringify({
    data: [{
      call_control_id: "call-1",
      call_leg_id: "leg-1",
      call_session_id: "session-1",
      call_duration: 42,
      client_state: "c3RhdGU=",
      record_type: "call"
    }],
    meta: { page_number: 1, page_size: 20, total_results: 1 }
  }));
} else {
  console.error("unexpected fake telnyx invocation: " + args.join(" "));
  process.exit(2);
}
`,
  );
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

function runAgent(args: string[], env: NodeJS.ProcessEnv = process.env): string {
  return execFileSync(process.execPath, ["--import", "tsx", cliBin, ...args], {
    cwd: cliRoot,
    encoding: "utf8",
    env,
    timeout: 30_000,
  });
}

function runFailure(args: string[], env: NodeJS.ProcessEnv): { stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, ["--import", "tsx", cliBin, ...args], {
    cwd: cliRoot,
    encoding: "utf8",
    env,
    timeout: 30_000,
  });
  assert.notEqual(result.status, 0, `expected command to fail: ${args.join(" ")}`);
  assert.equal(result.error, undefined);
  return { stdout: result.stdout, stderr: result.stderr };
}

function loggedArgs(logPath: string): string[][] {
  if (!existsSync(logPath)) return [];
  const contents = readFileSync(logPath, "utf8");
  assert.ok(contents.endsWith("\n"), "fake binary should terminate its JSON record with one newline");
  assert.ok(!contents.endsWith("\n\n"), "fake binary should not write a blank JSONL record");
  return contents.trimEnd().split("\n").map((line) => JSON.parse(line) as string[]);
}

function assertFlag(args: string[], flag: string, value: string): void {
  const index = args.indexOf(flag);
  assert.notEqual(index, -1, `expected ${flag} in ${args.join(" ")}`);
  assert.equal(args[index + 1], value);
}

describe("Voice connection discovery commands", () => {
  it("lists voice connections with the generated filters, pagination, and sort flags", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent([
      "list-voice-connections",
      "--connection-name", "Voice",
      "--fqdn", "sip.example.com",
      "--outbound-voice-profile-id", "ovp-1",
      "--page-number", "2",
      "--page-size", "25",
      "--sort", "-connection_name",
      "--max-items", "1",
      "--json",
    ], fake.env);

    assert.deepEqual(JSON.parse(output), {
      count: 1,
      connections: [{
        id: "conn-1",
        connection_name: "Primary Voice",
        record_type: "call_control_application",
        active: true,
      }],
      meta: { page_number: 2, page_size: 25, total_results: 2 },
    });

    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args.slice(0, 2), ["connections", "list"]);
    assertFlag(args, "--filter.connection-name", JSON.stringify({ contains: "Voice" }));
    assertFlag(args, "--filter.fqdn", "sip.example.com");
    assertFlag(args, "--filter.outbound-voice-profile-id", "ovp-1");
    assertFlag(args, "--page-number", "2");
    assertFlag(args, "--page-size", "25");
    assertFlag(args, "--sort", "-connection_name");
    assertFlag(args, "--max-items", "1");
    assertFlag(args, "--format", "raw");
  });

  it("retrieves a voice connection under stable JSON keys", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent(["get-voice-connection", "--id", "conn-1", "--json"], fake.env);

    assert.deepEqual(JSON.parse(output), {
      connection_id: "conn-1",
      connection: {
        id: "conn-1",
        connection_name: "Primary Voice",
        record_type: "call_control_application",
        active: true,
        outbound_voice_profile_id: "ovp-1",
      },
    });

    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args.slice(0, 2), ["connections", "retrieve"]);
    assertFlag(args, "--id", "conn-1");
    assertFlag(args, "--format", "json");
  });

  it("lists active calls for a connection with pagination", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent([
      "list-active-calls",
      "--connection-id", "conn-1",
      "--page-number", "1",
      "--page-size", "20",
      "--max-items", "10",
      "--json",
    ], fake.env);

    const result = JSON.parse(output);
    assert.equal(result.connection_id, "conn-1");
    assert.equal(result.count, 1);
    assert.equal(result.active_calls[0].call_control_id, "call-1");
    assert.equal(result.meta.total_results, 1);

    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args.slice(0, 2), ["connections", "list-active-calls"]);
    assertFlag(args, "--connection-id", "conn-1");
    assertFlag(args, "--page-number", "1");
    assertFlag(args, "--page-size", "20");
    assertFlag(args, "--max-items", "10");
    assertFlag(args, "--format", "raw");
  });

  it("prints useful human-readable connection and active-call summaries", () => {
    const fake = setupFakeTelnyx();
    const connections = runAgent(["list-voice-connections"], fake.env);
    const retrieved = runAgent(["get-voice-connection", "--id", "conn-1"], fake.env);
    const calls = runAgent(["list-active-calls", "--connection-id", "conn-1"], fake.env);

    assert.match(connections, /Primary Voice/);
    assert.match(connections, /call_control_application/);
    assert.match(retrieved, /Voice connection retrieved!/);
    assert.match(retrieved, /Connection ID\s+conn-1/);
    assert.match(calls, /Active calls retrieved!/);
    assert.match(calls, /call-1.*leg-1.*42s/);
  });

  it("validates required IDs before invoking telnyx", () => {
    for (const args of [
      ["get-voice-connection", "--json"],
      ["list-active-calls", "--json"],
    ]) {
      const fake = setupFakeTelnyx();
      const failure = runFailure(args, fake.env);
      assert.match(failure.stdout, /"error"/);
      assert.deepEqual(loggedArgs(fake.logPath), []);
    }
  });

  it("validates pagination and max-items before invoking telnyx", () => {
    for (const args of [
      ["list-voice-connections", "--page-size", "0", "--json"],
      ["list-active-calls", "--connection-id", "conn-1", "--page-number", "nope", "--json"],
      ["list-voice-connections", "--max-items", "-2", "--json"],
    ]) {
      const fake = setupFakeTelnyx();
      runFailure(args, fake.env);
      assert.deepEqual(loggedArgs(fake.logPath), []);
    }
  });

  it("advertises all discovery commands in help and capabilities", () => {
    const help = runAgent(["help"]);
    const capabilities = JSON.parse(runAgent(["capabilities", "--json"]));
    const commands = ["list-voice-connections", "get-voice-connection", "list-active-calls"];

    for (const command of commands) {
      assert.match(help, new RegExp(command));
      assert.ok(
        capabilities.composite_commands.some((entry: { name: string }) => entry.name === `telnyx-agent ${command}`),
        `capabilities should advertise ${command}`,
      );
    }

    const voiceActions = capabilities.api_capabilities["📞 Voice"][0].actions;
    for (const action of ["list_voice_connections", "get_voice_connection", "list_active_calls"]) {
      assert.ok(voiceActions.includes(action), `Voice capabilities should include ${action}`);
    }
  });
});
