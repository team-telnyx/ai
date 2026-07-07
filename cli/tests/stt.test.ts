/**
 * Tests for STT commands — verify correct Go CLI subcommand invocations
 * and flag passing without making real API calls.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, chmodSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliRoot = join(__dirname, "..");
const cliBin = join(cliRoot, "bin", "telnyx-agent.ts");

function setupFakeTelnyx(): { fakeTelnyx: string; logPath: string; env: NodeJS.ProcessEnv } {
  const tempDir = mkdtempSync(join(tmpdir(), "telnyx-agent-stt-"));
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

const cmd = args.filter(a => a !== "--format" && a !== "json");

if (cmd[0] === "ai:audio" && cmd[1] === "transcribe") {
  if (cmd.includes("verbose_json")) {
    console.log(JSON.stringify({ text: "Hello, this is a test transcription.", duration: 2.5, segments: [{ id: 0, start: 0, end: 2.5, text: "Hello, this is a test transcription." }] }));
  } else {
    console.log(JSON.stringify({ text: "Hello, this is a test transcription." }));
  }
} else if (cmd[0] === "speech-to-text" && cmd[1] === "list-providers") {
  console.log(JSON.stringify({ data: [{ provider: "telnyx", service_type: "batch" }, { provider: "aws", service_type: "batch" }] }));
} else {
  console.log(JSON.stringify({ data: {} }));
}
`,
  );
  chmodSync(fakeTelnyx, 0o755);

  return {
    fakeTelnyx,
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

function runCli(args: string[], env: NodeJS.ProcessEnv): string {
  return execFileSync("npx", ["tsx", cliBin, ...args], {
    cwd: cliRoot,
    encoding: "utf8",
    env,
    timeout: 30000,
  });
}

describe("STT commands", () => {
  it("stt routes to ai:audio transcribe with --file-url and default model", () => {
    const fake = setupFakeTelnyx();
    const output = runCli(["stt", "--audio-url", "https://example.com/audio.mp3", "--json"], fake.env);

    const data = JSON.parse(output);
    assert.equal(data.audio_url, "https://example.com/audio.mp3");
    assert.ok(data.transcription.length > 0);

    const calls = readLoggedArgs(fake.logPath);
    const sttCall = calls.find((a) => a.slice(0, 2).join(" ") === "ai:audio transcribe");
    assert.ok(sttCall, "must call ai:audio transcribe");
    assert.equal(sttCall![sttCall!.indexOf("--file-url") + 1], "https://example.com/audio.mp3");
    // --model is required by the Go CLI, so the wrapper must always pass it
    assert.equal(sttCall![sttCall!.indexOf("--model") + 1], "distil-whisper/distil-large-v2");
    // the default model rejects --language, so it must not be sent unless requested
    assert.ok(!sttCall!.includes("--language"), "must not pass --language unless explicitly provided");
    assert.ok(!sttCall!.includes("--audio-url"), "must not pass the unsupported --audio-url flag through");
  });

  it("stt with --language and --model flags", () => {
    const fake = setupFakeTelnyx();
    runCli(["stt", "--audio-url", "https://example.com/audio.mp3", "--language", "es", "--model", "openai/whisper-large-v3-turbo", "--json"], fake.env);

    const calls = readLoggedArgs(fake.logPath);
    const sttCall = calls.find((a) => a.slice(0, 2).join(" ") === "ai:audio transcribe");
    assert.ok(sttCall, "must call ai:audio transcribe");
    assert.equal(sttCall![sttCall!.indexOf("--language") + 1], "es");
    assert.equal(sttCall![sttCall!.indexOf("--model") + 1], "openai/whisper-large-v3-turbo");
  });

  it("stt with --response-format flag", () => {
    const fake = setupFakeTelnyx();
    runCli(["stt", "--audio-url", "https://example.com/audio.mp3", "--response-format", "verbose_json", "--json"], fake.env);

    const calls = readLoggedArgs(fake.logPath);
    const sttCall = calls.find((a) => a.slice(0, 2).join(" ") === "ai:audio transcribe");
    assert.ok(sttCall!.includes("--response-format"), "must include --response-format");
    assert.equal(sttCall![sttCall!.indexOf("--response-format") + 1], "verbose_json");
  });

  it("stt preserves verbose response fields for --response-format verbose_json", () => {
    const fake = setupFakeTelnyx();
    const out = runCli(
      ["stt", "--audio-url", "https://example.com/audio.mp3", "--response-format", "verbose_json", "--json"],
      fake.env,
    );
    const data = JSON.parse(out);
    assert.equal(data.response_format, "verbose_json");
    assert.ok(data.response, "verbose response must be included");
    assert.equal(data.response.segments.length, 1, "segments from the API must be preserved");
    assert.equal(data.response.duration, 2.5);
    assert.equal(data.transcription, "Hello, this is a test transcription.");
  });

  it("stt omits raw response for the default response format", () => {
    const fake = setupFakeTelnyx();
    const out = runCli(["stt", "--audio-url", "https://example.com/audio.mp3", "--json"], fake.env);
    const data = JSON.parse(out);
    assert.equal(data.response, undefined, "default format should keep the flat shape");
    assert.equal(data.response_format, undefined);
  });

  it("stt fails without --audio-url", () => {
    const fake = setupFakeTelnyx();
    try {
      runCli(["stt", "--json"], fake.env);
      assert.fail("should have exited with error");
    } catch (err: any) {
      assert.ok(err.status !== 0, "non-zero exit expected");
    }
  });

  it("stt-providers calls speech-to-text list-providers", () => {
    const fake = setupFakeTelnyx();
    const output = runCli(["stt-providers", "--json"], fake.env);

    const data = JSON.parse(output);
    assert.equal(data.count, 2);

    const calls = readLoggedArgs(fake.logPath);
    const providersCall = calls.find((a) => a.slice(0, 2).join(" ") === "speech-to-text list-providers");
    assert.ok(providersCall, "must call speech-to-text list-providers");
  });

  it("stt-providers passes --provider and --service-type filters", () => {
    const fake = setupFakeTelnyx();
    runCli(["stt-providers", "--provider", "telnyx", "--service-type", "transcription", "--json"], fake.env);

    const calls = readLoggedArgs(fake.logPath);
    const providersCall = calls.find((a) => a.slice(0, 2).join(" ") === "speech-to-text list-providers");
    assert.ok(providersCall, "must call speech-to-text list-providers");
    assert.equal(providersCall![providersCall!.indexOf("--provider") + 1], "telnyx");
    assert.equal(providersCall![providersCall!.indexOf("--service-type") + 1], "transcription");
  });

  it("help text includes stt commands", () => {
    const fake = setupFakeTelnyx();
    const output = runCli(["help"], fake.env);
    assert.ok(output.includes("stt "), "help must list stt");
    assert.ok(output.includes("stt-providers"), "help must list stt-providers");
    assert.ok(output.includes("--audio-url"), "help must document --audio-url flag");
  });
});
