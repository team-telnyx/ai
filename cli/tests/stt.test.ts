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

if (cmd[0] === "speech-to-text" && cmd[1] === "retrieve-transcription") {
  console.log(JSON.stringify({ data: { transcription: "Hello, this is a test transcription.", language: "en" } }));
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
  it("stt passes --audio-url flag correctly", () => {
    const fake = setupFakeTelnyx();
    const output = runCli(["stt", "--audio-url", "https://example.com/audio.mp3", "--json"], fake.env);

    const data = JSON.parse(output);
    assert.equal(data.audio_url, "https://example.com/audio.mp3");
    assert.ok(data.transcription.length > 0);

    const calls = readLoggedArgs(fake.logPath);
    const sttCall = calls.find((a) => a.slice(0, 2).join(" ") === "speech-to-text retrieve-transcription");
    assert.ok(sttCall, "must call speech-to-text retrieve-transcription");
    assert.equal(sttCall![sttCall!.indexOf("--audio-url") + 1], "https://example.com/audio.mp3");
  });

  it("stt with --language and --model flags", () => {
    const fake = setupFakeTelnyx();
    runCli(["stt", "--audio-url", "https://example.com/audio.mp3", "--language", "es", "--model", "whisper-large", "--json"], fake.env);

    const calls = readLoggedArgs(fake.logPath);
    const sttCall = calls.find((a) => a.slice(0, 2).join(" ") === "speech-to-text retrieve-transcription");
    assert.ok(sttCall, "must call speech-to-text retrieve-transcription");
    assert.equal(sttCall![sttCall!.indexOf("--language") + 1], "es");
    assert.equal(sttCall![sttCall!.indexOf("--model") + 1], "whisper-large");
  });

  it("stt with --transcription-engine flag", () => {
    const fake = setupFakeTelnyx();
    runCli(["stt", "--audio-url", "https://example.com/audio.mp3", "--transcription-engine", "telnyx", "--json"], fake.env);

    const calls = readLoggedArgs(fake.logPath);
    const sttCall = calls.find((a) => a.slice(0, 2).join(" ") === "speech-to-text retrieve-transcription");
    assert.ok(sttCall!.includes("--transcription-engine"), "must include --transcription-engine");
    assert.equal(sttCall![sttCall!.indexOf("--transcription-engine") + 1], "telnyx");
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

    const calls = readLoggedArgs(fake.logPath);
    const providersCall = calls.find((a) => a.slice(0, 2).join(" ") === "speech-to-text list-providers");
    assert.ok(providersCall, "must call speech-to-text list-providers");
  });

  it("help text includes stt commands", () => {
    const fake = setupFakeTelnyx();
    const output = runCli(["help"], fake.env);
    assert.ok(output.includes("stt "), "help must list stt");
    assert.ok(output.includes("stt-providers"), "help must list stt-providers");
    assert.ok(output.includes("--audio-url"), "help must document --audio-url flag");
  });
});
