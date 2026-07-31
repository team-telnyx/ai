/**
 * Tests for the `telnyx-agent tts` and `tts-voices` commands.
 *
 * `tts` (generate-speech) uses a direct REST POST /text-to-speech/speech
 * (AIF-331 fix — Go CLI was not passing --voice through to the API body).
 * Tests use a mock HTTP server to verify the request payload and response.
 *
 * `tts-voices` (list-voices) still shells out to the Go CLI
 * `text-to-speech list-voices` subcommand. Tests use a fake binary.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, chmodSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer, type Server, type IncomingMessage, type ServerResponse } from "node:http";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliRoot = join(__dirname, "..");
const cliBin = join(cliRoot, "bin", "telnyx-agent.ts");

// ---------------------------------------------------------------------------
// Mock HTTP server for tts (generate-speech) REST tests
// ---------------------------------------------------------------------------

interface CapturedRequest {
  method: string;
  path: string;
  body: Record<string, unknown> | null;
}

let mockServer: Server;
let mockPort: number;
let lastRequest: CapturedRequest | null = null;

function startMockServer(): Promise<void> {
  return new Promise((resolve) => {
    mockServer = createServer((req: IncomingMessage, res: ServerResponse) => {
      let body = "";
      req.on("data", (chunk: Buffer) => (body += chunk.toString()));
      req.on("end", () => {
        let parsedBody: Record<string, unknown> | null = null;
        try {
          parsedBody = body ? JSON.parse(body) : null;
        } catch { /* ignore parse errors */ }
        lastRequest = { method: req.method ?? "", path: req.url ?? "", body: parsedBody };

        if (req.method === "POST" && req.url === "/v2/text-to-speech/speech") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            base64_audio: "SGVsbG8gYXVkaW8=",
          }));
          return;
        }

        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ errors: [{ code: "10005", detail: "Not found" }] }));
      });
    });
    mockServer.listen(0, "127.0.0.1", () => {
      const addr = mockServer.address();
      mockPort = typeof addr === "object" && addr ? addr.port : 0;
      resolve();
    });
  });
}

function stopMockServer(): Promise<void> {
  return new Promise((resolve) => {
    mockServer.close(() => resolve());
  });
}

function capturedRequest(): CapturedRequest {
  assert.ok(lastRequest, "expected the mock server to have received a request");
  return lastRequest as CapturedRequest;
}

// Async spawn for tts tests (mock server needs event loop)
function runTtsAsync(args: string[]): Promise<{ status: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn("npx", ["tsx", cliBin, "tts", ...args], {
      cwd: cliRoot,
      env: {
        ...process.env,
        TELNYX_API_KEY: "test-key-1234",
        TELNYX_API_BASE_URL: `http://127.0.0.1:${mockPort}/v2`,
      },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (c: Buffer) => (stdout += c.toString()));
    child.stderr.on("data", (c: Buffer) => (stderr += c.toString()));
    child.on("close", (code) => resolve({ status: code ?? -1, stdout, stderr }));
  });
}

// ---------------------------------------------------------------------------
// Fake Go CLI binary for tts-voices (list-voices) tests
// ---------------------------------------------------------------------------

function setupFakeTelnyx(): { fakeTelnyx: string; logPath: string; env: NodeJS.ProcessEnv } {
  const tempDir = mkdtempSync(join(tmpdir(), "telnyx-agent-tts-voices-"));
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

function flagValue(args, flag) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
}

const command = args.filter((a) => a !== "--format" && a !== "json");

if (command[0] === "text-to-speech" && command[1] === "list-voices") {
  const provider = flagValue(command, "--provider") || "telnyx";
  console.log(JSON.stringify({ voices: [
    { voice_id: "voice-1", name: "Voice One", language: "en-US", gender: "female", provider },
    { voice_id: "voice-2", name: "Voice Two", language: "en-GB", gender: "male", provider },
  ] }));
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
      PATH: `${binDir}:${process.env.PATH}`,
      TELNYX_CLI_PATH: fakeTelnyx,
      TELNYX_FAKE_ARGS_LOG: logPath,
    },
  };
}

function readLoggedArgs(logPath: string): string[][] {
  return readFileSync(logPath, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function assertFlagValue(args: string[], flag: string, value: string): void {
  const index = args.indexOf(flag);
  assert.notEqual(index, -1, `expected ${flag} in ${args.join(" ")}`);
  assert.equal(args[index + 1], value, `expected ${flag} ${value} in ${args.join(" ")}`);
}

function assertNoFlag(args: string[], flag: string): void {
  assert.equal(args.indexOf(flag), -1, `did not expect ${flag} in ${args.join(" ")}`);
}

function runCliSync(args: string[], env: NodeJS.ProcessEnv): { stdout: string; status: number } {
  try {
    const stdout = execFileSync("npx", ["tsx", cliBin, ...args], {
      cwd: cliRoot,
      encoding: "utf8",
      env,
      timeout: 30000,
    });
    return { stdout, status: 0 };
  } catch (err: any) {
    return { stdout: err.stdout?.toString() ?? "", status: err.status ?? 1 };
  }
}

// ---------------------------------------------------------------------------
// tts (generate-speech) — REST-based tests (AIF-331)
// ---------------------------------------------------------------------------

describe("tts (text-to-speech) command — REST (AIF-331)", () => {
  before(async () => {
    await startMockServer();
  });

  after(async () => {
    await stopMockServer();
  });

  it("POSTs to /text-to-speech/speech and returns base64 audio", async () => {
    lastRequest = null;
    const r = await runTtsAsync(["--text", "Hello world", "--voice", "Telnyx.Bayan.Amanda", "--json"]);
    assert.equal(r.status, 0, `exit 0 expected, got ${r.status}: ${r.stderr}`);
    const req = capturedRequest();
    assert.equal(req.method, "POST");
    assert.equal(req.path, "/v2/text-to-speech/speech");
    const data = JSON.parse(r.stdout);
    assert.equal(data.text, "Hello world");
    assert.equal(data.voice, "Telnyx.Bayan.Amanda");
    assert.equal(data.output_type, "base64_output");
    assert.equal(data.audio_data, "SGVsbG8gYXVkaW8=");
    assert.equal(data.has_audio_data, true);
  });

  it("includes voice in the request body when provided", async () => {
    lastRequest = null;
    await runTtsAsync(["--text", "Hello", "--voice", "Amy", "--provider", "aws", "--json"]);
    const body = capturedRequest().body;
    assert.ok(body);
    assert.equal(body.voice, "Amy");
    assert.equal(body.text, "Hello");
    assert.equal(body.provider, "aws");
  });

  it("includes output_type, language, provider, text_type in the request body", async () => {
    lastRequest = null;
    await runTtsAsync(["--text", "Hello", "--voice", "Amy", "--language", "fr", "--provider", "aws", "--text-type", "ssml", "--json"]);
    const body = capturedRequest().body;
    assert.ok(body);
    assert.equal(body.output_type, "base64_output");
    assert.equal(body.language, "fr");
    assert.equal(body.provider, "aws");
    assert.equal(body.text_type, "ssml");
  });

  it("accepts the xai provider", async () => {
    lastRequest = null;
    const r = await runTtsAsync(["--text", "Hello", "--voice", "xai-voice", "--provider", "xai", "--json"]);
    assert.equal(r.status, 0, `expected exit 0, got ${r.status}`);
    const data = JSON.parse(r.stdout);
    assert.equal(data.provider, "xai");
  });

  it("maps the friendly base64 alias to the base64_output API enum", async () => {
    lastRequest = null;
    const r = await runTtsAsync(["--text", "Hello", "--voice", "Amy", "--output-type", "base64", "--json"]);
    assert.equal(r.status, 0);
    const data = JSON.parse(r.stdout);
    assert.equal(data.output_type, "base64_output");
    const body = capturedRequest().body;
    assert.ok(body);
    assert.equal(body!.output_type, "base64_output");
  });

  it("includes disable_cache in the request body when --disable-cache is set", async () => {
    lastRequest = null;
    await runTtsAsync(["--text", "Hello", "--voice", "Amy", "--disable-cache", "--json"]);
    const body = capturedRequest().body;
    assert.ok(body);
    assert.equal(body!.disable_cache, true);
  });

  it("omits disable_cache when --disable-cache is not set", async () => {
    lastRequest = null;
    await runTtsAsync(["--text", "Hello", "--voice", "Amy", "--json"]);
    const body = capturedRequest().body;
    assert.ok(body);
    assert.equal(body!.disable_cache, undefined);
  });

  it("rejects unsupported output types without calling the API", async () => {
    lastRequest = null;
    for (const bad of ["url", "binary_output"]) {
      const r = await runTtsAsync(["--text", "Hello", "--voice", "Amy", "--output-type", bad, "--json"]);
      assert.notEqual(r.status, 0, `expected non-zero exit for --output-type ${bad}`);
    }
    assert.equal(lastRequest, null, "expected no API calls");
  });

  it("fails when --text is not provided", async () => {
    lastRequest = null;
    const r = await runTtsAsync(["--voice", "Amy", "--json"]);
    assert.notEqual(r.status, 0, "expected non-zero exit when --text is missing");
    assert.equal(lastRequest, null, "expected no API calls");
    if (r.stdout.trim()) {
      const data = JSON.parse(r.stdout);
      assert.ok(data.error, "expected an error field in JSON output");
    }
  });

  it("rejects an invalid --provider", async () => {
    lastRequest = null;
    const r = await runTtsAsync(["--text", "Hello", "--voice", "Amy", "--provider", "nope", "--json"]);
    assert.notEqual(r.status, 0, "expected non-zero exit for an unknown provider");
    assert.equal(lastRequest, null, "expected no API calls");
  });

  it("rejects elevenlabs (Decision #2: not in the live provider set)", async () => {
    lastRequest = null;
    const r = await runTtsAsync(["--text", "Hello", "--voice", "Amy", "--provider", "elevenlabs", "--json"]);
    assert.notEqual(r.status, 0, "elevenlabs is no longer a valid provider");
    assert.equal(lastRequest, null, "expected no API calls");
  });

  it("accepts a live-set provider that used to be missing (inworld)", async () => {
    lastRequest = null;
    const r = await runTtsAsync(["--text", "Hello", "--voice", "iw-voice", "--provider", "inworld", "--json"]);
    assert.equal(r.status, 0, `expected exit 0 for inworld, got ${r.status}`);
    const data = JSON.parse(r.stdout);
    assert.equal(data.provider, "inworld");
  });

  it("lists the tts command in the help text", () => {
    const { stdout, status } = runCliSync(["help"], { ...process.env });
    assert.equal(status, 0);
    assert.match(stdout, /tts\b/);
    assert.match(stdout, /--text/);
    assert.match(stdout, /--output-type/);
    assert.match(stdout, /--provider/);
  });
});

// ---------------------------------------------------------------------------
// tts-voices (list-voices) — Go CLI-based tests (unchanged)
// ---------------------------------------------------------------------------

describe("tts-voices (list-voices) command — Go CLI", () => {
  it("tts-voices calls text-to-speech list-voices and returns the voice list", () => {
    const fake = setupFakeTelnyx();
    const { stdout, status } = runCliSync(["tts-voices", "--json"], fake.env);

    assert.equal(status, 0, `expected exit 0, got ${status}`);
    const data = JSON.parse(stdout);
    assert.equal(data.count, 2);
    assert.ok(Array.isArray(data.voices));
    assert.equal(data.voices[0].voice_id, "voice-1");

    const calls = readLoggedArgs(fake.logPath);
    const voicesCall = calls.find((a) => a.slice(0, 2).join(" ") === "text-to-speech list-voices");
    assert.ok(voicesCall, "expected a text-to-speech list-voices call");
    assertNoFlag(voicesCall, "--provider");
  });

  it("tts-voices forwards the --provider flag when supplied", () => {
    const fake = setupFakeTelnyx();
    const { stdout, status } = runCliSync(["tts-voices", "--provider", "aws", "--json"], fake.env);

    assert.equal(status, 0);
    const data = JSON.parse(stdout);
    assert.equal(data.provider, "aws");
    assert.equal(data.voices[0].provider, "aws");

    const voicesCall = readLoggedArgs(fake.logPath).find(
      (a) => a.slice(0, 2).join(" ") === "text-to-speech list-voices",
    );
    assert.ok(voicesCall);
    assertFlagValue(voicesCall, "--provider", "aws");
  });

  it("tts-voices forwards --api-key to the Go CLI for provider voice lists", () => {
    const fake = setupFakeTelnyx();
    const { stdout, status } = runCliSync(
      ["tts-voices", "--provider", "inworld", "--api-key", "sk-provider-key", "--json"],
      fake.env,
    );

    assert.equal(status, 0, `expected exit 0, got ${status}`);
    const data = JSON.parse(stdout);
    assert.equal(data.provider, "inworld");

    const voicesCall = readLoggedArgs(fake.logPath).find(
      (a) => a.slice(0, 2).join(" ") === "text-to-speech list-voices",
    );
    assert.ok(voicesCall);
    assertFlagValue(voicesCall, "--provider", "inworld");
    assertFlagValue(voicesCall, "--api-key", "sk-provider-key");
  });

  it("tts-voices omits --api-key when not provided", () => {
    const fake = setupFakeTelnyx();
    runCliSync(["tts-voices", "--json"], fake.env);
    const voicesCall = readLoggedArgs(fake.logPath).find(
      (a) => a.slice(0, 2).join(" ") === "text-to-speech list-voices",
    );
    assert.ok(voicesCall);
    assertNoFlag(voicesCall, "--api-key");
  });

  it("tts-voices accepts the xai provider", () => {
    const fake = setupFakeTelnyx();
    const { stdout, status } = runCliSync(["tts-voices", "--provider", "xai", "--json"], fake.env);

    assert.equal(status, 0, `expected exit 0, got ${status}`);
    const data = JSON.parse(stdout);
    assert.equal(data.provider, "xai");

    const voicesCall = readLoggedArgs(fake.logPath).find(
      (a) => a.slice(0, 2).join(" ") === "text-to-speech list-voices",
    );
    assert.ok(voicesCall);
    assertFlagValue(voicesCall, "--provider", "xai");
  });

  it("tts-voices rejects unknown providers without invoking the telnyx CLI", () => {
    const fake = setupFakeTelnyx();
    const { status } = runCliSync(["tts-voices", "--provider", "nope", "--json"], fake.env);

    assert.notEqual(status, 0, "expected non-zero exit for an unknown provider");
    if (existsSync(fake.logPath)) {
      assert.equal(readLoggedArgs(fake.logPath).length, 0, "expected no telnyx CLI invocations");
    }
  });

  it("lists the tts-voices command in the help text", () => {
    const { stdout, status } = runCliSync(["help"], { ...process.env });
    assert.equal(status, 0);
    assert.match(stdout, /tts-voices\b/);
  });
});
