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

function setupFakeTelnyx(version = "0.32.0"): { logPath: string; env: NodeJS.ProcessEnv } {
  const tempDir = mkdtempSync(join(tmpdir(), "telnyx-agent-call-queues-"));
  const binDir = join(tempDir, "bin");
  const logPath = join(tempDir, "args.jsonl");
  mkdirSync(binDir, { recursive: true });
  const fakeTelnyx = join(binDir, "telnyx");
  writeFileSync(fakeTelnyx, `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
if (args[0] === "--version") { console.log(${JSON.stringify("telnyx version ")} + ${JSON.stringify(version)}); process.exit(0); }
fs.appendFileSync(process.env.TELNYX_FAKE_ARGS_LOG, JSON.stringify(args) + "\\n");
function flag(name) { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : undefined; }
if (args[0] === "queues" && args[1] === "create") {
  console.log(JSON.stringify({ data: {
    name: flag("--queue-name"), max_size: Number(flag("--max-size") || "300"), current_size: 0
  } }));
} else if (args[0] === "queues" && args[1] === "list") {
  const pageNumber = Number(flag("--page-number") || "1");
  const data = pageNumber === 1
    ? [{ name: "support", max_size: 100, current_size: 2 }]
    : pageNumber === 2
      ? [{ name: "sales", max_size: 50, current_size: 1 }]
      : [];
  console.log(JSON.stringify({ data, meta: { page_number: pageNumber, page_size: 1, total_pages: 2, total_results: 2 } }));
} else if (args[0] === "queues" && args[1] === "retrieve") {
  console.log(JSON.stringify({ data: { name: flag("--queue-name"), max_size: 100, current_size: 2 } }));
} else if (args[0] === "queues:calls" && args[1] === "list") {
  const pageNumber = Number(flag("--page-number") || "1");
  const data = pageNumber === 1
    ? [{ call_control_id: "call-1", call_leg_id: "leg-1", enqueued_at: "2026-08-24T12:00:00Z" }]
    : pageNumber === 2
      ? [{ call_control_id: "call-2", call_leg_id: "leg-2", enqueued_at: "2026-08-24T12:01:00Z" }]
      : [];
  console.log(JSON.stringify({ data, meta: { page_number: pageNumber, page_size: 1, total_pages: 2, total_results: 2 } }));
} else if (args[0] === "queues:calls" && args[1] === "retrieve") {
  console.log(JSON.stringify({ data: {
    call_control_id: flag("--call-control-id"), call_leg_id: "leg-1", enqueued_at: "2026-08-24T12:00:00Z"
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
  it("rejects a pre-v0.32 Go CLI before dispatching every queue action", () => {
    const commands = [
      ["create-call-queue", "--queue-name", "support", "--json"],
      ["list-call-queues", "--json"],
      ["get-call-queue", "--queue-name", "support", "--json"],
      ["list-queued-calls", "--queue-name", "support", "--json"],
      ["get-queued-call", "--queue-name", "support", "--call-control-id", "call-1", "--json"],
      ["remove-queued-call", "--queue-name", "support", "--call-control-id", "call-1", "--confirm", "--json"],
    ];

    for (const args of commands) {
      const fake = setupFakeTelnyx("0.31.0");
      const result = runFailure(args, fake.env);
      assert.match(JSON.parse(result.stdout).error, /Telnyx Go CLI 0\.31\.0, but this command requires >= 0\.32\.0/);
      assert.deepEqual(loggedArgs(fake.logPath), []);
    }
  });

  it("creates a queue with exact generated flags and stable output", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent([
      "create-call-queue", "--queue-name", "support", "--max-size", "100", "--json",
    ], fake.env);
    assert.deepEqual(JSON.parse(output), {
      queue_name: "support",
      call_queue: { name: "support", max_size: 100, current_size: 0 },
    });
    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args.slice(0, 2), ["queues", "create"]);
    assertFlag(args, "--queue-name", "support");
    assertFlag(args, "--max-size", "100");
    assertFlag(args, "--format", "json");
  });

  it("traverses raw queue pages before applying max-items", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent([
      "list-call-queues", "--page-number", "1", "--page-size", "1", "--max-items", "2", "--json",
    ], fake.env);
    assert.deepEqual(JSON.parse(output), {
      count: 2,
      call_queues: [
        { name: "support", max_size: 100, current_size: 2 },
        { name: "sales", max_size: 50, current_size: 1 },
      ],
      meta: { page_size: 1, total_pages: 2, total_results: 2, starting_page: 1, pages_fetched: 2, returned_results: 2 },
    });
    const calls = loggedArgs(fake.logPath);
    assert.equal(calls.length, 2);
    assert.deepEqual(calls.map((args) => args.slice(0, 2)), [["queues", "list"], ["queues", "list"]]);
    assert.deepEqual(calls.map((args) => args[args.indexOf("--page-number") + 1]), ["1", "2"]);
    for (const args of calls) {
      assertFlag(args, "--page-size", "1");
      assert.ok(!args.includes("--max-items"));
      assertFlag(args, "--format", "raw");
    }
  });

  it("preserves the generated CLI page default when one page satisfies max-items", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent([
      "list-call-queues", "--page-size", "1", "--max-items", "1", "--json",
    ], fake.env);

    assert.equal(JSON.parse(output).count, 1);
    const [args] = loggedArgs(fake.logPath);
    assert.ok(!args.includes("--page-number"));
  });

  it("retrieves a queue by its exact generated queue-name flag", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent(["get-call-queue", "--queue-name", "support", "--json"], fake.env);
    assert.deepEqual(JSON.parse(output), {
      queue_name: "support",
      call_queue: { name: "support", max_size: 100, current_size: 2 },
    });
    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args.slice(0, 2), ["queues", "retrieve"]);
    assertFlag(args, "--queue-name", "support");
  });

  it("traverses raw queued-call pages before applying max-items", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent([
      "list-queued-calls", "--queue-name", "support", "--page-number", "1",
      "--page-size", "1", "--max-items", "2", "--json",
    ], fake.env);
    assert.deepEqual(JSON.parse(output), {
      queue_name: "support",
      count: 2,
      queued_calls: [
        { call_control_id: "call-1", call_leg_id: "leg-1", enqueued_at: "2026-08-24T12:00:00Z" },
        { call_control_id: "call-2", call_leg_id: "leg-2", enqueued_at: "2026-08-24T12:01:00Z" },
      ],
      meta: { page_size: 1, total_pages: 2, total_results: 2, starting_page: 1, pages_fetched: 2, returned_results: 2 },
    });
    const calls = loggedArgs(fake.logPath);
    assert.equal(calls.length, 2);
    assert.deepEqual(calls.map((args) => args[args.indexOf("--page-number") + 1]), ["1", "2"]);
    for (const args of calls) {
      assert.deepEqual(args.slice(0, 2), ["queues:calls", "list"]);
      assertFlag(args, "--queue-name", "support");
      assertFlag(args, "--page-size", "1");
      assert.ok(!args.includes("--max-items"));
      assertFlag(args, "--format", "raw");
    }
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
        call_control_id: "call-1", call_leg_id: "leg-1", enqueued_at: "2026-08-24T12:00:00Z",
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
      /Enqueued At\s+2026-08-24T12:00:00Z/,
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
    const actions = capabilities.api_capabilities["📞 Voice"].find(
      (capability: { name: string }) => capability.name === "Call Queues",
    ).actions;
    for (const action of [
      "create_call_queue", "list_call_queues", "get_call_queue",
      "list_queued_calls", "get_queued_call", "remove_queued_call",
    ]) assert.ok(actions.includes(action));
    assert.match(help, /remove-queued-call.*requires --confirm/);
  });
});
