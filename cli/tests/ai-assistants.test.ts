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

function setupFakeTelnyx(): { logPath: string; env: NodeJS.ProcessEnv } {
  const tempDir = mkdtempSync(join(tmpdir(), "telnyx-agent-ai-assistants-"));
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
function flag(name) { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : undefined; }
function equalsFlag(name) { const item = args.find((arg) => arg.startsWith(name + "=")); return item && item.slice(name.length + 1); }

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
  console.log(JSON.stringify({ data: {
    id: "assistant-created",
    name: flag("--name"),
    instructions: flag("--instructions"),
    description: flag("--description"),
    model: flag("--model"),
    greeting: flag("--greeting"),
    tags: JSON.parse(flag("--tag") || "[]"),
    tool_ids: JSON.parse(flag("--tool-id") || "[]")
  } }));
} else if (args[1] === "retrieve") {
  console.log(JSON.stringify({ data: {
    id: flag("--assistant-id"),
    name: "Concierge",
    instructions: "Help callers",
    model: "model-one",
    greeting: "Hello"
  } }));
} else if (args[1] === "update") {
  console.log(JSON.stringify({ data: {
    id: flag("--assistant-id"),
    name: flag("--name") || "Concierge",
    instructions: flag("--instructions") || "Help callers",
    model: flag("--model") || "model-one",
    greeting: flag("--greeting"),
    promote_to_main: equalsFlag("--promote-to-main") === "true"
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
    env: {
      ...process.env,
      TELNYX_CLI_PATH: fakeTelnyx,
      TELNYX_FAKE_ARGS_LOG: logPath,
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

function assertFlag(args: string[], flag: string, value: string): void {
  const index = args.indexOf(flag);
  assert.notEqual(index, -1, `expected ${flag} in ${args.join(" ")}`);
  assert.equal(args[index + 1], value);
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
    assertFlag(args, "--tag", JSON.stringify(["front-desk", "production"]));
    assertFlag(args, "--tool-id", JSON.stringify(["tool-1", "tool-2"]));
    assertFlag(args, "--format", "json");
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
