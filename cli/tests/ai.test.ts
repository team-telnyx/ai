/**
 * Mock-binary tests for direct Telnyx AI inference actions.
 */
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
  const tempDir = mkdtempSync(join(tmpdir(), "telnyx-agent-ai-"));
  const binDir = join(tempDir, "bin");
  const logPath = join(tempDir, "args.jsonl");
  const fakeTelnyx = join(binDir, "telnyx");
  mkdirSync(binDir, { recursive: true });

  writeFileSync(
    fakeTelnyx,
    `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
fs.appendFileSync(process.env.TELNYX_FAKE_ARGS_LOG, JSON.stringify(args) + "\\n");

if (args[0] === "ai:openai:chat" && args[1] === "create-completion") {
  console.log(JSON.stringify({
    id: "chatcmpl-123",
    object: "chat.completion",
    created: 1710000000,
    model: "meta-llama/Meta-Llama-3.1-8B-Instruct",
    choices: [{ index: 0, message: { role: "assistant", content: "Hello from Telnyx" }, finish_reason: "stop" }],
    usage: { prompt_tokens: 8, completion_tokens: 4, total_tokens: 12 }
  }));
} else if (args[0] === "ai:openai:embeddings" && args[1] === "create-embeddings") {
  console.log(JSON.stringify({
    object: "list",
    data: [
      { object: "embedding", index: 0, embedding: [0.1, 0.2, 0.3] },
      { object: "embedding", index: 1, embedding: [0.4, 0.5, 0.6] }
    ],
    model: "thenlper/gte-large",
    usage: { prompt_tokens: 2, total_tokens: 2 }
  }));
} else {
  console.error("unexpected command: " + args.join(" "));
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

function readLoggedArgs(logPath: string): string[][] {
  if (!existsSync(logPath)) return [];
  return readFileSync(logPath, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function runCli(args: string[], env: NodeJS.ProcessEnv = process.env): { stdout: string; stderr: string; status: number } {
  try {
    const stdout = execFileSync(process.execPath, ["--import", "tsx", cliBin, ...args], {
      cwd: cliRoot,
      encoding: "utf8",
      env,
      timeout: 30000,
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

function assertFlagValue(args: string[], flag: string, expected: string): void {
  const index = args.indexOf(flag);
  assert.notEqual(index, -1, `expected ${flag} in ${args.join(" ")}`);
  assert.equal(args[index + 1], expected);
}

describe("AI inference action commands", () => {
  it("ai-chat wraps ai:openai:chat create-completion and preserves its JSON response", () => {
    const fake = setupFakeTelnyx();
    const message = '{"role":"user","content":"Hello"}';
    const responseFormat = '{"type":"json_object"}';
    const guidedJson = '{"type":"object","properties":{"answer":{"type":"string"}}}';
    const tool = '{"type":"function","function":{"name":"lookup","parameters":{"type":"object"}}}';

    const result = runCli([
      "ai-chat",
      "--message", message,
      "--model", "meta-llama/Meta-Llama-3.1-8B-Instruct",
      "--max-tokens", "128",
      "--temperature", "0.2",
      "--top-p", "0.9",
      "--response-format", responseFormat,
      "--guided-json", guidedJson,
      "--tool", tool,
      "--tool-choice", "auto",
      "--json",
    ], fake.env);

    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.equal(output.id, "chatcmpl-123");
    assert.equal(output.choices[0].message.content, "Hello from Telnyx");
    assert.deepEqual(output.usage, { prompt_tokens: 8, completion_tokens: 4, total_tokens: 12 });

    const calls = readLoggedArgs(fake.logPath);
    assert.equal(calls.length, 1, "the fake binary log should contain exactly one JSON line");
    const call = calls[0];
    assert.deepEqual(call.slice(0, 2), ["ai:openai:chat", "create-completion"]);
    assertFlagValue(call, "--message", message);
    assertFlagValue(call, "--model", "meta-llama/Meta-Llama-3.1-8B-Instruct");
    assertFlagValue(call, "--max-tokens", "128");
    assertFlagValue(call, "--temperature", "0.2");
    assertFlagValue(call, "--top-p", "0.9");
    assertFlagValue(call, "--response-format", responseFormat);
    assertFlagValue(call, "--guided-json", guidedJson);
    assertFlagValue(call, "--tool", tool);
    assertFlagValue(call, "--tool-choice", "auto");
    assert.deepEqual(call.slice(-2), ["--format", "json"]);
  });

  it("ai-chat preserves repeated messages and expands a JSON message array", () => {
    const fake = setupFakeTelnyx();
    const system = '{"role":"system","content":"Be concise"}';
    const user = '{"role":"user","content":"Hello"}';
    const assistant = { role: "assistant", content: "Hi" };

    const result = runCli([
      "ai-chat",
      "--message", system,
      "--message", user,
      "--message", JSON.stringify([assistant, { role: "user", content: "Continue" }]),
      "--json",
    ], fake.env);

    assert.equal(result.status, 0, result.stderr);
    const call = readLoggedArgs(fake.logPath)[0];
    const messages = call.flatMap((arg, index) => arg === "--message" ? [call[index + 1]] : []);
    assert.deepEqual(messages, [
      system,
      user,
      JSON.stringify(assistant),
      JSON.stringify({ role: "user", content: "Continue" }),
    ]);
  });

  it("ai-chat rejects streaming locally without invoking the Go CLI", () => {
    const fake = setupFakeTelnyx();
    const result = runCli([
      "ai-chat",
      "--message", '{"role":"user","content":"Hello"}',
      "--stream",
      "--json",
    ], fake.env);

    assert.notEqual(result.status, 0);
    assert.match(JSON.parse(result.stdout).error, /streaming.*not supported/i);
    assert.deepEqual(readLoggedArgs(fake.logPath), []);
  });

  it("ai-chat forwards an explicit false boolean in Go CLI-compatible form", () => {
    const fake = setupFakeTelnyx();
    const result = runCli([
      "ai-chat",
      "--message", '{"role":"user","content":"Hi"}',
      "--enable-thinking", "false",
      "--json",
    ], fake.env);

    assert.equal(result.status, 0, result.stderr);
    const call = readLoggedArgs(fake.logPath)[0];
    assert.ok(call.includes("--enable-thinking=false"));
    assert.ok(!call.includes("false"), "false must not be emitted as an extra positional argument");
  });

  it("ai-embed passes input JSON through and preserves top-level embedding data", () => {
    const fake = setupFakeTelnyx();
    const input = '["one","two"]';
    const result = runCli([
      "ai-embed",
      "--input", input,
      "--model", "thenlper/gte-large",
      "--dimensions", "3",
      "--encoding-format", "float",
      "--user", "agent-test",
      "--json",
    ], fake.env);

    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.equal(output.object, "list");
    assert.equal(output.model, "thenlper/gte-large");
    assert.equal(output.data.length, 2, "embedding data must not be unwrapped or dropped");
    assert.deepEqual(output.data[0].embedding, [0.1, 0.2, 0.3]);

    const calls = readLoggedArgs(fake.logPath);
    assert.equal(calls.length, 1);
    const call = calls[0];
    assert.deepEqual(call.slice(0, 2), ["ai:openai:embeddings", "create-embeddings"]);
    assertFlagValue(call, "--input", input);
    assertFlagValue(call, "--model", "thenlper/gte-large");
    assertFlagValue(call, "--dimensions", "3");
    assertFlagValue(call, "--encoding-format", "float");
    assertFlagValue(call, "--user", "agent-test");
    assert.deepEqual(call.slice(-2), ["--format", "json"]);
  });

  it("validates required inference fields before invoking the Go CLI", () => {
    for (const args of [
      ["ai-chat", "--json"],
      ["ai-embed", "--model", "thenlper/gte-large", "--json"],
      ["ai-embed", "--input", "hello", "--json"],
    ]) {
      const fake = setupFakeTelnyx();
      const result = runCli(args, fake.env);
      assert.notEqual(result.status, 0, `expected ${args.join(" ")} to fail`);
      assert.ok(JSON.parse(result.stdout).error);
      assert.deepEqual(readLoggedArgs(fake.logPath), []);
    }
  });

  it("wires AI inference commands into help and capabilities", () => {
    const help = runCli(["help"]);
    assert.equal(help.status, 0, help.stderr);
    assert.match(help.stdout, /ai-chat/);
    assert.match(help.stdout, /ai-embed/);
    assert.match(help.stdout, /--message <json>/);
    assert.doesNotMatch(help.stdout, /--stream\s+Request a streaming completion/);
    assert.match(help.stdout, /--input <value>/);

    const capabilities = runCli(["capabilities", "--json"]);
    assert.equal(capabilities.status, 0, capabilities.stderr);
    const output = JSON.parse(capabilities.stdout);
    const commandNames = output.composite_commands.map((command: { name: string }) => command.name);
    assert.ok(commandNames.includes("telnyx-agent ai-chat"));
    assert.ok(commandNames.includes("telnyx-agent ai-embed"));
    const aiActions = output.api_capabilities["🤖 AI"].flatMap((capability: { actions: string[] }) => capability.actions);
    assert.ok(aiActions.includes("ai_chat"));
    assert.ok(aiActions.includes("ai_embed"));
  });
});
