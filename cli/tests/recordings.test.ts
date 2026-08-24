/**
 * Mock-binary coverage for read-only post-call recording discovery.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliRoot = join(__dirname, "..");
const cliBin = join(cliRoot, "bin", "telnyx-agent.ts");

function setupFakeTelnyx(): { logPath: string; env: NodeJS.ProcessEnv } {
  const tempDir = mkdtempSync(join(tmpdir(), "telnyx-agent-recordings-"));
  const binDir = join(tempDir, "bin");
  const logPath = join(tempDir, "args.jsonl");
  mkdirSync(binDir, { recursive: true });

  const fakeTelnyx = join(binDir, "telnyx");
  writeFileSync(
    fakeTelnyx,
    `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
fs.appendFileSync(process.env.TELNYX_FAKE_ARGS_LOG, JSON.stringify(args) + "\\n");
function flag(name) { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : undefined; }

if (args[0] === "recordings" && args[1] === "list") {
  console.log(JSON.stringify({
    data: [
      { id: "rec-1", status: "completed", from: "+131****0000", to: "+131****0001", created_at: "2026-08-24T10:00:00Z", duration_millis: 45000 },
      { id: "rec-2", status: "completed", from: "+131****0002", to: "+131****0003", created_at: "2026-08-24T11:00:00Z", duration_millis: 30000 }
    ],
    meta: { page_number: 2, page_size: 25, total_results: 2 }
  }));
} else if (args[0] === "recordings" && args[1] === "retrieve") {
  console.log(JSON.stringify({ data: {
    id: flag("--recording-id"),
    status: "completed",
    from: "+131****0000",
    to: "+131****0001",
    created_at: "2026-08-24T10:00:00Z",
    download_urls: { mp3: "https://example.com/recording.mp3" }
  } }));
} else if (args[0] === "recording-transcriptions" && args[1] === "list") {
  console.log(JSON.stringify({
    data: [
      { id: "trans-1", recording_id: "rec-1", status: "completed", created_at: "2026-08-24T10:01:00Z" },
      { id: "trans-2", recording_id: "rec-1", status: "completed", created_at: "2026-08-24T10:02:00Z" }
    ],
    meta: { page_number: 3, page_size: 10, total_results: 2 }
  }));
} else if (args[0] === "recording-transcriptions" && args[1] === "retrieve") {
  console.log(JSON.stringify({ data: {
    id: flag("--recording-transcription-id"),
    recording_id: "rec-1",
    status: "completed",
    created_at: "2026-08-24T10:01:00Z",
    transcription_data: { transcript: "Hello from the call" }
  } }));
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
      TELNYX_API_KEY: "test-key",
      TELNYX_CLI_PATH: fakeTelnyx,
      TELNYX_FAKE_ARGS_LOG: logPath,
      TELNYX_FRICTION_ENABLED: "false",
      TELNYX_TELEMETRY_ENDPOINT: "",
    },
  };
}

function runAgent(args: string[], env: NodeJS.ProcessEnv = process.env): string {
  return execFileSync(process.execPath, ["--import", "tsx", cliBin, ...args], {
    cwd: cliRoot,
    encoding: "utf8",
    env,
    timeout: 30_000,
  });
}

function runFailure(args: string[], env: NodeJS.ProcessEnv): { stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, ["--import", "tsx", cliBin, ...args], {
    cwd: cliRoot,
    encoding: "utf8",
    env,
    timeout: 30_000,
  });
  assert.notEqual(result.status, 0, `expected command to fail: ${args.join(" ")}`);
  assert.equal(result.error, undefined);
  return { stdout: result.stdout, stderr: result.stderr };
}

function loggedArgs(logPath: string): string[][] {
  if (!existsSync(logPath)) return [];
  const contents = readFileSync(logPath, "utf8");
  assert.ok(contents.endsWith("\n"), "fake binary should terminate its JSON record with one newline");
  assert.ok(!contents.endsWith("\n\n"), "fake binary should not write a blank JSONL record");
  return contents.trimEnd().split("\n").map((line) => JSON.parse(line) as string[]);
}

function assertFlag(args: string[], flag: string, value: string): void {
  const index = args.indexOf(flag);
  assert.notEqual(index, -1, `expected ${flag} in ${args.join(" ")}`);
  assert.equal(args[index + 1], value);
}

describe("Post-call recording discovery commands", () => {
  it("lists call recordings with exact generated filters and pagination flags", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent([
      "list-call-recordings",
      "--call-control-id", "v3:call-control",
      "--call-leg-id", "leg-1",
      "--call-session-id", "session-1",
      "--conference-id", "conf-1",
      "--conference-region", "us",
      "--connection-id", "conn-1",
      "--created-at", '{"gte":"2026-08-01T00:00:00Z","lte":"2026-08-24T23:59:59Z"}',
      "--end-time", '{"gte":"2026-08-01T00:00:00Z"}',
      "--from", "+131****0000",
      "--sip-call-id", "sip-call-1",
      "--start-time", '{"lte":"2026-08-24T23:59:59Z"}',
      "--to", "+131****0001",
      "--page-number", "2",
      "--page-size", "25",
      "--max-items", "1",
      "--json",
    ], fake.env);

    assert.deepEqual(JSON.parse(output), {
      count: 1,
      recordings: [{
        id: "rec-1",
        status: "completed",
        from: "+131****0000",
        to: "+131****0001",
        created_at: "2026-08-24T10:00:00Z",
        duration_millis: 45000,
      }],
      meta: { page_number: 2, page_size: 25, total_results: 2 },
    });

    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args.slice(0, 2), ["recordings", "list"]);
    for (const [flag, value] of [
      ["--filter.call-control-id", "v3:call-control"],
      ["--filter.call-leg-id", "leg-1"],
      ["--filter.call-session-id", "session-1"],
      ["--filter.conference-id", "conf-1"],
      ["--filter.conference-region", "us"],
      ["--filter.connection-id", "conn-1"],
      ["--filter.created-at", '{"gte":"2026-08-01T00:00:00Z","lte":"2026-08-24T23:59:59Z"}'],
      ["--filter.end-time", '{"gte":"2026-08-01T00:00:00Z"}'],
      ["--filter.from", "+131****0000"],
      ["--filter.sip-call-id", "sip-call-1"],
      ["--filter.start-time", '{"lte":"2026-08-24T23:59:59Z"}'],
      ["--filter.to", "+131****0001"],
      ["--page-number", "2"],
      ["--page-size", "25"],
      ["--format", "raw"],
    ]) assertFlag(args, flag, value);
    assert.equal(args.includes("--max-items"), false, "wrapper applies max-items to the stable raw envelope");
    assert.equal(args.includes("--sort"), false, "recordings list has no upstream sort flag");
    assert.equal(
      readFileSync(fake.logPath, "utf8"),
      `${JSON.stringify(args)}\n`,
      "fake invocation must be exact newline-terminated JSONL",
    );
  });

  it("retrieves a call recording under stable JSON keys", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent(["get-call-recording", "--id", "rec-1", "--json"], fake.env);
    const result = JSON.parse(output);

    assert.equal(result.recording_id, "rec-1");
    assert.equal(result.recording.download_urls.mp3, "https://example.com/recording.mp3");
    assert.deepEqual(loggedArgs(fake.logPath), [[
      "recordings", "retrieve", "--recording-id", "rec-1", "--format", "json",
    ]]);
  });

  it("lists recording transcriptions with exact generated filters and pagination flags", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent([
      "list-recording-transcriptions",
      "--recording-id", "rec-1",
      "--created-at", '{"gte":"2026-08-24T00:00:00Z"}',
      "--page-number", "3",
      "--page-size", "10",
      "--max-items", "1",
      "--json",
    ], fake.env);

    assert.deepEqual(JSON.parse(output), {
      count: 1,
      recording_transcriptions: [{
        id: "trans-1",
        recording_id: "rec-1",
        status: "completed",
        created_at: "2026-08-24T10:01:00Z",
      }],
      meta: { page_number: 3, page_size: 10, total_results: 2 },
    });

    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args.slice(0, 2), ["recording-transcriptions", "list"]);
    assertFlag(args, "--filter.recording-id", "rec-1");
    assertFlag(args, "--filter.created-at", '{"gte":"2026-08-24T00:00:00Z"}');
    assertFlag(args, "--page-number", "3");
    assertFlag(args, "--page-size", "10");
    assertFlag(args, "--format", "raw");
    assert.equal(args.includes("--max-items"), false);
    assert.equal(args.includes("--sort"), false, "transcription list has no upstream sort flag");
  });

  it("retrieves a recording transcription under stable JSON keys", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent([
      "get-recording-transcription", "--id", "trans-1", "--json",
    ], fake.env);
    const result = JSON.parse(output);

    assert.equal(result.recording_transcription_id, "trans-1");
    assert.equal(result.recording_transcription.recording_id, "rec-1");
    assert.equal(result.recording_transcription.transcription_data.transcript, "Hello from the call");
    assert.deepEqual(loggedArgs(fake.logPath), [[
      "recording-transcriptions", "retrieve",
      "--recording-transcription-id", "trans-1",
      "--format", "json",
    ]]);
  });

  it("prints useful human summaries for all four commands", () => {
    const fake = setupFakeTelnyx();
    const recordings = runAgent(["list-call-recordings"], fake.env);
    const recording = runAgent(["get-call-recording", "--id", "rec-1"], fake.env);
    const transcriptions = runAgent(["list-recording-transcriptions"], fake.env);
    const transcription = runAgent(["get-recording-transcription", "--id", "trans-1"], fake.env);

    assert.match(recordings, /Call recordings retrieved!/);
    assert.match(recordings, /rec-1.*completed.*\+131\*{4}0000.*\+131\*{4}0001/);
    assert.match(recording, /Recording ID\s+rec-1/);
    assert.match(transcriptions, /trans-1.*rec-1.*completed/);
    assert.match(transcription, /Transcription ID\s+trans-1/);
    assert.match(transcription, /Recording ID\s+rec-1/);
  });

  it("validates IDs, JSON range filters, and pagination before invoking telnyx", () => {
    for (const args of [
      ["get-call-recording", "--json"],
      ["get-recording-transcription", "--json"],
      ["list-call-recordings", "--created-at", "not-json", "--json"],
      ["list-call-recordings", "--start-time", "[]", "--json"],
      ["list-recording-transcriptions", "--created-at", '"not-an-object"', "--json"],
      ["list-call-recordings", "--page-number", "0", "--json"],
      ["list-call-recordings", "--page-size", "9007199254740992", "--json"],
      ["list-recording-transcriptions", "--max-items", "-2", "--json"],
      ["list-recording-transcriptions", "--max-items", "Infinity", "--json"],
    ]) {
      const fake = setupFakeTelnyx();
      const failure = runFailure(args, fake.env);
      assert.match(failure.stdout, /"error"/);
      assert.deepEqual(loggedArgs(fake.logPath), [], args.join(" "));
    }
  });

  it("advertises recording discovery in help and capabilities", () => {
    const help = runAgent(["help"]);
    const capabilities = JSON.parse(runAgent(["capabilities", "--json"]));
    const commands = [
      "list-call-recordings",
      "get-call-recording",
      "list-recording-transcriptions",
      "get-recording-transcription",
    ];

    for (const command of commands) {
      assert.match(help, new RegExp(command));
      assert.ok(
        capabilities.composite_commands.some((entry: { name: string }) => entry.name === `telnyx-agent ${command}`),
        `capabilities should advertise ${command}`,
      );
    }

    const voiceActions = capabilities.api_capabilities["📞 Voice"][0].actions;
    for (const action of [
      "list_call_recordings",
      "get_call_recording",
      "list_recording_transcriptions",
      "get_recording_transcription",
    ]) {
      assert.ok(voiceActions.includes(action), `Voice capabilities should include ${action}`);
    }
    assert.match(help, /--recording-id\s+Filter transcriptions/);
    assert.match(help, /--created-at <json>/);
  });
});
