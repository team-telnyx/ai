/**
 * Mock-binary coverage for Meeting Bot session lifecycle, live actions, and artifacts.
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

function setupFakeTelnyx(version = "0.27.0"): { logPath: string; env: NodeJS.ProcessEnv } {
  const tempDir = mkdtempSync(join(tmpdir(), "telnyx-agent-meeting-sessions-"));
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
function flag(name) { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : undefined; }
function equalsFlag(name) { return args.find((arg) => arg.startsWith(name + "=")); }
const root = args[0];
const action = args[1];
const id = flag("--id") || "mtgsess-created";

if (root === "meeting-sessions" && action === "create") {
  console.log(JSON.stringify({ data: {
    id,
    bot_name: flag("--bot-name") || "Meeting Bot",
    meeting_url: flag("--meeting-url"),
    status: "joining",
    barge_in: equalsFlag("--barge-in") === "--barge-in=true"
  } }));
} else if (root === "meeting-sessions" && action === "list") {
  console.log(JSON.stringify({ data: [
    { id: "mtgsess-1", bot_name: "Notes Bot", status: "active" },
    { id: "mtgsess-2", bot_name: "Later Bot", status: "scheduled" }
  ], meta: { total_results: 2 } }));
} else if (root === "meeting-sessions" && action === "retrieve") {
  console.log(JSON.stringify({ data: { id, bot_name: "Notes Bot", status: "active" } }));
} else if (root === "meeting-sessions" && action === "delete") {
  console.log(JSON.stringify({ data: { id, status: "ended" } }));
} else if (root === "meeting-sessions:actions" && action === "send-chat") {
  console.log(JSON.stringify({ data: { id: "chat-1", text: flag("--text") } }));
} else if (root === "meeting-sessions:actions" && action === "speak") {
  console.log(JSON.stringify({ data: { id: "speech-1", text: flag("--text") } }));
} else if (root === "meeting-sessions:actions" && action === "stop-speaking") {
  console.log(JSON.stringify({ data: { stopped: true } }));
} else if (root === "meeting-sessions" && action === "retrieve-transcript") {
  console.log(JSON.stringify({ data: [
    { seq: 42, speaker: "Alice", text: "Hello" },
    { seq: 43, speaker: "Meeting Bot", text: "Hi" }
  ], meta: { next_after: 43 } }));
} else if (root === "meeting-sessions" && action === "retrieve-recordings") {
  console.log(JSON.stringify({ data: [{ id: "recording-1", download_url: "https://example.invalid/r.mp4" }] }));
} else if (root === "meeting-sessions:artifacts" && action === "create") {
  console.log(JSON.stringify({ data: { id: "artifact-new", type: flag("--type"), status: "pending" } }));
} else if (root === "meeting-sessions:artifacts" && action === "list") {
  console.log(JSON.stringify({ data: [
    { id: "artifact-1", type: "summary", status: "completed" },
    { id: "artifact-2", type: "action_items", status: "completed" }
  ], meta: { total_results: 2 } }));
} else if (root === "meeting-sessions:artifacts" && action === "retrieve") {
  console.log(JSON.stringify({ data: { id: flag("--artifact-id"), type: "summary", status: "completed", content: "Decisions" } }));
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
  assert.ok(contents.endsWith("\n"), "fake binary should terminate each JSON record with one real newline");
  assert.ok(!contents.endsWith("\n\n"), "fake binary should not write a blank JSONL record");
  return contents.trimEnd().split("\n").map((line) => JSON.parse(line) as string[]);
}

function assertFlag(args: string[], name: string, value: string): void {
  const index = args.indexOf(name);
  assert.notEqual(index, -1, `expected ${name} in ${args.join(" ")}`);
  assert.equal(args[index + 1], value);
}

function expectSuccess(args: string[], fake: ReturnType<typeof setupFakeTelnyx>): unknown {
  const result = runAgent([...args, "--json"], fake.env);
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

describe("Meeting Bot session commands", () => {
  it("creates a session with exact v0.27 generated paths and useful creation flags", () => {
    const fake = setupFakeTelnyx();
    const metadata = '{"ticket":"INC-42"}';
    const output = expectSuccess([
      "create-meeting-session",
      "--meeting-url", "https://meet.example.com/room",
      "--bot-name", "Notes Bot",
      "--join-at", "2026-08-18T12:00:00Z",
      "--metadata", metadata,
      "--speak-on-enter", "Hello",
      "--voice", "Telnyx.KokoroTTS.af_heart",
      "--webhook-url", "https://example.com/meetings",
      "--idempotency-key", "retry-1",
      "--barge-in", "true",
      "--summarize-on-end", "false",
    ], fake) as any;

    assert.equal(output.meeting_session_id, "mtgsess-created");
    assert.equal(output.meeting_session.status, "joining");
    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args.slice(0, 2), ["meeting-sessions", "create"]);
    assertFlag(args, "--meeting-url", "https://meet.example.com/room");
    assertFlag(args, "--bot-name", "Notes Bot");
    assertFlag(args, "--join-at", "2026-08-18T12:00:00Z");
    assertFlag(args, "--metadata", metadata);
    assert.ok(args.includes("--barge-in=true"));
    assert.ok(args.includes("--summarize-on-end=false"));
    assertFlag(args, "--format", "json");
  });

  it("lists, gets, and ends sessions without claiming hard deletion", () => {
    const listFake = setupFakeTelnyx();
    const list = expectSuccess(["list-meeting-sessions", "--status", "active"], listFake) as any;
    assert.equal(list.count, 2);
    assert.equal(list.meeting_sessions[0].id, "mtgsess-1");
    assert.deepEqual(loggedArgs(listFake.logPath)[0], [
      "meeting-sessions", "list", "--status", "active", "--format", "raw",
    ]);

    const getFake = setupFakeTelnyx();
    const get = expectSuccess(["get-meeting-session", "--meeting-session-id", "mtgsess-1"], getFake) as any;
    assert.equal(get.meeting_session_id, "mtgsess-1");
    assert.deepEqual(loggedArgs(getFake.logPath)[0], [
      "meeting-sessions", "retrieve", "--id", "mtgsess-1", "--format", "json",
    ]);

    const endFake = setupFakeTelnyx();
    const ended = expectSuccess(["end-meeting-session", "--id", "mtgsess-1"], endFake) as any;
    assert.deepEqual({ id: ended.meeting_session_id, ended: ended.ended }, { id: "mtgsess-1", ended: true });
    assert.deepEqual(loggedArgs(endFake.logPath)[0], [
      "meeting-sessions", "delete", "--id", "mtgsess-1", "--format", "json",
    ]);
  });

  it("dispatches all three live actions through meeting-sessions:actions", () => {
    const chatFake = setupFakeTelnyx();
    const chat = expectSuccess(["send-meeting-chat", "--id", "mtgsess-1", "--text", "Hello"], chatFake) as any;
    assert.equal(chat.action, "send-chat");
    assert.deepEqual(loggedArgs(chatFake.logPath)[0], [
      "meeting-sessions:actions", "send-chat", "--id", "mtgsess-1", "--text", "Hello", "--format", "json",
    ]);

    const speakFake = setupFakeTelnyx();
    const speech = expectSuccess([
      "speak-in-meeting", "--id", "mtgsess-1", "--text", "Starting now",
      "--voice", "voice-1", "--interrupt",
    ], speakFake) as any;
    assert.equal(speech.action, "speak");
    assert.deepEqual(loggedArgs(speakFake.logPath)[0], [
      "meeting-sessions:actions", "speak", "--id", "mtgsess-1", "--text", "Starting now",
      "--voice", "voice-1", "--interrupt=true", "--format", "json",
    ]);

    const stopFake = setupFakeTelnyx();
    const stopped = expectSuccess(["stop-meeting-speaking", "--id", "mtgsess-1"], stopFake) as any;
    assert.equal(stopped.action, "stop-speaking");
    assert.deepEqual(loggedArgs(stopFake.logPath)[0], [
      "meeting-sessions:actions", "stop-speaking", "--id", "mtgsess-1", "--format", "json",
    ]);
  });

  it("retrieves transcript and recording arrays with exact generated command names", () => {
    const transcriptFake = setupFakeTelnyx();
    const transcript = expectSuccess([
      "get-meeting-transcript", "--id", "mtgsess-1", "--after", "41", "--limit", "100", "--wait-seconds", "10",
    ], transcriptFake) as any;
    assert.equal(transcript.count, 2);
    assert.equal(transcript.meta.next_after, 43);
    assert.deepEqual(loggedArgs(transcriptFake.logPath)[0], [
      "meeting-sessions", "retrieve-transcript", "--id", "mtgsess-1",
      "--after", "41", "--limit", "100", "--wait-seconds", "10", "--format", "json",
    ]);

    const recordingsFake = setupFakeTelnyx();
    const recordings = expectSuccess(["get-meeting-recordings", "--id", "mtgsess-1"], recordingsFake) as any;
    assert.equal(recordings.count, 1);
    assert.deepEqual(loggedArgs(recordingsFake.logPath)[0], [
      "meeting-sessions", "retrieve-recordings", "--id", "mtgsess-1", "--format", "json",
    ]);
  });

  it("creates, lists, and retrieves artifacts through meeting-sessions:artifacts", () => {
    const createFake = setupFakeTelnyx();
    const created = expectSuccess([
      "create-meeting-artifact", "--id", "mtgsess-1", "--type", "action_items",
    ], createFake) as any;
    assert.equal(created.artifact_id, "artifact-new");
    assert.deepEqual(loggedArgs(createFake.logPath)[0], [
      "meeting-sessions:artifacts", "create", "--id", "mtgsess-1", "--type", "action_items", "--format", "json",
    ]);

    const listFake = setupFakeTelnyx();
    const listed = expectSuccess(["list-meeting-artifacts", "--id", "mtgsess-1"], listFake) as any;
    assert.equal(listed.count, 2);
    assert.deepEqual(loggedArgs(listFake.logPath)[0], [
      "meeting-sessions:artifacts", "list", "--id", "mtgsess-1", "--format", "raw",
    ]);

    const getFake = setupFakeTelnyx();
    const artifact = expectSuccess([
      "get-meeting-artifact", "--id", "mtgsess-1", "--artifact-id", "artifact-1",
    ], getFake) as any;
    assert.equal(artifact.artifact.content, "Decisions");
    assert.deepEqual(loggedArgs(getFake.logPath)[0], [
      "meeting-sessions:artifacts", "retrieve", "--id", "mtgsess-1",
      "--artifact-id", "artifact-1", "--format", "json",
    ]);
  });

  it("validates required and structured values before invoking the Go CLI", () => {
    const invalidCases = [
      ["create-meeting-session", "--json"],
      ["create-meeting-session", "--meeting-url", "https://meet.example.com/room", "--metadata", "[]", "--json"],
      ["get-meeting-session", "--json"],
      ["send-meeting-chat", "--id", "mtgsess-1", "--json"],
      ["get-meeting-transcript", "--id", "mtgsess-1", "--limit", "1001", "--json"],
      ["create-meeting-artifact", "--id", "mtgsess-1", "--type", "minutes", "--json"],
      ["get-meeting-artifact", "--id", "mtgsess-1", "--json"],
    ];
    for (const args of invalidCases) {
      const fake = setupFakeTelnyx();
      const result = runAgent(args, fake.env);
      assert.notEqual(result.status, 0, `expected ${args.join(" ")} to fail`);
      assert.ok(JSON.parse(result.stdout).error);
      assert.deepEqual(loggedArgs(fake.logPath), []);
    }
  });

  it("requires the v0.27 Go CLI without changing the bundled CLI pin", () => {
    const fake = setupFakeTelnyx("0.26.9");
    const result = runAgent(["list-meeting-sessions", "--json"], fake.env);
    assert.notEqual(result.status, 0);
    assert.match(JSON.parse(result.stdout).error, /requires >= 0\.27\.0/);
    assert.deepEqual(loggedArgs(fake.logPath), []);
  });

  it("registers every Meeting Bot interface in help and capabilities", () => {
    const commands = [
      "create-meeting-session", "list-meeting-sessions", "get-meeting-session", "end-meeting-session",
      "send-meeting-chat", "speak-in-meeting", "stop-meeting-speaking", "get-meeting-transcript",
      "get-meeting-recordings", "create-meeting-artifact", "list-meeting-artifacts", "get-meeting-artifact",
    ];
    const help = runAgent(["help"]);
    assert.equal(help.status, 0, help.stderr);
    assert.match(help.stdout, /hard-delete meeting-session route is not exposed upstream/);
    const capabilitiesResult = runAgent(["capabilities", "--json"]);
    assert.equal(capabilitiesResult.status, 0, capabilitiesResult.stderr);
    const capabilities = JSON.parse(capabilitiesResult.stdout);

    for (const command of commands) {
      assert.match(help.stdout, new RegExp(command));
      assert.ok(
        capabilities.composite_commands.some((entry: { name: string }) => entry.name === `telnyx-agent ${command}`),
        `capabilities should advertise ${command}`,
      );
    }
    assert.deepEqual(
      capabilities.api_capabilities["🤝 Meeting Bot"][0].actions,
      commands.map((command) => command.replaceAll("-", "_")),
    );
  });
});
