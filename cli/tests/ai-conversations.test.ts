/** Mock-binary coverage for AI conversation lifecycle actions. */
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

function setupFakeTelnyx(): { logPath: string; env: NodeJS.ProcessEnv } {
  const tempDir = mkdtempSync(join(tmpdir(), "telnyx-agent-ai-conversations-"));
  const binDir = join(tempDir, "bin");
  const logPath = join(tempDir, "args.jsonl");
  const fakeTelnyx = join(binDir, "telnyx");
  mkdirSync(binDir, { recursive: true });

  writeFileSync(
    fakeTelnyx,
    `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
if (args[0] === "--version") { console.log("telnyx version 0.27.0"); process.exit(0); }
fs.appendFileSync(process.env.TELNYX_FAKE_ARGS_LOG, JSON.stringify(args) + "\\n");
function flag(name) { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : undefined; }
function jsonFlag(name) { const value = flag(name); return value === undefined ? undefined : JSON.parse(value); }
if (args[0] !== "ai:conversations") {
  console.error("unexpected fake telnyx invocation: " + args.join(" "));
  process.exit(2);
} else if (args[1] === "create") {
  console.log(JSON.stringify({ data: { id: "conversation-created", name: flag("--name"), metadata: jsonFlag("--metadata") } }));
} else if (args[1] === "retrieve") {
  console.log(JSON.stringify({ data: { id: flag("--conversation-id"), name: "Ada support", metadata: { assistant_id: "assistant-1" } } }));
} else if (args[1] === "list") {
  console.log(JSON.stringify({ data: [
    { id: "conversation-1", name: "Ada support" },
    { id: "conversation-2", name: "Billing" }
  ], meta: { total_results: 2 } }));
} else if (args[1] === "update") {
  console.log(JSON.stringify({ data: { id: flag("--conversation-id"), metadata: jsonFlag("--metadata") } }));
} else if (args[1] === "add-message") {
  console.log(JSON.stringify({ data: {
    id: "message-1", role: flag("--role"), content: flag("--content"), name: flag("--name"),
    metadata: jsonFlag("--metadata"), sent_at: flag("--sent-at"), tool_call_id: flag("--tool-call-id"),
    tool_calls: jsonFlag("--tool-call"), tool_choice: jsonFlag("--tool-choice")
  } }));
} else if (args[1] === "delete") {
  console.log(JSON.stringify({ data: { id: flag("--conversation-id") } }));
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
      TELNYX_API_KEY: "KEY_fake_test",
    },
  };
}

function runAgent(args: string[], env: NodeJS.ProcessEnv = process.env): { stdout: string; stderr: string; status: number } {
  try {
    const stdout = execFileSync(process.execPath, ["--import", "tsx", cliBin, ...args], {
      cwd: cliRoot,
      encoding: "utf8",
      env,
      timeout: 30_000,
    });
    return { stdout, stderr: "", status: 0 };
  } catch (err: any) {
    return {
      stdout: err.stdout?.toString() ?? "",
      stderr: err.stderr?.toString() ?? "",
      status: err.status ?? 1,
    };
  }
}

function loggedArgs(logPath: string): string[][] {
  if (!existsSync(logPath)) return [];
  const contents = readFileSync(logPath, "utf8");
  assert.ok(contents.endsWith("\n"), "fake binary should terminate each JSON record with one newline");
  assert.ok(!contents.endsWith("\n\n"), "fake binary should not write a blank JSONL record");
  return contents.trimEnd().split("\n").map((line) => JSON.parse(line) as string[]);
}

function assertFlag(args: string[], flag: string, value: string): void {
  const index = args.indexOf(flag);
  assert.notEqual(index, -1, `expected ${flag} in ${args.join(" ")}`);
  assert.equal(args[index + 1], value);
}

describe("AI conversation lifecycle action commands", () => {
  it("creates a conversation and preserves a stable JSON envelope", () => {
    const fake = setupFakeTelnyx();
    const metadata = '{"assistant_id":"assistant-1"}';
    const result = runAgent([
      "create-ai-conversation", "--name", "Ada support", "--metadata", metadata,
      "--idempotency-key", "retry-1", "--json",
    ], fake.env);

    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), {
      conversation_id: "conversation-created",
      ai_conversation: { id: "conversation-created", name: "Ada support", metadata: { assistant_id: "assistant-1" } },
    });
    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args.slice(0, 2), ["ai:conversations", "create"]);
    assertFlag(args, "--name", "Ada support");
    assertFlag(args, "--metadata", metadata);
    assertFlag(args, "--idempotency-key", "retry-1");
    assertFlag(args, "--format", "json");
  });

  it("retrieves, lists with raw envelope filters, and updates conversations", () => {
    const getFake = setupFakeTelnyx();
    const got = runAgent(["get-ai-conversation", "--id", "conversation-1", "--json"], getFake.env);
    assert.equal(got.status, 0, got.stderr);
    assert.equal(JSON.parse(got.stdout).conversation_id, "conversation-1");
    const [getArgs] = loggedArgs(getFake.logPath);
    assert.deepEqual(getArgs.slice(0, 2), ["ai:conversations", "retrieve"]);
    assertFlag(getArgs, "--conversation-id", "conversation-1");

    const listFake = setupFakeTelnyx();
    const listed = runAgent([
      "list-ai-conversations", "--name", "like.Ada%", "--created-at", "gte.2025-01-01",
      "--last-message-at", "lte.2025-02-01", "--limit", "10", "--order", "created_at.desc", "--json",
    ], listFake.env);
    assert.equal(listed.status, 0, listed.stderr);
    assert.deepEqual(JSON.parse(listed.stdout), {
      count: 2,
      ai_conversations: [{ id: "conversation-1", name: "Ada support" }, { id: "conversation-2", name: "Billing" }],
      meta: { total_results: 2 },
    });
    const [listArgs] = loggedArgs(listFake.logPath);
    assert.deepEqual(listArgs.slice(0, 2), ["ai:conversations", "list"]);
    assertFlag(listArgs, "--name", "like.Ada%");
    assertFlag(listArgs, "--created-at", "gte.2025-01-01");
    assertFlag(listArgs, "--last-message-at", "lte.2025-02-01");
    assertFlag(listArgs, "--limit", "10");
    assertFlag(listArgs, "--order", "created_at.desc");
    assert.deepEqual(listArgs.slice(-2), ["--format", "raw"]);

    const updateFake = setupFakeTelnyx();
    const metadata = '{"ai_disabled":true}';
    const updated = runAgent(["update-ai-conversation", "--conversation-id", "conversation-1", "--metadata", metadata, "--json"], updateFake.env);
    assert.equal(updated.status, 0, updated.stderr);
    assert.deepEqual(JSON.parse(updated.stdout), {
      conversation_id: "conversation-1",
      ai_conversation: { id: "conversation-1", metadata: { ai_disabled: true } },
    });
    const [updateArgs] = loggedArgs(updateFake.logPath);
    assertFlag(updateArgs, "--conversation-id", "conversation-1");
    assertFlag(updateArgs, "--metadata", metadata);
  });

  it("adds messages with useful generated fields and stable JSON", () => {
    const fake = setupFakeTelnyx();
    const metadata = '{"source":"operator"}';
    const toolCalls = '[{"id":"call-1","type":"function"}]';
    const toolChoice = '{"type":"function","function":{"name":"lookup"}}';
    const result = runAgent([
      "add-ai-conversation-message", "--id", "conversation-1", "--role", "assistant", "--content", "Hello",
      "--name", "Ada", "--metadata", metadata, "--sent-at", "2025-01-01T00:00:00Z",
      "--tool-call-id", "call-0", "--tool-call", toolCalls, "--tool-choice", toolChoice,
      "--idempotency-key", "retry-message", "--json",
    ], fake.env);

    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.equal(output.conversation_id, "conversation-1");
    assert.equal(output.message.id, "message-1");
    assert.deepEqual(output.message.tool_calls, [{ id: "call-1", type: "function" }]);
    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args.slice(0, 2), ["ai:conversations", "add-message"]);
    assertFlag(args, "--conversation-id", "conversation-1");
    assertFlag(args, "--role", "assistant");
    assertFlag(args, "--content", "Hello");
    assertFlag(args, "--metadata", metadata);
    assertFlag(args, "--tool-call", toolCalls);
    assertFlag(args, "--tool-choice", toolChoice);
    assertFlag(args, "--idempotency-key", "retry-message");
  });

  it("requires confirmation before deletion and never forwards it", () => {
    const fake = setupFakeTelnyx();
    const rejected = runAgent(["delete-ai-conversation", "--id", "conversation-1", "--json"], fake.env);
    assert.notEqual(rejected.status, 0);
    assert.match(JSON.parse(rejected.stdout).error, /--confirm is required/);
    assert.deepEqual(loggedArgs(fake.logPath), []);

    const accepted = runAgent(["delete-ai-conversation", "--id", "conversation-1", "--confirm", "--json"], fake.env);
    assert.equal(accepted.status, 0, accepted.stderr);
    assert.deepEqual(JSON.parse(accepted.stdout), { conversation_id: "conversation-1", deleted: true });
    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args.slice(0, 2), ["ai:conversations", "delete"]);
    assertFlag(args, "--conversation-id", "conversation-1");
    assert.ok(!args.includes("--confirm"));
  });

  it("validates IDs, update payloads, JSON fields, and list limits locally", () => {
    const invalidCases = [
      ["get-ai-conversation", "--json"],
      ["update-ai-conversation", "--id", "conversation-1", "--json"],
      ["create-ai-conversation", "--metadata", "[]", "--json"],
      ["add-ai-conversation-message", "--id", "conversation-1", "--json"],
      ["add-ai-conversation-message", "--id", "conversation-1", "--role", "user", "--tool-call", "{}", "--json"],
      ["list-ai-conversations", "--limit", "0", "--json"],
      ["get-ai-conversation", "--id", "one", "--conversation-id", "two", "--json"],
    ];
    for (const args of invalidCases) {
      const fake = setupFakeTelnyx();
      const result = runAgent(args, fake.env);
      assert.notEqual(result.status, 0, `expected ${args.join(" ")} to fail`);
      assert.ok(JSON.parse(result.stdout).error);
      assert.deepEqual(loggedArgs(fake.logPath), []);
    }
  });

  it("advertises every conversation command in help and capabilities", () => {
    const commands = [
      "create-ai-conversation", "get-ai-conversation", "list-ai-conversations", "update-ai-conversation",
      "add-ai-conversation-message", "delete-ai-conversation",
    ];
    const help = runAgent(["help"]);
    assert.equal(help.status, 0, help.stderr);
    const capabilitiesResult = runAgent(["capabilities", "--json"]);
    assert.equal(capabilitiesResult.status, 0, capabilitiesResult.stderr);
    const capabilities = JSON.parse(capabilitiesResult.stdout);
    for (const command of commands) {
      assert.match(help.stdout, new RegExp(command));
      assert.ok(capabilities.composite_commands.some((entry: { name: string }) => entry.name === `telnyx-agent ${command}`));
    }
    assert.match(help.stdout, /--confirm\s+Required safety confirmation \(delete-ai-conversation; never forwarded\)/);
    const conversationActions = capabilities.api_capabilities["🤖 AI"].find(
      (capability: { name: string }) => capability.name === "AI Conversations",
    ).actions;
    assert.deepEqual(conversationActions, [
      "create_ai_conversation", "get_ai_conversation", "list_ai_conversations", "update_ai_conversation",
      "add_ai_conversation_message", "delete_ai_conversation",
    ]);
  });
});
