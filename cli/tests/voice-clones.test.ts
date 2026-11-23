/**
 * Mock-binary coverage for voice-clone lifecycle commands.
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
const cliBin = process.env.TELNYX_AGENT_TEST_ENTRYPOINT
  ?? join(cliRoot, "bin", "telnyx-agent.mjs");
const cliRuntimeArgs = process.env.TELNYX_AGENT_TEST_ENTRYPOINT ? ["--import", "tsx"] : [];

function setupFakeTelnyx(): { logPath: string; env: NodeJS.ProcessEnv } {
  const tempDir = mkdtempSync(join(tmpdir(), "telnyx-agent-voice-clones-"));
  const binDir = join(tempDir, "bin");
  const logPath = join(tempDir, "args.jsonl");
  mkdirSync(binDir, { recursive: true });

  const fakeTelnyx = join(binDir, "telnyx");
  writeFileSync(fakeTelnyx, `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
fs.appendFileSync(process.env.TELNYX_FAKE_ARGS_LOG, JSON.stringify(args) + "\\n");
function value(flag) { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : undefined; }
if (args[0] !== "voice-clones") process.exit(2);
if (args[1] === "list") {
  console.log(JSON.stringify({ data: [
    { id: "vc-1", name: "Ada", status: "active", provider: "telnyx" },
    { id: "vc-2", name: "Grace", status: "pending", provider: "resemble" }
  ], meta: { page_number: 2, page_size: 10, total_results: 2 } }));
} else if (args[1] === "create" || args[1] === "create-from-upload") {
  const request = JSON.parse(value(args[1] === "create" ? "--voice-clone-request" : "--voice-clone-upload-request"));
  console.log(JSON.stringify({ data: { id: args[1] === "create" ? "vc-created" : "vc-uploaded", name: request.name, status: "active" } }));
} else if (args[1] === "update") {
  console.log(JSON.stringify({ data: { id: value("--id"), name: value("--name"), gender: value("--gender"), language: value("--language") } }));
} else if (args[1] === "delete") {
  console.log(JSON.stringify({ data: { id: value("--id") } }));
} else if (args[1] === "download-sample") {
  fs.writeFileSync(value("--output"), "RIFF sample");
  console.log("sample saved");
} else {
  process.exit(2);
}
`);
  chmodSync(fakeTelnyx, 0o755);
  return {
    logPath,
    env: { ...process.env, TELNYX_CLI_PATH: fakeTelnyx, TELNYX_FAKE_ARGS_LOG: logPath },
  };
}

function runAgent(args: string[], env: NodeJS.ProcessEnv): string {
  return execFileSync(process.execPath, [...cliRuntimeArgs, cliBin, ...args], {
    cwd: cliRoot,
    encoding: "utf8",
    env,
    timeout: 30_000,
  });
}

function runAgentFailure(args: string[], env: NodeJS.ProcessEnv): { stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [...cliRuntimeArgs, cliBin, ...args], {
    cwd: cliRoot,
    encoding: "utf8",
    env,
    timeout: 30_000,
  });
  assert.notEqual(result.status, 0, `expected command to fail: ${args.join(" ")}`);
  return { stdout: result.stdout, stderr: result.stderr };
}

function loggedArgs(logPath: string): string[][] {
  if (!existsSync(logPath)) return [];
  const contents = readFileSync(logPath, "utf8");
  assert.ok(contents.endsWith("\n"), "fake binary must write a real newline after JSON.stringify(args)");
  assert.ok(!contents.endsWith("\n\n"), "fake binary must emit one JSONL newline per invocation");
  assert.equal(contents.includes("\\n"), false, "fake binary must not log a literal backslash-n");
  return contents.trimEnd().split("\n").map((line) => JSON.parse(line) as string[]);
}

function assertFlag(args: string[], flag: string, value: string): void {
  const index = args.indexOf(flag);
  assert.notEqual(index, -1, `expected ${flag} in ${args.join(" ")}`);
  assert.equal(args[index + 1], value);
}

describe("Voice-clone lifecycle commands", () => {
  it("lists clones using exact generated filters and raw output", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent([
      "list-voice-clones", "--filter-model-id", "Qwen3TTS", "--filter-name", "Ada",
      "--filter-provider", "telnyx", "--page-number", "2", "--page-size", "10",
      "--sort", "-created_at", "--max-items", "25", "--json",
    ], fake.env);

    const result = JSON.parse(output);
    assert.equal(result.count, 2);
    assert.equal(result.voice_clones[0].id, "vc-1");
    assert.deepEqual(result.meta, { page_number: 2, page_size: 10, total_results: 2 });
    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args.slice(0, 2), ["voice-clones", "list"]);
    assertFlag(args, "--filter-model-id", "Qwen3TTS");
    assertFlag(args, "--filter-name", "Ada");
    assertFlag(args, "--filter-provider", "telnyx");
    assertFlag(args, "--page-number", "2");
    assertFlag(args, "--page-size", "10");
    assertFlag(args, "--sort", "-created_at");
    assertFlag(args, "--max-items", "25");
    assertFlag(args, "--format", "raw");
  });

  it("creates and updates clones with the exact upstream request flags", () => {
    const createFake = setupFakeTelnyx();
    const create = runAgent([
      "create-voice-clone", "--voice-clone-request", '{"name":"Ada","voice_design_id":"vd-1"}', "--json",
    ], createFake.env);
    assert.equal(JSON.parse(create).voice_clone_id, "vc-created");
    const [createArgs] = loggedArgs(createFake.logPath);
    assert.deepEqual(createArgs, [
      "voice-clones", "create", "--voice-clone-request", '{"name":"Ada","voice_design_id":"vd-1"}', "--format", "json",
    ]);

    const updateFake = setupFakeTelnyx();
    const update = runAgent([
      "update-voice-clone", "--id", "vc-1", "--name", "Ada v2", "--gender", "female", "--language", "en", "--json",
    ], updateFake.env);
    assert.equal(JSON.parse(update).voice_clone.name, "Ada v2");
    assert.deepEqual(loggedArgs(updateFake.logPath), [[
      "voice-clones", "update", "--id", "vc-1", "--name", "Ada v2", "--gender", "female", "--language", "en", "--format", "json",
    ]]);
  });

  it("requires bare confirmation before delete and never forwards it", () => {
    const rejected = setupFakeTelnyx();
    const failure = runAgentFailure(["delete-voice-clone", "--id", "vc-1", "--json"], rejected.env);
    assert.match(failure.stdout, /--confirm is required/);
    assert.deepEqual(loggedArgs(rejected.logPath), []);

    const accepted = setupFakeTelnyx();
    const output = runAgent(["delete-voice-clone", "--id", "vc-1", "--confirm", "--json"], accepted.env);
    assert.deepEqual(JSON.parse(output), { voice_clone_id: "vc-1", deleted: true });
    const [args] = loggedArgs(accepted.logPath);
    assert.deepEqual(args, ["voice-clones", "delete", "--id", "vc-1", "--format", "json"]);
    assert.ok(!args.includes("--confirm"));
  });

  it("requires bare upload consent acknowledgement and never forwards it", () => {
    const rejected = setupFakeTelnyx();
    const request = '{"name":"Ada upload","audio":"base64-data"}';
    const failure = runAgentFailure([
      "create-voice-clone-from-upload", "--voice-clone-upload-request", request, "--json",
    ], rejected.env);
    assert.match(failure.stdout, /--acknowledge-voice-consent is required/);
    assert.deepEqual(loggedArgs(rejected.logPath), []);

    for (const value of ["true", "false"]) {
      const valued = setupFakeTelnyx();
      const valuedFailure = runAgentFailure([
        "create-voice-clone-from-upload", "--voice-clone-upload-request", request,
        "--acknowledge-voice-consent", value, "--json",
      ], valued.env);
      assert.match(valuedFailure.stdout, /--acknowledge-voice-consent is required/);
      assert.deepEqual(loggedArgs(valued.logPath), []);
    }

    const accepted = setupFakeTelnyx();
    const output = runAgent([
      "create-voice-clone-from-upload", "--voice-clone-upload-request", request,
      "--acknowledge-voice-consent", "--json",
    ], accepted.env);
    assert.equal(JSON.parse(output).voice_clone_id, "vc-uploaded");
    const [args] = loggedArgs(accepted.logPath);
    assert.deepEqual(args, [
      "voice-clones", "create-from-upload", "--voice-clone-upload-request", request, "--format", "json",
    ]);
    assert.ok(!args.includes("--acknowledge-voice-consent"));
  });

  it("downloads a sample to the requested file using upstream --output", () => {
    const fake = setupFakeTelnyx();
    const outputPath = join(dirname(fake.logPath), "sample.wav");
    const output = runAgent([
      "download-voice-clone-sample", "--id", "vc-1", "--output", outputPath, "--json",
    ], fake.env);
    assert.deepEqual(JSON.parse(output), { voice_clone_id: "vc-1", output: outputPath, downloaded: true });
    assert.equal(readFileSync(outputPath, "utf8"), "RIFF sample");
    assert.deepEqual(loggedArgs(fake.logPath), [[
      "voice-clones", "download-sample", "--id", "vc-1", "--output", outputPath, "--format", "raw",
    ]]);
  });

  it("validates malformed requests and local-only guards before invoking telnyx", () => {
    const cases: Array<{ args: string[]; expected: RegExp }> = [
      { args: ["create-voice-clone", "--json"], expected: /--voice-clone-request is required/ },
      { args: ["create-voice-clone", "--voice-clone-request", "[]", "--json"], expected: /must be a JSON object/ },
      { args: ["update-voice-clone", "--id", "vc-1", "--json"], expected: /at least one/ },
      { args: ["list-voice-clones", "--page-size", "0", "--json"], expected: /positive safe integer/ },
      { args: ["download-voice-clone-sample", "--id", "vc-1", "--output", "-", "--json"], expected: /file path/ },
    ];
    for (const testCase of cases) {
      const fake = setupFakeTelnyx();
      const failure = runAgentFailure(testCase.args, fake.env);
      assert.match(`${failure.stdout}${failure.stderr}`, testCase.expected);
      assert.deepEqual(loggedArgs(fake.logPath), []);
    }
  });

  it("advertises the complete lifecycle in help and capabilities", () => {
    const help = runAgent(["help"], process.env);
    const capabilities = JSON.parse(runAgent(["capabilities", "--json"], process.env));
    const commands = [
      "list-voice-clones", "create-voice-clone", "update-voice-clone", "delete-voice-clone",
      "create-voice-clone-from-upload", "download-voice-clone-sample",
    ];
    for (const command of commands) {
      assert.match(help, new RegExp(command));
      assert.ok(capabilities.composite_commands.some((entry: { name: string }) => entry.name === `telnyx-agent ${command}`));
    }
    const actions = capabilities.api_capabilities["🔊 Text-to-Speech"]
      .find((entry: { name: string }) => entry.name === "Voice Clones").actions;
    assert.deepEqual(actions, [
      "list_voice_clones", "create_voice_clone", "update_voice_clone", "delete_voice_clone",
      "create_voice_clone_from_upload", "download_voice_clone_sample",
    ]);
    assert.match(help, /delete-voice-clone.*requires --confirm/);
    assert.match(help, /create-voice-clone-from-upload.*requires --acknowledge-voice-consent/);
  });
});
