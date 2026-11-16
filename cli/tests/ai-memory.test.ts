/** Mock-binary coverage for scoped persistent AI memory wrappers. */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliRoot = join(__dirname, "..");
const cliBin = join(cliRoot, "bin", "telnyx-agent.ts");

function setupFakeTelnyx(version = "0.37.0"): { logPath: string; env: NodeJS.ProcessEnv } {
  const tempDir = mkdtempSync(join(tmpdir(), "telnyx-agent-ai-memory-"));
  const binDir = join(tempDir, "bin");
  const logPath = join(tempDir, "args.jsonl");
  const fakeTelnyx = join(binDir, "telnyx");
  mkdirSync(binDir, { recursive: true });

  writeFileSync(fakeTelnyx, `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
if (args[0] === "--version") { console.log("telnyx version ${version}"); process.exit(0); }
fs.appendFileSync(process.env.TELNYX_FAKE_ARGS_LOG, JSON.stringify(args) + String.fromCharCode(10));
function flag(name) { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : undefined; }
if (args[0] === "ai:memory:namespaces" && args[1] === "create") {
  console.log(JSON.stringify({ data: { name: flag("--name"), id: "namespace-1" } }));
} else if (args[0] === "ai:memory:namespaces" && args[1] === "list") {
  console.log(JSON.stringify({ data: [{ name: "default" }, { name: "support" }], meta: { total_results: 2 } }));
} else if (args[0] === "ai:memory:namespaces" && args[1] === "retrieve") {
  console.log(JSON.stringify({ data: { id: flag("--operation-id"), status: "completed" } }));
} else if (args[0] === "ai:memory:namespaces:profiles" && args[1] === "ingest") {
  console.log(JSON.stringify({ data: { operation_id: "op-ingest", status: "pending", session_id: flag("--session-id") } }));
} else if (args[0] === "ai:memory:namespaces:profiles" && args[1] === "remember") {
  console.log(JSON.stringify({ data: { operation_id: "op-remember", status: "pending" } }));
} else if (args[0] === "ai:memory:namespaces:profiles" && args[1] === "recall") {
  console.log(JSON.stringify({ data: [{ id: "memory-1", text: "Customer prefers email", score: 0.96 }], meta: { query: flag("--query") } }));
} else if (args[0] === "ai:memory:namespaces:profiles" && args[1] === "retrieve-summary") {
  console.log(JSON.stringify({ data: { summary: "Customer prefers email updates." } }));
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
      TELNYX_API_KEY: "KEY_fake_test",
    },
  };
}

function runAgent(args: string[], env: NodeJS.ProcessEnv = process.env): { stdout: string; stderr: string; status: number } {
  const result = spawnSync(process.execPath, ["--import", "tsx", cliBin, ...args], {
    cwd: cliRoot,
    encoding: "utf8",
    env,
    timeout: 30_000,
  });
  return { stdout: result.stdout ?? "", stderr: result.stderr ?? "", status: result.status ?? 1 };
}

function loggedArgs(logPath: string): string[][] {
  if (!existsSync(logPath)) return [];
  const contents = readFileSync(logPath, "utf8");
  assert.ok(contents.endsWith("\n"), "mock binary must terminate JSONL entries with an actual newline");
  assert.equal(contents.includes("\\n"), false, "mock binary must not write a literal escaped newline");
  return contents.trimEnd().split("\n").map((line) => JSON.parse(line) as string[]);
}

function assertFlag(args: string[], name: string, expected: string): void {
  const index = args.indexOf(name);
  assert.notEqual(index, -1, `expected ${name} in ${args.join(" ")}`);
  assert.equal(args[index + 1], expected);
}

describe("persistent AI memory commands", () => {
  it("creates and lists namespaces with the generated command spellings", () => {
    const createFake = setupFakeTelnyx();
    const created = runAgent(["create-ai-memory-namespace", "--name", "support", "--json"], createFake.env);
    assert.equal(created.status, 0, created.stderr);
    assert.deepEqual(JSON.parse(created.stdout), { namespace: { name: "support", id: "namespace-1" } });
    assert.deepEqual(loggedArgs(createFake.logPath), [[
      "ai:memory:namespaces", "create", "--name", "support", "--format", "json",
    ]]);

    const listFake = setupFakeTelnyx();
    const listed = runAgent(["list-ai-memory-namespaces", "--json"], listFake.env);
    assert.equal(listed.status, 0, listed.stderr);
    assert.deepEqual(JSON.parse(listed.stdout), {
      namespaces: [{ name: "default" }, { name: "support" }],
      meta: { total_results: 2 },
    });
    assert.deepEqual(loggedArgs(listFake.logPath), [["ai:memory:namespaces", "list", "--format", "raw"]]);
  });

  it("forwards every supported profile write/read flag and represents async operations explicitly", () => {
    const ingestFake = setupFakeTelnyx();
    const body = '{"messages":[{"role":"user","content":"Email me updates"}]}';
    const ingested = runAgent([
      "ingest-ai-memory-profile", "--namespace", "support", "--profile-id", "customer-123",
      "--body", body, "--session-id", "session-456", "--json",
    ], ingestFake.env);
    assert.equal(ingested.status, 0, ingested.stderr);
    assert.deepEqual(JSON.parse(ingested.stdout), {
      namespace: "support",
      profile_id: "customer-123",
      operation_id: "op-ingest",
      operation: { operation_id: "op-ingest", status: "pending", session_id: "session-456" },
    });
    const [ingestArgs] = loggedArgs(ingestFake.logPath);
    assert.deepEqual(ingestArgs.slice(0, 2), ["ai:memory:namespaces:profiles", "ingest"]);
    assertFlag(ingestArgs, "--namespace", "support");
    assertFlag(ingestArgs, "--profile-id", "customer-123");
    assertFlag(ingestArgs, "--body", body);
    assertFlag(ingestArgs, "--session-id", "session-456");

    const rememberFake = setupFakeTelnyx();
    const remembered = runAgent([
      "remember-ai-memory-profile", "--namespace", "support", "--profile-id", "customer-123",
      "--text", "Customer prefers email", "--json",
    ], rememberFake.env);
    assert.equal(remembered.status, 0, remembered.stderr);
    assert.equal(JSON.parse(remembered.stdout).operation_id, "op-remember");
    const [rememberArgs] = loggedArgs(rememberFake.logPath);
    assert.deepEqual(rememberArgs.slice(0, 2), ["ai:memory:namespaces:profiles", "remember"]);
    assertFlag(rememberArgs, "--text", "Customer prefers email");

    const recallFake = setupFakeTelnyx();
    const recalled = runAgent([
      "recall-ai-memory-profile", "--namespace", "support", "--profile-id", "customer-123",
      "--query", "contact preference", "--top-k", "5", "--json",
    ], recallFake.env);
    assert.equal(recalled.status, 0, recalled.stderr);
    assert.deepEqual(JSON.parse(recalled.stdout), {
      namespace: "support",
      profile_id: "customer-123",
      memories: [{ id: "memory-1", text: "Customer prefers email", score: 0.96 }],
      meta: { query: "contact preference" },
    });
    const [recallArgs] = loggedArgs(recallFake.logPath);
    assertFlag(recallArgs, "--query", "contact preference");
    assertFlag(recallArgs, "--top-k", "5");

    const summaryFake = setupFakeTelnyx();
    const summary = runAgent([
      "get-ai-memory-profile-summary", "--namespace", "support", "--profile-id", "customer-123", "--json",
    ], summaryFake.env);
    assert.equal(summary.status, 0, summary.stderr);
    assert.deepEqual(JSON.parse(summary.stdout), {
      namespace: "support", profile_id: "customer-123", summary: { summary: "Customer prefers email updates." },
    });
    assert.deepEqual(loggedArgs(summaryFake.logPath)[0].slice(0, 2), ["ai:memory:namespaces:profiles", "retrieve-summary"]);
  });

  it("uses the namespace-level retrieve route as explicit operation-status polling", () => {
    const fake = setupFakeTelnyx();
    const result = runAgent([
      "get-ai-memory-operation-status", "--namespace", "support", "--operation-id", "op-ingest", "--json",
    ], fake.env);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), {
      namespace: "support",
      operation_id: "op-ingest",
      operation: { id: "op-ingest", status: "completed" },
    });
    assert.deepEqual(loggedArgs(fake.logPath), [[
      "ai:memory:namespaces", "retrieve", "--namespace", "support", "--operation-id", "op-ingest", "--format", "json",
    ]]);
  });

  it("requires the generated IDs and payload fields and enforces the v0.36 minimum", () => {
    const invalid = [
      ["create-ai-memory-namespace", "--json"],
      ["get-ai-memory-operation-status", "--namespace", "support", "--json"],
      ["ingest-ai-memory-profile", "--namespace", "support", "--profile-id", "customer-123", "--json"],
      ["remember-ai-memory-profile", "--namespace", "support", "--profile-id", "customer-123", "--json"],
      ["recall-ai-memory-profile", "--namespace", "support", "--profile-id", "customer-123", "--query", "x", "--top-k", "0", "--json"],
      ["get-ai-memory-profile-summary", "--namespace", "support", "--json"],
    ];
    for (const args of invalid) {
      const fake = setupFakeTelnyx();
      const result = runAgent(args, fake.env);
      assert.notEqual(result.status, 0, `expected ${args.join(" ")} to fail`);
      assert.ok(JSON.parse(result.stdout).error);
      assert.deepEqual(loggedArgs(fake.logPath), []);
    }

    const tooOld = setupFakeTelnyx("0.35.0");
    const result = runAgent(["list-ai-memory-namespaces", "--json"], tooOld.env);
    assert.notEqual(result.status, 0);
    assert.match(JSON.parse(result.stdout).error, /requires >= 0\.36\.0/);
    assert.deepEqual(loggedArgs(tooOld.logPath), []);
  });

  it("advertises all scoped commands, flags, and capability actions", () => {
    const commands = [
      "create-ai-memory-namespace", "list-ai-memory-namespaces", "get-ai-memory-operation-status",
      "ingest-ai-memory-profile", "remember-ai-memory-profile", "recall-ai-memory-profile", "get-ai-memory-profile-summary",
    ];
    const help = runAgent(["help"]);
    assert.equal(help.status, 0, help.stderr);
    for (const command of commands) assert.match(help.stdout, new RegExp(command));
    for (const flag of ["name", "namespace", "profile-id", "operation-id", "body", "session-id", "text", "query", "top-k"]) {
      assert.match(help.stdout, new RegExp(`--${flag}`));
    }

    const capabilitiesResult = runAgent(["capabilities", "--json"]);
    assert.equal(capabilitiesResult.status, 0, capabilitiesResult.stderr);
    const capabilities = JSON.parse(capabilitiesResult.stdout);
    const memory = capabilities.api_capabilities["🤖 AI"].find(
      (capability: { name: string }) => capability.name === "AI Memory",
    );
    assert.deepEqual(memory.actions, [
      "create_ai_memory_namespace", "list_ai_memory_namespaces", "get_ai_memory_operation_status",
      "ingest_ai_memory_profile", "remember_ai_memory_profile", "recall_ai_memory_profile", "get_ai_memory_profile_summary",
    ]);
    for (const command of commands) {
      assert.ok(capabilities.composite_commands.some((entry: { name: string }) => entry.name === `telnyx-agent ${command}`));
    }
  });
});
