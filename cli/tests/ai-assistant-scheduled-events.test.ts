/** Mock-binary coverage for AI assistant scheduled-event lifecycle wrappers. */
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
  const tempDir = mkdtempSync(join(tmpdir(), "telnyx-agent-ai-scheduled-events-"));
  const binDir = join(tempDir, "bin");
  const logPath = join(tempDir, "args.jsonl");
  const fakeTelnyx = join(binDir, "telnyx");
  mkdirSync(binDir, { recursive: true });

  writeFileSync(fakeTelnyx, `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
fs.appendFileSync(process.env.TELNYX_FAKE_ARGS_LOG, JSON.stringify(args) + "\\n");
function flag(name) { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : undefined; }
if (args[0] !== "ai:assistants:scheduled-events") {
  console.error("unexpected fake telnyx invocation: " + args.join(" "));
  process.exit(2);
} else if (args[1] === "create") {
  console.log(JSON.stringify({ data: {
    id: "event-created",
    assistant_id: flag("--assistant-id"),
    status: "pending",
    scheduled_at_fixed_datetime: flag("--scheduled-at-fixed-datetime"),
    telnyx_conversation_channel: flag("--telnyx-conversation-channel")
  } }));
} else if (args[1] === "retrieve") {
  console.log(JSON.stringify({ data: {
    id: flag("--event-id"),
    assistant_id: flag("--assistant-id"),
    status: "pending",
    scheduled_at_fixed_datetime: "2026-08-25T14:00:00Z"
  } }));
} else if (args[1] === "list") {
  console.log(JSON.stringify({
    data: [
      { id: "event-1", status: "pending", scheduled_at_fixed_datetime: "2026-08-25T14:00:00Z" },
      { id: "event-2", status: "completed", scheduled_at_fixed_datetime: "2026-08-24T14:00:00Z" }
    ],
    meta: { page_number: 0, page_size: 20, total_results: 2 }
  }));
} else if (args[1] === "delete") {
  console.log("{}");
} else {
  console.error("unexpected scheduled-event action: " + args.join(" "));
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
  assert.ok(contents.endsWith("\n"), "fake binary should terminate JSON.stringify(args) with an actual newline");
  assert.ok(!contents.endsWith("\n\n"), "fake binary should not append a blank JSONL record");
  assert.ok(!contents.includes("\\n"), "fake binary should not write a literal backslash-n");
  return contents.trimEnd().split("\n").map((line) => JSON.parse(line) as string[]);
}

function assertFlag(args: string[], flag: string, value: string): void {
  const index = args.indexOf(flag);
  assert.notEqual(index, -1, `expected ${flag} in ${args.join(" ")}`);
  assert.equal(args[index + 1], value);
}

describe("AI assistant scheduled-event lifecycle commands", () => {
  it("creates an event with exact required, object, nested, retry, and SMS flags", () => {
    const fake = setupFakeTelnyx();
    const result = runAgent([
      "create-ai-assistant-scheduled-event",
      "--assistant-id", "assistant-1",
      "--scheduled-at-fixed-datetime", "2026-08-25T14:00:00-04:00",
      "--telnyx-agent-target", "+13125550100",
      "--telnyx-conversation-channel", "sms_chat",
      "--telnyx-end-user-target", "+13125550101",
      "--call-settings", '{"sip_region":"US"}',
      "--call-settings.sip-region", "US",
      "--conversation-metadata", '{"customer_id":"customer-1"}',
      "--dynamic-variables", '{"name":"Ada"}',
      "--max-retries-client-errors", "0",
      "--retry-interval-secs", "60",
      "--text", "Appointment reminder",
      "--json",
    ], fake.env);

    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.equal(output.assistant_id, "assistant-1");
    assert.equal(output.event_id, "event-created");
    assert.equal(output.scheduled_event.status, "pending");

    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args.slice(0, 2), ["ai:assistants:scheduled-events", "create"]);
    assertFlag(args, "--assistant-id", "assistant-1");
    assertFlag(args, "--scheduled-at-fixed-datetime", "2026-08-25T14:00:00-04:00");
    assertFlag(args, "--telnyx-agent-target", "+13125550100");
    assertFlag(args, "--telnyx-conversation-channel", "sms_chat");
    assertFlag(args, "--telnyx-end-user-target", "+13125550101");
    assertFlag(args, "--call-settings", '{"sip_region":"US"}');
    assertFlag(args, "--call-settings.sip-region", "US");
    assertFlag(args, "--conversation-metadata", '{"customer_id":"customer-1"}');
    assertFlag(args, "--dynamic-variables", '{"name":"Ada"}');
    assertFlag(args, "--max-retries-client-errors", "0");
    assertFlag(args, "--retry-interval-secs", "60");
    assertFlag(args, "--text", "Appointment reminder");
    assertFlag(args, "--format", "json");
  });

  it("retrieves one event through the exact generated retrieve action", () => {
    const fake = setupFakeTelnyx();
    const result = runAgent([
      "get-ai-assistant-scheduled-event",
      "--assistant-id", "assistant-1",
      "--event-id", "event-1",
      "--json",
    ], fake.env);

    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), {
      assistant_id: "assistant-1",
      event_id: "event-1",
      scheduled_event: {
        id: "event-1",
        assistant_id: "assistant-1",
        status: "pending",
        scheduled_at_fixed_datetime: "2026-08-25T14:00:00Z",
      },
    });
    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args, [
      "ai:assistants:scheduled-events", "retrieve",
      "--assistant-id", "assistant-1",
      "--event-id", "event-1",
      "--format", "json",
    ]);
  });

  it("lists one stable raw envelope with upstream filters, zero pagination, and max-items", () => {
    const fake = setupFakeTelnyx();
    const result = runAgent([
      "list-ai-assistant-scheduled-events",
      "--assistant-id", "assistant-1",
      "--conversation-channel", "phone_call",
      "--from-date", "2026-08-24T00:00:00Z",
      "--to-date", "2026-08-26T00:00:00+00:00",
      "--page-number", "0",
      "--page-size", "20",
      "--max-items", "1",
      "--json",
    ], fake.env);

    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), {
      assistant_id: "assistant-1",
      count: 1,
      scheduled_events: [
        { id: "event-1", status: "pending", scheduled_at_fixed_datetime: "2026-08-25T14:00:00Z" },
      ],
      meta: { page_number: 0, page_size: 20, total_results: 2 },
    });
    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args.slice(0, 2), ["ai:assistants:scheduled-events", "list"]);
    assertFlag(args, "--assistant-id", "assistant-1");
    assertFlag(args, "--conversation-channel", "phone_call");
    assertFlag(args, "--from-date", "2026-08-24T00:00:00Z");
    assertFlag(args, "--to-date", "2026-08-26T00:00:00+00:00");
    assertFlag(args, "--page-number", "0");
    assertFlag(args, "--page-size", "20");
    assertFlag(args, "--max-items", "1");
    assert.deepEqual(args.slice(-2), ["--format", "raw"]);
  });

  it("requires bare --confirm for cancellation and never forwards it", () => {
    for (const confirmation of [[], ["--confirm", "true"], ["--confirm", "false"]]) {
      const fake = setupFakeTelnyx();
      const rejected = runAgent([
        "cancel-ai-assistant-scheduled-event",
        "--assistant-id", "assistant-1",
        "--event-id", "event-1",
        ...confirmation,
        "--json",
      ], fake.env);
      assert.notEqual(rejected.status, 0);
      assert.match(JSON.parse(rejected.stdout).error, /--confirm is required/);
      assert.deepEqual(loggedArgs(fake.logPath), []);
    }

    const fake = setupFakeTelnyx();
    const accepted = runAgent([
      "cancel-ai-assistant-scheduled-event",
      "--assistant-id", "assistant-1",
      "--event-id", "event-1",
      "--confirm",
      "--json",
    ], fake.env);
    assert.equal(accepted.status, 0, accepted.stderr);
    assert.deepEqual(JSON.parse(accepted.stdout), {
      assistant_id: "assistant-1",
      event_id: "event-1",
      canceled: true,
    });
    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args.slice(0, 2), ["ai:assistants:scheduled-events", "delete"]);
    assert.ok(!args.includes("--confirm"));
  });

  it("validates IDs, required create values, channels, dates, objects, and integers locally", () => {
    const baseCreate = [
      "create-ai-assistant-scheduled-event",
      "--assistant-id", "assistant-1",
      "--scheduled-at-fixed-datetime", "2026-08-25T14:00:00Z",
      "--telnyx-agent-target", "+13125550100",
      "--telnyx-conversation-channel", "phone_call",
      "--telnyx-end-user-target", "+13125550101",
    ];
    const invalidCases = [
      ["get-ai-assistant-scheduled-event", "--event-id", "event-1", "--json"],
      ["get-ai-assistant-scheduled-event", "--assistant-id", "assistant-1", "--json"],
      baseCreate.filter((value, index) => index < 1 || index > 2).concat("--json"),
      [...baseCreate, "--scheduled-at-fixed-datetime", "tomorrow", "--json"],
      [...baseCreate, "--telnyx-conversation-channel", "email", "--json"],
      [...baseCreate, "--call-settings", "[]", "--json"],
      [...baseCreate, "--call-settings.sip-region", "--json"],
      [...baseCreate, "--conversation-metadata", "not-json", "--json"],
      [...baseCreate, "--max-retries-client-errors", "-1", "--json"],
      [...baseCreate, "--retry-interval-secs", "1.5", "--json"],
      [...baseCreate, "--telnyx-conversation-channel", "sms_chat", "--json"],
      ["list-ai-assistant-scheduled-events", "--assistant-id", "assistant-1", "--from-date", "2026-08-24", "--json"],
      ["list-ai-assistant-scheduled-events", "--assistant-id", "assistant-1", "--to-date", "2026-02-31T12:00:00Z", "--json"],
      ["list-ai-assistant-scheduled-events", "--assistant-id", "assistant-1", "--conversation-channel", "--json"],
      ["list-ai-assistant-scheduled-events", "--assistant-id", "assistant-1", "--page-size", "-1", "--json"],
      ["list-ai-assistant-scheduled-events", "--assistant-id", "assistant-1", "--max-items", "9007199254740992", "--json"],
    ];

    for (const args of invalidCases) {
      const fake = setupFakeTelnyx();
      const result = runAgent(args, fake.env);
      assert.notEqual(result.status, 0, `expected ${args.join(" ")} to fail`);
      assert.ok(JSON.parse(result.stdout).error);
      assert.deepEqual(loggedArgs(fake.logPath), []);
    }
  });

  it("prints useful human output and advertises all lifecycle commands", () => {
    const fake = setupFakeTelnyx();
    const human = runAgent([
      "get-ai-assistant-scheduled-event",
      "--assistant-id", "assistant-1",
      "--event-id", "event-1",
    ], fake.env);
    assert.equal(human.status, 0, human.stderr);
    assert.match(human.stdout, /AI assistant scheduled event retrieved!/);
    assert.match(human.stdout, /event-1/);
    assert.match(human.stdout, /pending/);

    const commands = [
      "create-ai-assistant-scheduled-event",
      "get-ai-assistant-scheduled-event",
      "list-ai-assistant-scheduled-events",
      "cancel-ai-assistant-scheduled-event",
    ];
    const help = runAgent(["help"]);
    const capabilitiesResult = runAgent(["capabilities", "--json"]);
    assert.equal(help.status, 0, help.stderr);
    assert.equal(capabilitiesResult.status, 0, capabilitiesResult.stderr);
    const capabilities = JSON.parse(capabilitiesResult.stdout);
    for (const command of commands) {
      assert.match(help.stdout, new RegExp(command));
      assert.ok(capabilities.composite_commands.some(
        (entry: { name: string }) => entry.name === `telnyx-agent ${command}`,
      ));
    }
    const actions = capabilities.api_capabilities["🤖 AI"].find(
      (capability: { name: string }) => capability.name === "Assistants",
    ).actions;
    for (const action of [
      "create_ai_assistant_scheduled_event",
      "get_ai_assistant_scheduled_event",
      "list_ai_assistant_scheduled_events",
      "cancel_ai_assistant_scheduled_event",
    ]) assert.ok(actions.includes(action));
  });
});
