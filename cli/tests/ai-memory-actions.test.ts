/** Mock-binary coverage for AI memory and v0.33 AI assistant action wrappers. */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliRoot = join(__dirname, "..");
const cliBin = join(cliRoot, "bin", "telnyx-agent.ts");

function setupFakeTelnyx(version = "0.33.0"): { logPath: string; env: NodeJS.ProcessEnv } {
  const tempDir = mkdtempSync(join(tmpdir(), "telnyx-agent-ai-memory-actions-"));
  const binDir = join(tempDir, "bin");
  const logPath = join(tempDir, "args.jsonl");
  const fakeTelnyx = join(binDir, "telnyx");
  mkdirSync(binDir, { recursive: true });
  writeFileSync(fakeTelnyx, `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
if (args[0] === "--version") { console.log(${JSON.stringify(`telnyx version ${version}`)}); process.exit(0); }
fs.appendFileSync(process.env.TELNYX_FAKE_ARGS_LOG, JSON.stringify(args) + "\\n");
function flag(name) { const index = args.indexOf(name); return index < 0 ? undefined : args[index + 1]; }
if (args[0] === "ai:memory:namespaces:profiles" && args[1] === "ingest") {
  console.log(JSON.stringify({ data: { operation_id: "op-ingest", status: "pending", session_id: flag("--session-id") || "session-generated" } }));
} else if (args[0] === "ai:memory:namespaces:profiles" && args[1] === "remember") {
  console.log(JSON.stringify({ data: { operation_id: "op-remember", status: "pending" } }));
} else if (args[0] === "ai:memory:namespaces:profiles" && args[1] === "recall") {
  console.log(JSON.stringify({ data: [{ id: "memory-1", text: "Ada prefers SMS", score: 0.98 }] }));
} else if (args[0] === "ai:memory:namespaces" && args[1] === "retrieve") {
  console.log(JSON.stringify({ data: { operation_id: flag("--operation-id"), status: "completed" } }));
} else if (args[0] === "ai:memory:namespaces:profiles" && args[1] === "retrieve-summary") {
  console.log(JSON.stringify({ data: { profile_id: flag("--profile-id"), summary: "Ada prefers SMS" } }));
} else if (args[0] === "ai:assistants" && args[1] === "clone") {
  console.log(JSON.stringify({ data: { id: "assistant-clone", name: "Cloned Concierge" } }));
} else if (args[0] === "ai:assistants" && args[1] === "restore") {
  console.log(JSON.stringify({ data: { id: flag("--assistant-id"), name: "Restored Concierge" } }));
} else if (args[0] === "ai:assistants" && args[1] === "whatsapp") {
  console.log(JSON.stringify({ data: { conversation_id: "conversation-whatsapp", status: "started" } }));
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

function runAgent(args: string[], env: NodeJS.ProcessEnv): { stdout: string; stderr: string; status: number } {
  try {
    const stdout = execFileSync(process.execPath, ["--import", "tsx", cliBin, ...args], {
      cwd: cliRoot,
      encoding: "utf8",
      env,
      timeout: 30_000,
    });
    return { stdout, stderr: "", status: 0 };
  } catch (err: any) {
    return { stdout: err.stdout?.toString() ?? "", stderr: err.stderr?.toString() ?? "", status: err.status ?? 1 };
  }
}

function loggedArgs(logPath: string): string[][] {
  if (!existsSync(logPath)) return [];
  const contents = readFileSync(logPath, "utf8");
  assert.ok(contents.endsWith("\n"), "fake binary JSONL must use a real newline terminator");
  assert.ok(!contents.includes("\\n"), "fake binary must not write a literal backslash-n");
  return contents.trimEnd().split("\n").map((line) => JSON.parse(line) as string[]);
}

function assertFlag(args: string[], name: string, value: string): void {
  const index = args.indexOf(name);
  assert.notEqual(index, -1, `expected ${name} in ${args.join(" ")}`);
  assert.equal(args[index + 1], value);
}

describe("AI memory action commands", () => {
  it("routes all five exact generated actions and preserves JSON response envelopes", () => {
    const cases: Array<{ command: string; flags: string[]; expected: string[]; output: unknown }> = [
      {
        command: "ai-memory-ingest",
        flags: ["--namespace", "default", "--profile-id", "customer-1", "--body", '{"messages":[{"role":"user","content":"Hello"}]}', "--session-id", "session-1"],
        expected: ["ai:memory:namespaces:profiles", "ingest", "--namespace", "default", "--profile-id", "customer-1", "--body", '{"messages":[{"role":"user","content":"Hello"}]}', "--session-id", "session-1", "--format", "json"],
        output: { data: { operation_id: "op-ingest", status: "pending", session_id: "session-1" } },
      },
      {
        command: "ai-memory-remember",
        flags: ["--namespace", "default", "--profile-id", "customer-1", "--text", "Ada prefers SMS"],
        expected: ["ai:memory:namespaces:profiles", "remember", "--namespace", "default", "--profile-id", "customer-1", "--text", "Ada prefers SMS", "--format", "json"],
        output: { data: { operation_id: "op-remember", status: "pending" } },
      },
      {
        command: "ai-memory-recall",
        flags: ["--namespace", "default", "--profile-id", "customer-1", "--query", "How should I reach Ada?", "--top-k", "3"],
        expected: ["ai:memory:namespaces:profiles", "recall", "--namespace", "default", "--profile-id", "customer-1", "--query", "How should I reach Ada?", "--top-k", "3", "--format", "json"],
        output: { data: [{ id: "memory-1", text: "Ada prefers SMS", score: 0.98 }] },
      },
      {
        command: "ai-memory-operation",
        flags: ["--namespace", "default", "--operation-id", "op-1"],
        expected: ["ai:memory:namespaces", "retrieve", "--namespace", "default", "--operation-id", "op-1", "--format", "json"],
        output: { data: { operation_id: "op-1", status: "completed" } },
      },
      {
        command: "ai-memory-summary",
        flags: ["--namespace", "default", "--profile-id", "customer-1"],
        expected: ["ai:memory:namespaces:profiles", "retrieve-summary", "--namespace", "default", "--profile-id", "customer-1", "--format", "json"],
        output: { data: { profile_id: "customer-1", summary: "Ada prefers SMS" } },
      },
    ];

    for (const testCase of cases) {
      const fake = setupFakeTelnyx();
      const result = runAgent([testCase.command, ...testCase.flags, "--json"], fake.env);
      assert.equal(result.status, 0, result.stderr);
      assert.deepEqual(JSON.parse(result.stdout), testCase.output);
      assert.deepEqual(loggedArgs(fake.logPath), [testCase.expected]);
    }
  });

  it("validates memory inputs locally and requires Go CLI v0.33 before dispatch", () => {
    const invalidCases = [
      ["ai-memory-ingest", "--namespace", "default", "--profile-id", "customer-1", "--body", "[]"],
      ["ai-memory-ingest", "--namespace", "default", "--profile-id", "customer-1", "--body", "{}"],
      ["ai-memory-ingest", "--namespace", "default", "--profile-id", "customer-1", "--body", '{"a":1}', "--session-id", "contains space"],
      ["ai-memory-remember", "--namespace", "default", "--profile-id", "customer-1"],
      ["ai-memory-recall", "--namespace", "default", "--profile-id", "customer-1", "--query", "question", "--top-k", "0"],
      ["ai-memory-operation", "--namespace", "default"],
      ["ai-memory-summary", "--namespace", "default"],
    ];
    for (const args of invalidCases) {
      const fake = setupFakeTelnyx();
      const result = runAgent([...args, "--json"], fake.env);
      assert.notEqual(result.status, 0, args.join(" "));
      assert.ok(JSON.parse(result.stdout).error);
      assert.deepEqual(loggedArgs(fake.logPath), []);
    }

    const old = setupFakeTelnyx("0.32.0");
    const result = runAgent([
      "ai-memory-remember", "--namespace", "default", "--profile-id", "customer-1", "--text", "Ada prefers SMS", "--json",
    ], old.env);
    assert.equal(result.status, 1);
    assert.match(JSON.parse(result.stdout).error, /requires >= 0\.33\.0/);
    assert.deepEqual(loggedArgs(old.logPath), []);
  });
});

describe("AI assistant clone, restore, and WhatsApp action commands", () => {
  it("routes exact generated actions, validates structured input, and provides stable JSON", () => {
    const clone = setupFakeTelnyx();
    const cloned = runAgent(["ai-assistant-clone", "--id", "assistant-1", "--idempotency-key", "clone-1", "--json"], clone.env);
    assert.equal(cloned.status, 0, cloned.stderr);
    assert.deepEqual(JSON.parse(cloned.stdout), { assistant_id: "assistant-clone", ai_assistant: { id: "assistant-clone", name: "Cloned Concierge" } });
    assert.deepEqual(loggedArgs(clone.logPath), [["ai:assistants", "clone", "--assistant-id", "assistant-1", "--idempotency-key", "clone-1", "--format", "json"]]);

    const restore = setupFakeTelnyx();
    const restored = runAgent(["ai-assistant-restore", "--assistant-id", "assistant-1", "--json"], restore.env);
    assert.equal(restored.status, 0, restored.stderr);
    assert.deepEqual(JSON.parse(restored.stdout), { assistant_id: "assistant-1", ai_assistant: { id: "assistant-1", name: "Restored Concierge" } });
    assert.deepEqual(loggedArgs(restore.logPath), [["ai:assistants", "restore", "--assistant-id", "assistant-1", "--format", "json"]]);

    const whatsapp = setupFakeTelnyx();
    const metadata = '{"customer_id":"customer-1"}';
    const started = runAgent([
      "ai-assistant-whatsapp", "--id", "assistant-1", "--content", "Send a login code", "--from", "+131****0100", "--to", "+131****0101",
      "--conversation-metadata", metadata, "--idempotency-key", "whatsapp-1", "--json",
    ], whatsapp.env);
    assert.equal(started.status, 0, started.stderr);
    assert.deepEqual(JSON.parse(started.stdout), { assistant_id: "assistant-1", whatsapp: { conversation_id: "conversation-whatsapp", status: "started" } });
    const [args] = loggedArgs(whatsapp.logPath);
    assert.deepEqual(args.slice(0, 2), ["ai:assistants", "whatsapp"]);
    assertFlag(args, "--assistant-id", "assistant-1");
    assertFlag(args, "--content", "Send a login code");
    assertFlag(args, "--from", "+131****0100");
    assertFlag(args, "--to", "+131****0101");
    assertFlag(args, "--conversation-metadata", metadata);
    assertFlag(args, "--idempotency-key", "whatsapp-1");
  });

  it("validates before dispatch and enforces the v0.33 command-scoped minimum", () => {
    const invalidCases = [
      ["ai-assistant-clone", "--json"],
      ["ai-assistant-clone", "--id", "assistant-1", "--idempotency-key", "--json"],
      ["ai-assistant-restore", "--json"],
      ["ai-assistant-whatsapp", "--id", "assistant-1", "--content", "Hello", "--from", "+131****0100", "--conversation-metadata", "[]", "--json"],
    ];
    for (const args of invalidCases) {
      const fake = setupFakeTelnyx();
      const result = runAgent(args, fake.env);
      assert.notEqual(result.status, 0, args.join(" "));
      assert.ok(JSON.parse(result.stdout).error);
      assert.deepEqual(loggedArgs(fake.logPath), []);
    }

    for (const args of [
      ["ai-assistant-clone", "--id", "assistant-1", "--json"],
      ["ai-assistant-restore", "--id", "assistant-1", "--json"],
      ["ai-assistant-whatsapp", "--id", "assistant-1", "--content", "Hello", "--from", "+131****0100", "--to", "+131****0101", "--json"],
    ]) {
      const fake = setupFakeTelnyx("0.32.0");
      const result = runAgent(args, fake.env);
      assert.equal(result.status, 1);
      assert.match(JSON.parse(result.stdout).error, /requires >= 0\.33\.0/);
      assert.deepEqual(loggedArgs(fake.logPath), []);
    }
  });

  it("advertises every new command in help and capabilities", () => {
    const commands = [
      "ai-memory-ingest", "ai-memory-remember", "ai-memory-recall", "ai-memory-operation", "ai-memory-summary",
      "ai-assistant-clone", "ai-assistant-restore", "ai-assistant-whatsapp",
    ];
    const help = runAgent(["help"], process.env);
    const capabilities = runAgent(["capabilities", "--json"], process.env);
    assert.equal(help.status, 0, help.stderr);
    assert.equal(capabilities.status, 0, capabilities.stderr);
    const parsed = JSON.parse(capabilities.stdout);
    for (const command of commands) {
      assert.match(help.stdout, new RegExp(command));
      assert.ok(parsed.composite_commands.some((entry: { name: string }) => entry.name === `telnyx-agent ${command}`));
    }
    const memory = parsed.api_capabilities["🤖 AI"].find((entry: { name: string }) => entry.name === "AI Memory");
    assert.deepEqual(memory.actions, ["ingest_ai_memory", "remember_ai_memory", "recall_ai_memory", "get_ai_memory_operation", "get_ai_memory_summary"]);
    const assistants = parsed.api_capabilities["🤖 AI"].find((entry: { name: string }) => entry.name === "Assistants");
    for (const action of ["clone_ai_assistant", "restore_ai_assistant", "whatsapp_ai_assistant"]) assert.ok(assistants.actions.includes(action));
  });
});
