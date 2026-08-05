/**
 * Mock-binary coverage for direct AI assistant lifecycle actions.
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

function setupFakeTelnyx(options: { captureStdin?: boolean } = {}): {
  logPath: string;
  requestLogPath: string;
  env: NodeJS.ProcessEnv;
} {
  const tempDir = mkdtempSync(join(tmpdir(), "telnyx-agent-ai-assistants-"));
  const binDir = join(tempDir, "bin");
  const logPath = join(tempDir, "args.jsonl");
  const requestLogPath = join(tempDir, "requests.jsonl");
  const fakeTelnyx = join(binDir, "telnyx");
  mkdirSync(binDir, { recursive: true });

  writeFileSync(
    fakeTelnyx,
    `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
fs.appendFileSync(process.env.TELNYX_FAKE_ARGS_LOG, JSON.stringify(args) + "\\n");
function flag(name) { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : undefined; }
function flags(name) {
  const values = [];
  for (let index = 0; index < args.length; index++) {
    if (args[index] === name && args[index + 1] !== undefined) values.push(args[index + 1]);
  }
  return values;
}
function equalsFlag(name) { const item = args.find((arg) => arg.startsWith(name + "=")); return item && item.slice(name.length + 1); }
function requestBody() {
  let body = {};
  if (process.env.TELNYX_FAKE_CAPTURE_STDIN === "1") {
    const stdin = fs.readFileSync(0, "utf8");
    if (stdin) body = JSON.parse(stdin);
  }
  function set(name, key) { const value = flag(name); if (value !== undefined) body[key] = value; }
  set("--name", "name");
  set("--instructions", "instructions");
  set("--description", "description");
  set("--model", "model");
  set("--greeting", "greeting");
  set("--version-name", "version_name");
  const tags = flags("--tag");
  const toolIds = flags("--tool-id");
  if (tags.length > 0) body.tags = tags;
  if (toolIds.length > 0) body.tool_ids = toolIds;
  const promoteToMain = equalsFlag("--promote-to-main");
  if (promoteToMain !== undefined) body.promote_to_main = promoteToMain === "true";
  return body;
}
function logRequest(method, body) {
  fs.appendFileSync(process.env.TELNYX_FAKE_REQUEST_LOG, JSON.stringify({ method, body }) + "\\n");
}

if (args[0] !== "ai:assistants") {
  console.error("unexpected fake telnyx invocation: " + args.join(" "));
  process.exit(2);
} else if (args[1] === "list") {
  console.log(JSON.stringify({
    data: [
      { id: "assistant-1", name: "Concierge", instructions: "Help callers", model: "model-one", greeting: "Hello" },
      { id: "assistant-2", name: "Scheduler", instructions: "Book visits", model: "model-two", greeting: null }
    ],
    meta: { total_results: 2 }
  }));
} else if (args[1] === "create") {
  const body = requestBody();
  logRequest("POST", body);
  console.log(JSON.stringify({ data: { id: "assistant-created", ...body } }));
} else if (args[1] === "retrieve") {
  console.log(JSON.stringify({ data: {
    id: flag("--assistant-id"),
    name: "Concierge",
    instructions: "Help callers",
    model: "model-one",
    greeting: "Hello"
  } }));
} else if (args[1] === "update") {
  const body = requestBody();
  logRequest("POST", body);
  console.log(JSON.stringify({ data: {
    id: flag("--assistant-id"),
    name: "Concierge",
    instructions: "Help callers",
    model: "model-one",
    ...body
  } }));
} else if (args[1] === "delete") {
  console.log(JSON.stringify({ data: { id: flag("--assistant-id") } }));
} else {
  console.error("unexpected fake telnyx invocation: " + args.join(" "));
  process.exit(2);
}
`,
  );
  chmodSync(fakeTelnyx, 0o755);

  return {
    logPath,
    requestLogPath,
    env: {
      ...process.env,
      TELNYX_CLI_PATH: fakeTelnyx,
      TELNYX_FAKE_ARGS_LOG: logPath,
      TELNYX_FAKE_REQUEST_LOG: requestLogPath,
      TELNYX_FAKE_CAPTURE_STDIN: options.captureStdin ? "1" : "0",
      TELNYX_API_KEY: "KEY_fake_test",
    },
  };
}

function runAgent(
  args: string[],
  env: NodeJS.ProcessEnv = process.env,
): { stdout: string; stderr: string; status: number } {
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

function loggedRequests(logPath: string): Array<{ method: string; body: Record<string, unknown> }> {
  if (!existsSync(logPath)) return [];
  return readFileSync(logPath, "utf8").trimEnd().split("\n").map((line) => JSON.parse(line));
}

function assertFlag(args: string[], flag: string, value: string): void {
  const index = args.indexOf(flag);
  assert.notEqual(index, -1, `expected ${flag} in ${args.join(" ")}`);
  assert.equal(args[index + 1], value);
}

function assertFlagValues(args: string[], flag: string, values: string[]): void {
  const actual = args.flatMap((arg, index) => arg === flag ? [args[index + 1]] : []);
  assert.deepEqual(actual, values, `expected repeated ${flag} values in ${args.join(" ")}`);
}

describe("AI assistant lifecycle action commands", () => {
  it("lists assistants using the exact generated command and stable list JSON", () => {
    const fake = setupFakeTelnyx();
    const result = runAgent(["list-ai-assistants", "--json"], fake.env);

    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), {
      count: 2,
      ai_assistants: [
        { id: "assistant-1", name: "Concierge", instructions: "Help callers", model: "model-one", greeting: "Hello" },
        { id: "assistant-2", name: "Scheduler", instructions: "Book visits", model: "model-two", greeting: null },
      ],
      meta: { total_results: 2 },
    });

    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args, ["ai:assistants", "list", "--format", "raw"]);
  });

  it("creates an assistant and maps useful scalar, nested, object, and array fields", () => {
    const fake = setupFakeTelnyx();
    const dynamicVariables = '{"customer_name":"friend"}';
    const result = runAgent([
      "create-ai-assistant",
      "--name", "Concierge",
      "--instructions", "Help callers",
      "--description", "Front desk",
      "--model", "model-one",
      "--greeting", "Hello",
      "--voice", "Telnyx.KokoroTTS.af_heart",
      "--transcription-model", "deepgram/flux",
      "--transcription-language", "en",
      "--dynamic-variables", dynamicVariables,
      "--dynamic-variables-webhook-url", "https://example.com/variables",
      "--dynamic-variables-webhook-timeout-ms", "2500",
      "--tags", "front-desk,production",
      "--tool-ids", "tool-1,tool-2",
      "--json",
    ], fake.env);

    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.equal(output.assistant_id, "assistant-created");
    assert.equal(output.ai_assistant.name, "Concierge");
    assert.deepEqual(output.ai_assistant.tags, ["front-desk", "production"]);
    assert.deepEqual(output.ai_assistant.tool_ids, ["tool-1", "tool-2"]);

    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args.slice(0, 2), ["ai:assistants", "create"]);
    assertFlag(args, "--name", "Concierge");
    assertFlag(args, "--instructions", "Help callers");
    assertFlag(args, "--description", "Front desk");
    assertFlag(args, "--model", "model-one");
    assertFlag(args, "--greeting", "Hello");
    assertFlag(args, "--voice-settings.voice", "Telnyx.KokoroTTS.af_heart");
    assertFlag(args, "--transcription.model", "deepgram/flux");
    assertFlag(args, "--transcription.language", "en");
    assertFlag(args, "--dynamic-variables", dynamicVariables);
    assertFlag(args, "--dynamic-variables-webhook-url", "https://example.com/variables");
    assertFlag(args, "--dynamic-variables-webhook-timeout-ms", "2500");
    assertFlagValues(args, "--tag", ["front-desk", "production"]);
    assertFlagValues(args, "--tool-id", ["tool-1", "tool-2"]);
    assertFlag(args, "--format", "json");

    const [request] = loggedRequests(fake.requestLogPath);
    assert.deepEqual(request.body.tags, ["front-desk", "production"]);
    assert.deepEqual(request.body.tool_ids, ["tool-1", "tool-2"]);
  });

  it("gets one assistant through ai:assistants retrieve", () => {
    const fake = setupFakeTelnyx();
    const result = runAgent(["get-ai-assistant", "--id", "assistant-1", "--json"], fake.env);

    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), {
      assistant_id: "assistant-1",
      ai_assistant: {
        id: "assistant-1",
        name: "Concierge",
        instructions: "Help callers",
        model: "model-one",
        greeting: "Hello",
      },
    });

    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args.slice(0, 2), ["ai:assistants", "retrieve"]);
    assertFlag(args, "--assistant-id", "assistant-1");
    assertFlag(args, "--format", "json");
  });

  it("updates valid assistant fields and preserves an intentionally empty greeting", () => {
    const fake = setupFakeTelnyx();
    const result = runAgent([
      "update-ai-assistant",
      "--assistant-id", "assistant-1",
      "--name", "Night Concierge",
      "--instructions", "Help callers after hours",
      "--greeting", "",
      "--version-name", "Night shift",
      "--promote-to-main", "false",
      "--json",
    ], fake.env);

    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.equal(output.assistant_id, "assistant-1");
    assert.equal(output.ai_assistant.greeting, "");
    assert.equal(output.ai_assistant.promote_to_main, false);

    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args.slice(0, 2), ["ai:assistants", "update"]);
    assertFlag(args, "--assistant-id", "assistant-1");
    assertFlag(args, "--name", "Night Concierge");
    assertFlag(args, "--instructions", "Help callers after hours");
    assertFlag(args, "--greeting", "");
    assertFlag(args, "--version-name", "Night shift");
    assert.ok(args.includes("--promote-to-main=false"));
    assertFlag(args, "--format", "json");
  });

  it("clears all tags and shared tool IDs through explicit update-only flags", () => {
    const fake = setupFakeTelnyx({ captureStdin: true });
    const result = runAgent([
      "update-ai-assistant",
      "--id", "assistant-1",
      "--clear-tags",
      "--clear-tool-ids",
      "--json",
    ], fake.env);

    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout).ai_assistant.tags, []);
    assert.deepEqual(JSON.parse(result.stdout).ai_assistant.tool_ids, []);

    const [args] = loggedArgs(fake.logPath);
    assert.equal(args.includes("--tag"), false);
    assert.equal(args.includes("--tool-id"), false);
    assert.equal(args.includes("--clear-tags"), false);
    assert.equal(args.includes("--clear-tool-ids"), false);

    const [request] = loggedRequests(fake.requestLogPath);
    assert.deepEqual(request.body, { tags: [], tool_ids: [] });
  });

  it("does not forward omitted update fields while preserving an intentionally empty greeting", () => {
    const fake = setupFakeTelnyx();
    const result = runAgent([
      "update-ai-assistant",
      "--id", "assistant-1",
      "--greeting", "",
      "--json",
    ], fake.env);

    assert.equal(result.status, 0, result.stderr);
    const [request] = loggedRequests(fake.requestLogPath);
    assert.deepEqual(request.body, { greeting: "" });
  });

  it("keeps CSV validation and rejects clear flags on create or beside CSV values", () => {
    const invalidCases = [
      ["create-ai-assistant", "--name", "Concierge", "--instructions", "Help", "--tags", "", "--json"],
      ["update-ai-assistant", "--id", "assistant-1", "--tool-ids", " , ", "--json"],
      ["create-ai-assistant", "--name", "Concierge", "--instructions", "Help", "--clear-tags", "--json"],
      ["update-ai-assistant", "--id", "assistant-1", "--tags", "production", "--clear-tags", "--json"],
      ["update-ai-assistant", "--id", "assistant-1", "--clear-tool-ids", "false", "--json"],
    ];

    for (const args of invalidCases) {
      const fake = setupFakeTelnyx();
      const result = runAgent(args, fake.env);
      assert.notEqual(result.status, 0, `expected ${args.join(" ")} to fail`);
      assert.ok(JSON.parse(result.stdout).error);
      assert.deepEqual(loggedArgs(fake.logPath), []);
    }
  });

  it("rejects bare array flags on create and update instead of silently omitting them", () => {
    const invalidCases = [
      ["create-ai-assistant", "--name", "Concierge", "--instructions", "Help", "--tags", "--json"],
      ["update-ai-assistant", "--id", "assistant-1", "--tool-ids", "--json"],
    ];

    for (const args of invalidCases) {
      const fake = setupFakeTelnyx();
      const result = runAgent(args, fake.env);
      assert.notEqual(result.status, 0, `expected ${args.join(" ")} to fail`);
      assert.match(JSON.parse(result.stdout).error, /--(?:tags|tool-ids) must contain at least one value/);
      assert.deepEqual(loggedArgs(fake.logPath), []);
    }
  });

  it("requires explicit confirmation before deleting and never forwards --confirm", () => {
    const fake = setupFakeTelnyx();
    const rejected = runAgent(["delete-ai-assistant", "--id", "assistant-1", "--json"], fake.env);
    assert.notEqual(rejected.status, 0);
    assert.match(JSON.parse(rejected.stdout).error, /--confirm is required/);
    assert.deepEqual(loggedArgs(fake.logPath), []);

    const accepted = runAgent([
      "delete-ai-assistant",
      "--id", "assistant-1",
      "--confirm",
      "--json",
    ], fake.env);
    assert.equal(accepted.status, 0, accepted.stderr);
    assert.deepEqual(JSON.parse(accepted.stdout), { assistant_id: "assistant-1", deleted: true });

    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args.slice(0, 2), ["ai:assistants", "delete"]);
    assertFlag(args, "--assistant-id", "assistant-1");
    assert.ok(!args.includes("--confirm"));
    assertFlag(args, "--format", "json");
  });

  it("validates required IDs, create fields, update fields, and structured options locally", () => {
    const invalidCases = [
      ["create-ai-assistant", "--instructions", "Help", "--json"],
      ["create-ai-assistant", "--name", "Concierge", "--json"],
      ["get-ai-assistant", "--json"],
      ["update-ai-assistant", "--id", "assistant-1", "--json"],
      ["create-ai-assistant", "--name", "Concierge", "--instructions", "Help", "--dynamic-variables", "[]", "--json"],
      ["create-ai-assistant", "--name", "Concierge", "--instructions", "Help", "--dynamic-variables-webhook-timeout-ms", "10001", "--json"],
    ];

    for (const args of invalidCases) {
      const fake = setupFakeTelnyx();
      const result = runAgent(args, fake.env);
      assert.notEqual(result.status, 0, `expected ${args.join(" ")} to fail`);
      assert.ok(JSON.parse(result.stdout).error);
      assert.deepEqual(loggedArgs(fake.logPath), []);
    }
  });

  it("advertises every lifecycle command in help and capabilities", () => {
    const commands = [
      "list-ai-assistants",
      "create-ai-assistant",
      "get-ai-assistant",
      "update-ai-assistant",
      "delete-ai-assistant",
    ];
    const help = runAgent(["help"]);
    assert.equal(help.status, 0, help.stderr);
    const capabilitiesResult = runAgent(["capabilities", "--json"]);
    assert.equal(capabilitiesResult.status, 0, capabilitiesResult.stderr);
    const capabilities = JSON.parse(capabilitiesResult.stdout);

    for (const command of commands) {
      assert.match(help.stdout, new RegExp(command));
      assert.ok(
        capabilities.composite_commands.some(
          (entry: { name: string }) => entry.name === `telnyx-agent ${command}`,
        ),
        `capabilities should advertise ${command}`,
      );
    }
    assert.match(help.stdout, /--confirm\s+Explicitly confirm deletion/);
    assert.match(help.stdout, /--clear-tags\s+Clear all assistant tags/);
    assert.match(help.stdout, /--clear-tool-ids\s+Clear all shared AI tool IDs/);

    const actions = capabilities.api_capabilities["🤖 AI"].find(
      (capability: { name: string }) => capability.name === "Assistants",
    ).actions;
    assert.deepEqual(actions, [
      "list_ai_assistants",
      "create_ai_assistant",
      "get_ai_assistant",
      "update_ai_assistant",
      "delete_ai_assistant",
    ]);
  });
});
