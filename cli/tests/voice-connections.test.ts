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
const scenario = process.env.TELNYX_FAKE_SCENARIO;
const requestedPage = Number(flag("--page-number") || "1");

if (args[0] === "connections" && args[1] === "list") {
  if (scenario === "connection-pages") {
    const pages = {
      1: [
        { id: "conn-1", connection_name: "Connection 1" },
        { id: "conn-2", connection_name: "Connection 2" }
      ],
      2: [
        { id: "conn-3", connection_name: "Connection 3" },
        { id: "conn-4", connection_name: "Connection 4" }
      ],
      3: [{ id: "conn-5", connection_name: "Connection 5" }]
    };
    console.log(JSON.stringify({
      data: pages[requestedPage] || [],
      meta: { page_number: requestedPage, page_size: 2, total_pages: 3, total_results: 5 }
    }));
  } else if (scenario === "short-page-stale-totals") {
    console.log(JSON.stringify({
      data: requestedPage === 1
        ? [{ id: "conn-1", connection_name: "Connection 1" }]
        : [{ id: "conn-unexpected", connection_name: "Should not be fetched" }],
      meta: {
        page_number: requestedPage,
        page_size: 2,
        total_pages: 99,
        total_results: 198,
        marker: requestedPage === 1 ? "accepted" : "probe"
      }
    }));
  } else if (scenario === "first-empty-page") {
    console.log(JSON.stringify({
      data: [],
      meta: {
        page_number: requestedPage,
        page_size: 7,
        total_pages: 5,
        total_results: 14,
        marker: "authoritative-empty"
      }
    }));
  } else if (scenario === "repeated-page") {
    console.log(JSON.stringify({
      data: [
        { id: "conn-1", connection_name: "Connection 1" },
        { id: "conn-2", connection_name: "Connection 2" }
      ],
      meta: { page_number: requestedPage, page_size: 2, marker: requestedPage === 1 ? "accepted" : "probe" }
    }));
  } else if (scenario === "empty-page") {
    console.log(JSON.stringify({
      data: requestedPage === 1 ? [
        { id: "conn-1", connection_name: "Connection 1" },
        { id: "conn-2", connection_name: "Connection 2" }
      ] : [],
      meta: { page_number: requestedPage, page_size: 2, marker: requestedPage === 1 ? "accepted" : "probe" }
    }));
  } else if (scenario === "no-progress") {
    console.log(JSON.stringify({
      data: requestedPage === 1 ? [
        { id: "conn-1", connection_name: "Connection 1" },
        { id: "conn-2", connection_name: "Connection 2" }
      ] : [
        { id: "conn-1", connection_name: "Changed duplicate 1" },
        { id: "conn-2", connection_name: "Changed duplicate 2" }
      ],
      meta: { page_number: requestedPage, page_size: 2, marker: requestedPage === 1 ? "accepted" : "probe" }
    }));
  } else {
    console.log(JSON.stringify({
      data: [
        { id: "conn-1", connection_name: "Primary Voice", record_type: "call_control_application", active: true },
        { id: "conn-2", connection_name: "Backup SIP", record_type: "credential_connection", active: false }
      ],
      meta: { page_number: 2, page_size: 25, total_results: 2 }
    }));
  }
} else if (args[0] === "connections" && args[1] === "retrieve") {
  console.log(JSON.stringify({ data: {
    id: flag("--id"),
    connection_name: "Primary Voice",
    record_type: "call_control_application",
    active: true,
    outbound_voice_profile_id: "ovp-1"
  } }));
} else if (args[0] === "connections" && args[1] === "list-active-calls") {
  if (scenario === "active-call-pages") {
    const pages = {
      1: [
        { call_control_id: "call-1", call_leg_id: "leg-1", record_type: "call" },
        { call_control_id: "call-2", call_leg_id: "leg-2", record_type: "call" }
      ],
      2: [{ call_control_id: "call-3", call_leg_id: "leg-3", record_type: "call" }]
    };
    console.log(JSON.stringify({
      data: pages[requestedPage] || [],
      meta: { page_number: requestedPage, page_size: 2, total_pages: 2, total_results: 3 }
    }));
  } else {
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
  }
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

function countFlag(args: string[], flag: string): number {
  return args.filter((arg) => arg === flag).length;
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
      meta: {
        page_size: 25,
        total_results: 2,
        starting_page: 2,
        pages_fetched: 1,
        returned_results: 1,
      },
    });

    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args.slice(0, 2), ["connections", "list"]);
    assertFlag(args, "--filter.connection-name", JSON.stringify({ contains: "Voice" }));
    assertFlag(args, "--filter.fqdn", "sip.example.com");
    assertFlag(args, "--filter.outbound-voice-profile-id", "ovp-1");
    assertFlag(args, "--page-number", "2");
    assertFlag(args, "--page-size", "25");
    assertFlag(args, "--sort", "-connection_name");
    assert.ok(!args.includes("--max-items"));
    assertFlag(args, "--format", "raw");
  });

  it("aggregates pages before applying a finite max-items limit", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent([
      "list-voice-connections",
      "--page-size", "2",
      "--max-items", "3",
      "--json",
    ], { ...fake.env, TELNYX_FAKE_SCENARIO: "connection-pages" });

    const result = JSON.parse(output);
    assert.equal(result.count, 3);
    assert.deepEqual(result.connections.map((connection: { id: string }) => connection.id), [
      "conn-1",
      "conn-2",
      "conn-3",
    ]);
    assert.deepEqual(result.meta, {
      page_size: 2,
      total_pages: 3,
      total_results: 5,
      starting_page: 1,
      pages_fetched: 2,
      returned_results: 3,
    });

    const calls = loggedArgs(fake.logPath);
    assert.equal(calls.length, 2);
    assert.equal(calls[0].includes("--page-number"), false);
    assertFlag(calls[1], "--page-number", "2");
    for (const args of calls) assert.equal(args.includes("--max-items"), false);
  });

  it("treats omitted max-items like -1 and preserves filters on every page", () => {
    for (const limitArgs of [[], ["--max-items", "-1"]]) {
      const fake = setupFakeTelnyx();
      const output = runAgent([
        "list-voice-connections",
        "--connection-name", "Voice",
        "--fqdn", "sip.example.com",
        "--outbound-voice-profile-id", "ovp-1",
        "--page-size", "2",
        "--sort", "-connection_name",
        ...limitArgs,
        "--json",
      ], { ...fake.env, TELNYX_FAKE_SCENARIO: "connection-pages" });

      const result = JSON.parse(output);
      assert.equal(result.count, 5);
      assert.deepEqual(result.connections.map((connection: { id: string }) => connection.id), [
        "conn-1",
        "conn-2",
        "conn-3",
        "conn-4",
        "conn-5",
      ]);
      assert.deepEqual(result.meta, {
        page_size: 2,
        total_pages: 3,
        total_results: 5,
        starting_page: 1,
        pages_fetched: 3,
        returned_results: 5,
      });

      const calls = loggedArgs(fake.logPath);
      assert.equal(calls.length, 3);
      assert.equal(countFlag(calls[0], "--page-number"), 0);
      assertFlag(calls[1], "--page-number", "2");
      assertFlag(calls[2], "--page-number", "3");
      for (const args of calls) {
        assert.equal(countFlag(args, "--page-number"), args === calls[0] ? 0 : 1);
        assertFlag(args, "--filter.connection-name", JSON.stringify({ contains: "Voice" }));
        assertFlag(args, "--filter.fqdn", "sip.example.com");
        assertFlag(args, "--filter.outbound-voice-profile-id", "ovp-1");
        assertFlag(args, "--sort", "-connection_name");
        assert.equal(args.includes("--max-items"), false);
      }
    }
  });

  it("aggregates from an explicitly selected starting page", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent([
      "list-voice-connections",
      "--page-number", "2",
      "--page-size", "2",
      "--json",
    ], { ...fake.env, TELNYX_FAKE_SCENARIO: "connection-pages" });

    const result = JSON.parse(output);
    assert.deepEqual(result.connections.map((connection: { id: string }) => connection.id), [
      "conn-3",
      "conn-4",
      "conn-5",
    ]);
    assert.deepEqual(result.meta, {
      page_size: 2,
      total_pages: 3,
      total_results: 5,
      starting_page: 2,
      pages_fetched: 2,
      returned_results: 3,
    });

    const calls = loggedArgs(fake.logPath);
    assert.equal(calls.length, 2);
    assertFlag(calls[0], "--page-number", "2");
    assertFlag(calls[1], "--page-number", "3");
    for (const args of calls) assert.equal(countFlag(args, "--page-number"), 1);
  });

  it("returns an empty aggregate for max-items zero without invoking telnyx", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent([
      "list-voice-connections",
      "--max-items", "0",
      "--json",
    ], fake.env);

    assert.deepEqual(JSON.parse(output), {
      count: 0,
      connections: [],
      meta: { starting_page: 1, pages_fetched: 0, returned_results: 0 },
    });
    assert.deepEqual(loggedArgs(fake.logPath), []);
  });

  it("terminates on a short page even when totals claim more pages", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent([
      "list-voice-connections",
      "--page-size", "2",
      "--json",
    ], { ...fake.env, TELNYX_FAKE_SCENARIO: "short-page-stale-totals" });

    const result = JSON.parse(output);
    assert.deepEqual(result.connections.map((connection: { id: string }) => connection.id), ["conn-1"]);
    assert.deepEqual(result.meta, {
      page_size: 2,
      total_pages: 99,
      total_results: 198,
      marker: "accepted",
      starting_page: 1,
      pages_fetched: 1,
      returned_results: 1,
    });
    assert.equal(loggedArgs(fake.logPath).length, 1);
  });

  it("terminates on empty, repeated, and no-progress probes without clobbering metadata", () => {
    for (const scenario of ["repeated-page", "empty-page", "no-progress"]) {
      const fake = setupFakeTelnyx();
      const output = runAgent([
        "list-voice-connections",
        "--page-size", "2",
        "--json",
      ], { ...fake.env, TELNYX_FAKE_SCENARIO: scenario });

      const result = JSON.parse(output);
      assert.equal(result.count, 2, scenario);
      assert.deepEqual(
        result.connections.map((connection: { id: string }) => connection.id),
        ["conn-1", "conn-2"],
        scenario,
      );
      assert.deepEqual(result.meta, {
        page_size: 2,
        marker: "accepted",
        starting_page: 1,
        pages_fetched: 2,
        returned_results: 2,
      }, scenario);
      const calls = loggedArgs(fake.logPath);
      assert.equal(calls.length, 2, scenario);
      assertFlag(calls[1], "--page-number", "2");
      assert.equal(countFlag(calls[1], "--page-number"), 1);
    }
  });

  it("preserves metadata from an empty first page at the selected starting page", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent([
      "list-voice-connections",
      "--page-number", "3",
      "--json",
    ], { ...fake.env, TELNYX_FAKE_SCENARIO: "first-empty-page" });

    assert.deepEqual(JSON.parse(output), {
      count: 0,
      connections: [],
      meta: {
        page_size: 7,
        total_pages: 5,
        total_results: 14,
        marker: "authoritative-empty",
        starting_page: 3,
        pages_fetched: 1,
        returned_results: 0,
      },
    });

    const calls = loggedArgs(fake.logPath);
    assert.equal(calls.length, 1);
    assertFlag(calls[0], "--page-number", "3");
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
    assert.ok(!args.includes("--max-items"));
    assertFlag(args, "--format", "raw");
  });

  it("lists active calls across multiple pages while preserving connection-id", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent([
      "list-active-calls",
      "--connection-id", "conn-1",
      "--page-size", "2",
      "--json",
    ], { ...fake.env, TELNYX_FAKE_SCENARIO: "active-call-pages" });

    const result = JSON.parse(output);
    assert.equal(result.connection_id, "conn-1");
    assert.deepEqual(result.active_calls.map((call: { call_control_id: string }) => call.call_control_id), [
      "call-1",
      "call-2",
      "call-3",
    ]);
    assert.deepEqual(result.meta, {
      page_size: 2,
      total_pages: 2,
      total_results: 3,
      starting_page: 1,
      pages_fetched: 2,
      returned_results: 3,
    });

    const calls = loggedArgs(fake.logPath);
    assert.equal(calls.length, 2);
    for (const args of calls) {
      assertFlag(args, "--connection-id", "conn-1");
      assert.equal(countFlag(args, "--page-number"), args === calls[0] ? 0 : 1);
    }
    assertFlag(calls[1], "--page-number", "2");
  });

  it("returns no active calls for max-items zero without invoking telnyx", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent([
      "list-active-calls",
      "--connection-id", "conn-1",
      "--max-items", "0",
      "--json",
    ], fake.env);

    assert.deepEqual(JSON.parse(output), {
      connection_id: "conn-1",
      count: 0,
      active_calls: [],
      meta: { starting_page: 1, pages_fetched: 0, returned_results: 0 },
    });
    assert.deepEqual(loggedArgs(fake.logPath), []);
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

  it("validates safe pagination and max-items integers before invoking telnyx", () => {
    for (const args of [
      ["list-voice-connections", "--page-size", "0", "--json"],
      ["list-active-calls", "--connection-id", "conn-1", "--page-number", "nope", "--json"],
      ["list-voice-connections", "--max-items", "-2", "--json"],
      ["list-voice-connections", "--page-number", "9007199254740992", "--json"],
      ["list-voice-connections", "--page-size", "9007199254740992", "--json"],
      ["list-voice-connections", "--max-items", "9007199254740992", "--json"],
      ["list-voice-connections", "--max-items", "Infinity", "--json"],
    ]) {
      const fake = setupFakeTelnyx();
      runFailure(args, fake.env);
      assert.deepEqual(loggedArgs(fake.logPath), []);
    }
  });

  it("rejects bare numeric flags before invoking telnyx", () => {
    for (const commandArgs of [
      ["list-voice-connections"],
      ["list-active-calls", "--connection-id", "conn-1"],
    ]) {
      for (const flag of ["--max-items", "--page-number", "--page-size"]) {
        const fake = setupFakeTelnyx();
        runFailure([...commandArgs, flag, "--json"], fake.env);
        assert.deepEqual(loggedArgs(fake.logPath), [], `${commandArgs[0]} ${flag}`);
      }
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
