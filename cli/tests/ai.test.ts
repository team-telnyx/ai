/**
 * Mock-binary tests for direct Telnyx AI inference actions.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliRoot = join(__dirname, "..");
const cliBin = join(cliRoot, "bin", "telnyx-agent.ts");

function setupFakeTelnyx(version = "0.24.0"): { logPath: string; env: NodeJS.ProcessEnv } {
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
if (args[0] === "--version") { console.log("telnyx version ${version}"); process.exit(0); }
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
} else if (args[0] === "ai:anthropic:v1" && args[1] === "messages") {
  console.log(JSON.stringify({
    id: "msg_01ABC",
    type: "message",
    role: "assistant",
    model: "zai-org/GLM-5.2",
    content: [
      { type: "text", text: "Hello from Anthropic format" },
      { type: "tool_use", id: "toolu_01", name: "lookup", input: { query: "Telnyx" } }
    ],
    stop_reason: "tool_use",
    stop_sequence: null,
    usage: { input_tokens: 14, output_tokens: 9 },
    vendor_extension: { trace_id: "trace-123" }
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
  const result = spawnSync(process.execPath, ["--import", "tsx", cliBin, ...args], {
    cwd: cliRoot,
    encoding: "utf8",
    env,
    timeout: 30000,
  });
  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    status: result.status ?? 1,
  };
}

function assertFlagValue(args: string[], flag: string, expected: string): void {
  const index = args.indexOf(flag);
  assert.notEqual(index, -1, `expected ${flag} in ${args.join(" ")}`);
  assert.equal(args[index + 1], expected);
}

function flagValues(args: string[], flag: string): string[] {
  return args.flatMap((arg, index) => arg === flag ? [args[index + 1]] : []);
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
    assert.equal(result.stderr, "", "documented Anthropic flags must not produce unknown-flag warnings");
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

  it("ai-anthropic-message forwards the complete request surface and preserves the full JSON response", () => {
    const fake = setupFakeTelnyx();
    const messages = [
      '{"role":"user","content":"Use the tools"}',
      '{"role":"assistant","content":[{"type":"text","text":"Ready"}]}',
    ];
    const mcpServers = [
      '{"type":"url","url":"https://mcp-one.example.com"}',
      '{"type":"url","url":"https://mcp-two.example.com"}',
    ];
    const tools = [
      '{"name":"lookup","description":"Look up a value","input_schema":{"type":"object"}}',
      '{"name":"calculate","description":"Calculate","input_schema":{"type":"object"}}',
    ];
    const fallbackConfig = '{"models":["backup/model"]}';
    const metadata = '{"user_id":"agent-123"}';
    const system = '[{"type":"text","text":"Be concise"}]';
    const thinking = '{"type":"enabled","budget_tokens":128}';
    const toolChoice = '{"type":"auto"}';

    const result = runCli([
      "ai-anthropic-message",
      "--max-tokens", "512",
      "--message", messages[0],
      "--message", messages[1],
      "--model", "zai-org/GLM-5.2",
      "--api-key-ref", "secret-ref-1",
      "--billing-group-id", "billing-group-1",
      "--fallback-config", fallbackConfig,
      "--max-retries", "3",
      "--mcp-server", mcpServers[0],
      "--mcp-server", mcpServers[1],
      "--metadata", metadata,
      "--service-tier", "priority",
      "--stop-sequence", "END",
      "--stop-sequence", "DONE",
      "--system", system,
      "--temperature", "0.3",
      "--thinking", thinking,
      "--timeout", "45",
      "--tool-choice", toolChoice,
      "--tool", tools[0],
      "--tool", tools[1],
      "--top-k", "40",
      "--top-p", "0.85",
      "--json",
    ], fake.env);

    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.equal(output.id, "msg_01ABC");
    assert.equal(output.type, "message");
    assert.equal(output.content.length, 2, "all Anthropic content blocks must be preserved");
    assert.deepEqual(output.content[1], {
      type: "tool_use",
      id: "toolu_01",
      name: "lookup",
      input: { query: "Telnyx" },
    });
    assert.deepEqual(output.usage, { input_tokens: 14, output_tokens: 9 });
    assert.deepEqual(output.vendor_extension, { trace_id: "trace-123" });

    const calls = readLoggedArgs(fake.logPath);
    assert.equal(calls.length, 1, "the fake binary log should contain exactly one JSON line");
    const call = calls[0];
    assert.deepEqual(call.slice(0, 2), ["ai:anthropic:v1", "messages"]);
    assertFlagValue(call, "--max-tokens", "512");
    assert.deepEqual(flagValues(call, "--message"), messages);
    assertFlagValue(call, "--model", "zai-org/GLM-5.2");
    assertFlagValue(call, "--api-key-ref", "secret-ref-1");
    assertFlagValue(call, "--billing-group-id", "billing-group-1");
    assertFlagValue(call, "--fallback-config", fallbackConfig);
    assertFlagValue(call, "--max-retries", "3");
    assert.deepEqual(flagValues(call, "--mcp-server"), mcpServers);
    assertFlagValue(call, "--metadata", metadata);
    assertFlagValue(call, "--service-tier", "priority");
    assert.deepEqual(flagValues(call, "--stop-sequence"), ["END", "DONE"]);
    assertFlagValue(call, "--system", system);
    assertFlagValue(call, "--temperature", "0.3");
    assertFlagValue(call, "--thinking", thinking);
    assertFlagValue(call, "--timeout", "45");
    assertFlagValue(call, "--tool-choice", toolChoice);
    assert.deepEqual(flagValues(call, "--tool"), tools);
    assertFlagValue(call, "--top-k", "40");
    assertFlagValue(call, "--top-p", "0.85");
    assert.deepEqual(call.slice(-2), ["--format", "json"]);
  });

  it("ai-anthropic-message rejects Telnyx Go CLI 0.21.0 before dispatch", () => {
    const fake = setupFakeTelnyx("0.21.0");
    const result = runCli([
      "ai-anthropic-message", "--max-tokens", "64",
      "--message", '{"role":"user","content":"Hello"}',
      "--model", "zai-org/GLM-5.2", "--json",
    ], fake.env);

    assert.notEqual(result.status, 0);
    const error = JSON.parse(result.stdout).error;
    assert.match(error, /0\.21\.0/);
    assert.match(error, /requires >= 0\.24\.0/);
    assert.match(error, /npm install|go install|TELNYX_CLI_PATH/);
    assert.deepEqual(readLoggedArgs(fake.logPath), []);
  });

  it("ai-anthropic-message accepts a Telnyx Go CLI newer than 0.24.0", () => {
    const fake = setupFakeTelnyx("0.25.0");
    const result = runCli([
      "ai-anthropic-message", "--max-tokens", "64",
      "--message", '{"role":"user","content":"Hello"}',
      "--model", "zai-org/GLM-5.2", "--json",
    ], fake.env);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).id, "msg_01ABC");
    assert.deepEqual(readLoggedArgs(fake.logPath)[0].slice(0, 2), ["ai:anthropic:v1", "messages"]);
  });

  it("ai-anthropic-message bypasses a stale vendor for a compatible PATH CLI", () => {
    const isolatedRoot = mkdtempSync(join(cliRoot, ".ai-vendor-fallback-"));
    const isolatedBin = join(isolatedRoot, "bin", "telnyx-agent.ts");
    const vendor = join(isolatedRoot, "vendor", "telnyx");
    const staleLog = join(isolatedRoot, "stale-dispatch.log");
    const compatible = setupFakeTelnyx("0.24.0");
    cpSync(join(cliRoot, "bin"), join(isolatedRoot, "bin"), { recursive: true });
    cpSync(join(cliRoot, "src"), join(isolatedRoot, "src"), { recursive: true });
    cpSync(join(cliRoot, "package.json"), join(isolatedRoot, "package.json"));
    mkdirSync(dirname(vendor), { recursive: true });
    writeFileSync(vendor, `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
if (args[0] === "--version") { console.log("telnyx version 0.21.0"); process.exit(0); }
fs.appendFileSync(process.env.TELNYX_STALE_LOG, JSON.stringify(args) + "\\n");
process.exit(9);
`);
    chmodSync(vendor, 0o755);

    try {
      const result = spawnSync(process.execPath, ["--import", "tsx", isolatedBin,
        "ai-anthropic-message", "--max-tokens", "64",
        "--message", '{"role":"user","content":"Hello"}',
        "--model", "zai-org/GLM-5.2", "--json",
      ], {
        cwd: isolatedRoot,
        encoding: "utf8",
        env: {
          ...compatible.env,
          TELNYX_CLI_PATH: undefined,
          TELNYX_STALE_LOG: staleLog,
          PATH: `${dirname(compatible.env.TELNYX_CLI_PATH!)}:${process.env.PATH ?? ""}`,
        },
        timeout: 30000,
      });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(JSON.parse(result.stdout).id, "msg_01ABC");
      assert.deepEqual(readLoggedArgs(compatible.logPath)[0].slice(0, 2), ["ai:anthropic:v1", "messages"]);
      assert.equal(existsSync(staleLog), false, "the stale vendor must only be version-probed, never dispatched");
    } finally {
      rmSync(isolatedRoot, { recursive: true, force: true });
    }
  });

  it("ai-anthropic-message prints a useful text and usage summary", () => {
    const fake = setupFakeTelnyx();
    const result = runCli([
      "ai-anthropic-message",
      "--max-tokens", "64",
      "--message", '{"role":"user","content":"Hello"}',
      "--model", "zai-org/GLM-5.2",
    ], fake.env);

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Anthropic message created!/);
    assert.match(result.stdout, /zai-org\/GLM-5\.2/);
    assert.match(result.stdout, /2/);
    assert.match(result.stdout, /tool_use/);
    assert.match(result.stdout, /14 input \/ 9 output/);
    assert.match(result.stdout, /Hello from Anthropic format/);
  });

  it("ai-anthropic-message rejects streaming locally without invoking the Go CLI", () => {
    const fake = setupFakeTelnyx();
    const result = runCli([
      "ai-anthropic-message",
      "--max-tokens", "64",
      "--message", '{"role":"user","content":"Hello"}',
      "--model", "zai-org/GLM-5.2",
      "--stream",
      "--json",
    ], fake.env);

    assert.notEqual(result.status, 0);
    assert.match(JSON.parse(result.stdout).error, /streaming.*not supported/i);
    assert.deepEqual(readLoggedArgs(fake.logPath), []);
  });

  it("ai-anthropic-message treats --stream false as a non-streaming request", () => {
    const fake = setupFakeTelnyx();
    const result = runCli([
      "ai-anthropic-message",
      "--max-tokens", "64",
      "--message", '{"role":"user","content":"Hello"}',
      "--model", "zai-org/GLM-5.2",
      "--stream", "false",
      "--json",
    ], fake.env);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, "");
    assert.equal(JSON.parse(result.stdout).id, "msg_01ABC");
    const call = readLoggedArgs(fake.logPath)[0];
    assert.ok(!call.includes("--stream"));
    assert.ok(!call.includes("false"));
  });

  it("ai-anthropic-message validates every required field before invoking the Go CLI", () => {
    for (const args of [
      ["ai-anthropic-message", "--message", '{"role":"user","content":"Hi"}', "--model", "zai-org/GLM-5.2", "--json"],
      ["ai-anthropic-message", "--max-tokens", "64", "--model", "zai-org/GLM-5.2", "--json"],
      ["ai-anthropic-message", "--max-tokens", "64", "--message", '{"role":"user","content":"Hi"}', "--json"],
      ["ai-anthropic-message", "--max-tokens", "--message", '{"role":"user","content":"Hi"}', "--model", "zai-org/GLM-5.2", "--json"],
    ]) {
      const fake = setupFakeTelnyx();
      const result = runCli(args, fake.env);
      assert.notEqual(result.status, 0, `expected ${args.join(" ")} to fail`);
      assert.ok(JSON.parse(result.stdout).error);
      assert.deepEqual(readLoggedArgs(fake.logPath), []);
    }
  });

  it("ai-anthropic-message rejects a repeatable flag without a value", () => {
    const fake = setupFakeTelnyx();
    const result = runCli([
      "ai-anthropic-message",
      "--max-tokens", "64",
      "--message", '{"role":"user","content":"Hello"}',
      "--model", "zai-org/GLM-5.2",
      "--tool",
      "--json",
    ], fake.env);

    assert.notEqual(result.status, 0);
    assert.match(JSON.parse(result.stdout).error, /--tool requires a value/);
    assert.deepEqual(readLoggedArgs(fake.logPath), []);
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
    assert.match(help.stdout, /ai-anthropic-message/);
    assert.match(help.stdout, /ai-embed/);
    assert.match(help.stdout, /--message <json>/);
    assert.match(help.stdout, /Anthropic message JSON object \(repeatable, required\)/);
    assert.match(help.stdout, /--max-tokens <n>\s+Maximum number of tokens to generate \(required\)/);
    assert.doesNotMatch(help.stdout, /--stream\s+Request a streaming completion/);
    assert.match(help.stdout, /--input <value>/);

    const capabilities = runCli(["capabilities", "--json"]);
    assert.equal(capabilities.status, 0, capabilities.stderr);
    const output = JSON.parse(capabilities.stdout);
    const commandNames = output.composite_commands.map((command: { name: string }) => command.name);
    assert.ok(commandNames.includes("telnyx-agent ai-chat"));
    assert.ok(commandNames.includes("telnyx-agent ai-anthropic-message"));
    assert.ok(commandNames.includes("telnyx-agent ai-embed"));
    const aiActions = output.api_capabilities["🤖 AI"].flatMap((capability: { actions: string[] }) => capability.actions);
    assert.ok(aiActions.includes("ai_chat"));
    assert.ok(aiActions.includes("ai_anthropic_message"));
    assert.ok(aiActions.includes("ai_embed"));
  });
});
