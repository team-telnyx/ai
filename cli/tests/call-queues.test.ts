/** Mock-binary coverage for call queues and queued calls. */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliRoot = join(__dirname, "..");
const cliBin = process.env.TELNYX_AGENT_TEST_ENTRYPOINT ?? join(cliRoot, "bin", "telnyx-agent.mjs");
const runtimeArgs = process.env.TELNYX_AGENT_TEST_ENTRYPOINT ? ["--import", "tsx"] : [];

function setupFakeTelnyx(): { logPath: string; env: NodeJS.ProcessEnv } {
  const tempDir = mkdtempSync(join(tmpdir(), "telnyx-agent-call-queues-"));
  const binDir = join(tempDir, "bin");
  const logPath = join(tempDir, "args.jsonl");
  mkdirSync(binDir, { recursive: true });
  const fakeTelnyx = join(binDir, "telnyx");
  writeFileSync(fakeTelnyx, `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
fs.appendFileSync(process.env.TELNYX_FAKE_ARGS_LOG, JSON.stringify(args) + "\\n");
function flag(name) { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : undefined; }
if (args[0] === "queues" && args[1] === "create") {
  console.log(JSON.stringify({ data: {
    queue_name: flag("--queue-name"), max_size: Number(flag("--max-size") || "300"), current_size: 0
  } }));
} else if (args[0] === "queues" && args[1] === "list") {
  console.log(JSON.stringify({ data: [
    { queue_name: "support", max_size: 100, current_size: 2 },
    { queue_name: "sales", max_size: 50, current_size: 1 }
  ], meta: { page_number: Number(flag("--page-number") || "1"), page_size: Number(flag("--page-size") || "20"), total_results: 2 } }));
} else if (args[0] === "queues" && args[1] === "retrieve") {
  console.log(JSON.stringify({ data: { queue_name: flag("--queue-name"), max_size: 100, current_size: 2 } }));
} else if (args[0] === "queues:calls" && args[1] === "list") {
  console.log(JSON.stringify({ data: [
    { call_control_id: "call-1", call_leg_id: "leg-1", enqueue_time: "2026-08-24T12:00:00Z" },
    { call_control_id: "call-2", call_leg_id: "leg-2", enqueue_time: "2026-08-24T12:01:00Z" }
  ], meta: { page_number: Number(flag("--page-number") || "1"), page_size: Number(flag("--page-size") || "20"), total_results: 2 } }));
} else if (args[0] === "queues:calls" && args[1] === "retrieve") {
  console.log(JSON.stringify({ data: {
    call_control_id: flag("--call-control-id"), call_leg_id: "leg-1", enqueue_time: "2026-08-24T12:00:00Z"
  } }));
} else if (args[0] === "queues:calls" && args[1] === "remove") {
  process.exit(0);
} else {
  console.error("unexpected fake telnyx invocation: " + args.join(" "));
  process.exit(2);
}
`);
  chmodSync(fakeTelnyx, 0o755);
  return {
    logPath,
    env: {
      ...process.env,
      TELNYX_CLI_PATH: fakeTelnyx,
      TELNYX_FAKE_ARGS_LOG: logPath,
      TELNYX_FRICTION_ENABLED: "false",
      TELNYX_TELEMETRY_ENDPOINT: "",
    },
  };
}

function runAgent(args: string[], env: NodeJS.ProcessEnv = process.env): string {
  return execFileSync(process.execPath, [...runtimeArgs, cliBin, ...args], {
    cwd: cliRoot, encoding: "utf8", env, timeout: 30_000,
  });
}

function runFailure(args: string[], env: NodeJS.ProcessEnv): { stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [...runtimeArgs, cliBin, ...args], {
    cwd: cliRoot, encoding: "utf8", env, timeout: 30_000,
  });
  assert.notEqual(result.status, 0, `expected command to fail: ${args.join(" ")}`);
  return { stdout: result.stdout, stderr: result.stderr };
}

function loggedArgs(logPath: string): string[][] {
  if (!existsSync(logPath)) return [];
  const contents = readFileSync(logPath, "utf8");
  assert.ok(contents.endsWith("\n"), "fake binary should terminate every JSON record with an actual newline");
  assert.ok(!contents.includes("\\n"), "fake binary must not log a literal backslash-n");
  return contents.trimEnd().split("\n").map((line) => JSON.parse(line) as string[]);
}

function assertFlag(args: string[], flag: string, value: string): void {
  const index = args.indexOf(flag);
  assert.notEqual(index, -1, `expected ${flag} in ${args.join(" ")}`);
  assert.equal(args[index + 1], value);
}

describe("Call queue commands", () => {
  it("creates a queue with exact generated flags and stable output", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent([
      "create-call-queue", "--queue-name", "support", "--max-size", "100", "--json",
    ], fake.env);
    assert.deepEqual(JSON.parse(output), {
      queue_name: "support",
      call_queue: { queue_name: "support", max_size: 100, current_size: 0 },
    });
    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args.slice(0, 2), ["queues", "create"]);
    assertFlag(args, "--queue-name", "support");
    assertFlag(args, "--max-size", "100");
    assertFlag(args, "--format", "json");
  });

  it("lists queues with exact pagination flags, raw output, and a local max-items limit", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent([
      "list-call-queues", "--page-number", "2", "--page-size", "25", "--max-items", "1", "--json",
    ], fake.env);
    assert.deepEqual(JSON.parse(output), {
      count: 1,
      call_queues: [{ queue_name: "support", max_size: 100, current_size: 2 }],
      meta: { page_number: 2, page_size: 25, total_results: 2 },
    });
    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args.slice(0, 2), ["queues", "list"]);
    assertFlag(args, "--page-number", "2");
    assertFlag(args, "--page-size", "25");
    assert.ok(!args.includes("--max-items"));
    assertFlag(args, "--format", "raw");
  });

  it("retrieves a queue by its exact generated queue-name flag", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent(["get-call-queue", "--queue-name", "support", "--json"], fake.env);
    assert.deepEqual(JSON.parse(output), {
      queue_name: "support",
      call_queue: { queue_name: "support", max_size: 100, current_size: 2 },
    });
    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args.slice(0, 2), ["queues", "retrieve"]);
    assertFlag(args, "--queue-name", "support");
  });

  it("lists queued calls with exact upstream flags and stable context", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent([
      "list-queued-calls", "--queue-name", "support", "--page-number", "3",
      "--page-size", "10", "--max-items", "1", "--json",
    ], fake.env);
    assert.deepEqual(JSON.parse(output), {
      queue_name: "support",
      count: 1,
      queued_calls: [{
        call_control_id: "call-1", call_leg_id: "leg-1", enqueue_time: "2026-08-24T12:00:00Z",
      }],
      meta: { page_number: 3, page_size: 10, total_results: 2 },
    });
    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args.slice(0, 2), ["queues:calls", "list"]);
    assertFlag(args, "--queue-name", "support");
    assertFlag(args, "--page-number", "3");
    assertFlag(args, "--page-size", "10");
    assert.ok(!args.includes("--max-items"));
    assertFlag(args, "--format", "raw");
  });

  it("retrieves a queued call with both exact path flags", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent([
      "get-queued-call", "--queue-name", "support", "--call-control-id", "call-1", "--json",
    ], fake.env);
    assert.deepEqual(JSON.parse(output), {
      queue_name: "support",
      call_control_id: "call-1",
      queued_call: {
        call_control_id: "call-1", call_leg_id: "leg-1", enqueue_time: "2026-08-24T12:00:00Z",
      },
    });
    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args.slice(0, 2), ["queues:calls", "retrieve"]);
    assertFlag(args, "--queue-name", "support");
    assertFlag(args, "--call-control-id", "call-1");
  });

  it("requires explicit confirmation before removal and never forwards confirm", () => {
    const fake = setupFakeTelnyx();
    const failure = runFailure([
      "remove-queued-call", "--queue-name", "support", "--call-control-id", "call-1", "--json",
    ], fake.env);
    assert.match(failure.stdout, /--confirm is required/);
    assert.deepEqual(loggedArgs(fake.logPath), []);

    const output = runAgent([
      "remove-queued-call", "--queue-name", "support", "--call-control-id", "call-1", "--confirm", "--json",
    ], fake.env);
    assert.deepEqual(JSON.parse(output), {
      queue_name: "support", call_control_id: "call-1", removed: true,
    });
    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args.slice(0, 2), ["queues:calls", "remove"]);
    assert.ok(!args.includes("--confirm"));
  });

  it("rejects valued confirmation and malformed or missing flags before dispatch", () => {
    const cases: Array<{ args: string[]; expected: RegExp }> = [
      { args: ["create-call-queue", "--json"], expected: /--queue-name is required/ },
      { args: ["create-call-queue", "--queue-name", "support", "--max-size", "0", "--json"], expected: /positive safe integer/ },
      { args: ["list-call-queues", "--page-number", "0", "--json"], expected: /positive safe integer/ },
      { args: ["list-call-queues", "--max-items", "-2", "--json"], expected: /non-negative safe integer/ },
      { args: ["list-queued-calls", "--json"], expected: /--queue-name is required/ },
      { args: ["get-queued-call", "--queue-name", "support", "--json"], expected: /--call-control-id is required/ },
      { args: ["remove-queued-call", "--queue-name", "support", "--call-control-id", "call-1", "--confirm", "true", "--json"], expected: /--confirm is required/ },
    ];
    for (const testCase of cases) {
      const fake = setupFakeTelnyx();
      const failure = runFailure(testCase.args, fake.env);
      assert.match(`${failure.stdout}${failure.stderr}`, testCase.expected);
      assert.deepEqual(loggedArgs(fake.logPath), []);
    }
  });

  it("prints useful human summaries", () => {
    const listFake = setupFakeTelnyx();
    assert.match(runAgent(["list-call-queues"], listFake.env), /support.*2 \/ 100 calls/);
    const callFake = setupFakeTelnyx();
    assert.match(
      runAgent(["get-queued-call", "--queue-name", "support", "--call-control-id", "call-1"], callFake.env),
      /Call Control ID\s+call-1/,
    );
  });

  it("advertises every command in help and capabilities", () => {
    const help = runAgent(["help"]);
    const capabilities = JSON.parse(runAgent(["capabilities", "--json"]));
    const commands = [
      "create-call-queue", "list-call-queues", "get-call-queue",
      "list-queued-calls", "get-queued-call", "remove-queued-call",
    ];
    for (const command of commands) {
      assert.match(help, new RegExp(command));
      assert.ok(capabilities.composite_commands.some(
        (entry: { name: string }) => entry.name === `telnyx-agent ${command}`,
      ));
    }
    const actions = capabilities.api_capabilities["📞 Voice"][1].actions;
    for (const action of [
      "create_call_queue", "list_call_queues", "get_call_queue",
      "list_queued_calls", "get_queued_call", "remove_queued_call",
    ]) assert.ok(actions.includes(action));
    assert.match(help, /remove-queued-call.*requires --confirm/);
  });
});
