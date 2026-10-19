/** Mock-binary coverage for Verify profile lifecycle/configuration actions. */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliRoot = join(__dirname, "..");
const cliBin = process.env.TELNYX_AGENT_TEST_ENTRYPOINT ?? join(cliRoot, "bin", "telnyx-agent.mjs");
const cliRuntimeArgs = process.env.TELNYX_AGENT_TEST_ENTRYPOINT ? ["--import", "tsx"] : [];

type Fake = { logPath: string; env: NodeJS.ProcessEnv };

function setupFakeTelnyx(): Fake {
  const tempDir = mkdtempSync(join(tmpdir(), "telnyx-agent-verify-profile-"));
  const binDir = join(tempDir, "bin");
  const logPath = join(tempDir, "args.jsonl");
  const fakeTelnyx = join(binDir, "telnyx");
  mkdirSync(binDir, { recursive: true });
  writeFileSync(fakeTelnyx, `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
fs.appendFileSync(process.env.TELNYX_FAKE_ARGS_LOG, JSON.stringify(args) + "\\n");
function flag(name) { const index = args.indexOf(name); return index < 0 ? undefined : args[index + 1]; }
const action = args[1];
if (args[0] !== "verify-profiles") process.exit(2);
if (action === "retrieve") {
  console.log(JSON.stringify({ data: { id: flag("--verify-profile-id"), name: "Production Verify", webhook_url: "https://example.com/verify" } }));
} else if (action === "list") {
  console.log(JSON.stringify({ data: [
    { id: "vp-1", name: "Production Verify" }, { id: "vp-2", name: "Staging Verify" }
  ], meta: { page_number: Number(flag("--page-number") || 1), page_size: Number(flag("--page-size") || 25), total_results: 2 } }));
} else if (action === "update") {
  console.log(JSON.stringify({ data: {
    id: flag("--verify-profile-id"), name: flag("--name") || "Production Verify",
    sms: JSON.parse(flag("--sms") || "{}"), call: JSON.parse(flag("--call") || "{}"),
    whatsapp: JSON.parse(flag("--whatsapp") || "{}"), webhook_url: flag("--webhook-url")
  } }));
} else if (action === "delete") {
  console.log(JSON.stringify({ data: { id: flag("--verify-profile-id") } }));
} else process.exit(2);
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
  assert.ok(contents.endsWith("\n"), "fake binary should terminate each JSON record with an actual newline");
  assert.ok(!contents.endsWith("\n\n"), "fake binary should not append a blank JSONL record");
  assert.ok(!contents.includes("\\n"), "fake binary must not write a literal backslash-n");
  return contents.trimEnd().split("\n").map((line) => JSON.parse(line) as string[]);
}

describe("verify-profile lifecycle command", () => {
  it("retrieves a profile with either supported ID alias and exact generated argv", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent(["verify-profile", "--action", "retrieve", "--id", "vp-1", "--json"], fake.env);

    assert.deepEqual(JSON.parse(output), {
      verify_profile_id: "vp-1",
      verify_profile: { id: "vp-1", name: "Production Verify", webhook_url: "https://example.com/verify" },
    });
    assert.deepEqual(loggedArgs(fake.logPath), [[
      "verify-profiles", "retrieve", "--verify-profile-id", "vp-1", "--format", "json",
    ]]);
  });

  it("lists with generated filter and pagination argv while preserving a stable envelope", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent([
      "verify-profile", "--action", "list", "--name", "Production Verify", "--page-number", "2",
      "--page-size", "10", "--max-items", "1", "--json",
    ], fake.env);

    assert.deepEqual(JSON.parse(output), {
      count: 1,
      verify_profiles: [{ id: "vp-1", name: "Production Verify" }],
      meta: { page_number: 2, page_size: 10, total_results: 2 },
    });
    assert.deepEqual(loggedArgs(fake.logPath), [[
      "verify-profiles", "list", "--filter.name", "Production Verify", "--page-number", "2",
      "--page-size", "10", "--max-items", "1", "--format", "raw",
    ]]);
  });

  it("normalizes a raw JSON list filter before forwarding it", () => {
    const fake = setupFakeTelnyx();
    runAgent([
      "verify-profile", "--action", "list", "--filter", '{ "name": "Production Verify" }', "--json",
    ], fake.env);
    assert.deepEqual(loggedArgs(fake.logPath), [[
      "verify-profiles", "list", "--filter", '{"name":"Production Verify"}', "--format", "raw",
    ]]);
  });

  it("updates explicit scalar, JSON object, decimal, boolean, and webhook settings with exact argv", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent([
      "verify-profile", "--action", "update", "--verify-profile-id", "vp-1", "--name", "Renamed Verify",
      "--sms", '{ "code_length": 6 }', "--call", '{"app_name":"Acme"}',
      "--whatsapp", '{"template_id":"template-1"}', "--daily-spend-limit", "25.50",
      "--daily-spend-limit-enabled", "false", "--webhook-url", "https://example.com/verify",
      "--webhook-failover-url", "https://example.com/failover", "--json",
    ], fake.env);

    const result = JSON.parse(output);
    assert.equal(result.verify_profile_id, "vp-1");
    assert.equal(result.verify_profile.name, "Renamed Verify");
    assert.deepEqual(result.verify_profile.sms, { code_length: 6 });
    assert.deepEqual(loggedArgs(fake.logPath), [[
      "verify-profiles", "update", "--verify-profile-id", "vp-1", "--name", "Renamed Verify",
      "--sms", '{"code_length":6}', "--call", '{"app_name":"Acme"}',
      "--whatsapp", '{"template_id":"template-1"}', "--daily-spend-limit", "25.50",
      "--daily-spend-limit-enabled=false", "--webhook-url", "https://example.com/verify",
      "--webhook-failover-url", "https://example.com/failover", "--format", "json",
    ]]);
  });

  it("rejects unsafe deletion before dispatch and never forwards bare confirmation", () => {
    for (const command of [
      ["verify-profile", "--action", "delete", "--id", "vp-1", "--json"],
      ["verify-profile", "--action", "delete", "--id", "vp-1", "--confirm", "true", "--json"],
    ]) {
      const fake = setupFakeTelnyx();
      const failure = runAgentFailure(command, fake.env);
      assert.match(failure.stdout, /--confirm is required/);
      assert.deepEqual(loggedArgs(fake.logPath), []);
    }

    const fake = setupFakeTelnyx();
    const output = runAgent([
      "verify-profile", "--action", "delete", "--id", "vp-1", "--confirm", "--json",
    ], fake.env);
    assert.deepEqual(JSON.parse(output), { verify_profile_id: "vp-1", deleted: true });
    assert.deepEqual(loggedArgs(fake.logPath), [[
      "verify-profiles", "delete", "--verify-profile-id", "vp-1", "--format", "json",
    ]]);
  });

  it("validates actions, IDs, JSON, numbers, booleans, URLs, and pagination before dispatch", () => {
    const cases: Array<{ args: string[]; expected: RegExp }> = [
      { args: ["verify-profile", "--json"], expected: /--action is required/ },
      { args: ["verify-profile", "--action", "create", "--json"], expected: /Unknown --action/ },
      { args: ["verify-profile", "--action", "retrieve", "--json"], expected: /--id is required/ },
      { args: ["verify-profile", "--action", "retrieve", "--id", "vp-1", "--verify-profile-id", "vp-2", "--json"], expected: /must match/ },
      { args: ["verify-profile", "--action", "update", "--id", "vp-1", "--sms", "[]", "--json"], expected: /--sms must be a JSON object/ },
      { args: ["verify-profile", "--action", "update", "--id", "vp-1", "--call", "nope", "--json"], expected: /--call must be a JSON object/ },
      { args: ["verify-profile", "--action", "update", "--id", "vp-1", "--daily-spend-limit", "-1", "--json"], expected: /non-negative decimal/ },
      { args: ["verify-profile", "--action", "update", "--id", "vp-1", "--daily-spend-limit-enabled", "maybe", "--json"], expected: /must be true or false/ },
      { args: ["verify-profile", "--action", "update", "--id", "vp-1", "--webhook-url", "ftp://example.com", "--json"], expected: /must be an http\(s\) URL/ },
      { args: ["verify-profile", "--action", "list", "--name", "one", "--filter", "{}", "--json"], expected: /cannot be combined/ },
      { args: ["verify-profile", "--action", "list", "--filter", "[]", "--json"], expected: /--filter must be a JSON object/ },
      { args: ["verify-profile", "--action", "list", "--page-size", "0", "--json"], expected: /positive safe integer/ },
      { args: ["verify-profile", "--action", "list", "--max-items", "0", "--json"], expected: /-1 or a positive safe integer/ },
      { args: ["verify-profile", "--action", "retrieve", "--id", "vp-1", "--sms", "{}", "--json"], expected: /Unsupported flag/ },
    ];
    for (const testCase of cases) {
      const fake = setupFakeTelnyx();
      const failure = runAgentFailure(testCase.args, fake.env);
      assert.match(`${failure.stdout}${failure.stderr}`, testCase.expected);
      assert.deepEqual(loggedArgs(fake.logPath), []);
    }
  });

  it("registers verify-profile in help, capabilities, and known flags", () => {
    const help = runAgent(["help"], process.env);
    assert.match(help, /verify-profile\s+Retrieve, list, update, or delete a Verify profile/);
    assert.match(help, /Bare safety acknowledgement \(verify-profile delete/);

    const capabilities = JSON.parse(runAgent(["capabilities", "--json"], process.env));
    assert.ok(capabilities.composite_commands.some((entry: { name: string }) => entry.name === "telnyx-agent verify-profile"));
    const actions = capabilities.api_capabilities["✅ Verify"][0].actions;
    for (const action of ["get_verify_profile", "list_verify_profiles", "update_verify_profile", "delete_verify_profile"]) {
      assert.ok(actions.includes(action));
    }

    const fake = setupFakeTelnyx();
    const result = spawnSync(process.execPath, [...cliRuntimeArgs, cliBin,
      "verify-profile", "--action", "update", "--id", "vp-1", "--sms", "{}", "--json",
    ], { cwd: cliRoot, encoding: "utf8", env: fake.env, timeout: 30_000 });
    assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
    assert.doesNotMatch(result.stderr, /Ignoring unrecognized flag/);
  });
});
