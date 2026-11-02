/** Mock-binary coverage for browser session lifecycle and navigate-only actions. */
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

function setupFakeTelnyx(version = "0.35.0"): { logPath: string; env: NodeJS.ProcessEnv } {
  const tempDir = mkdtempSync(join(tmpdir(), "telnyx-agent-browser-sessions-"));
  const binDir = join(tempDir, "bin");
  const logPath = join(tempDir, "args.jsonl");
  const fakeTelnyx = join(binDir, "telnyx");
  mkdirSync(binDir, { recursive: true });
  writeFileSync(fakeTelnyx, `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
if (args[0] === "--version") { console.log("telnyx version ${version}"); process.exit(0); }
fs.appendFileSync(process.env.TELNYX_FAKE_ARGS_LOG, JSON.stringify(args) + "\\n");
function flag(name) { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : undefined; }
function equalsFlag(name) { return args.find((arg) => arg.startsWith(name + "=")); }
const resource = args[0];
const action = args[1];
const id = flag("--id") || "bsess-created";
if (resource === "browser-sessions" && action === "create") {
  console.log(JSON.stringify({ data: { id: "bsess-created", status: "ready", policy: { allowed_domains: JSON.parse(flag("--policy.allowed-domains")) } } }));
} else if (resource === "browser-sessions" && action === "retrieve") {
  console.log(JSON.stringify({ data: { id, status: "ready" } }));
} else if (resource === "browser-sessions" && action === "list") {
  console.log(JSON.stringify({ data: [{ id: "bsess-1", status: "ready" }], meta: { total_results: 1 } }));
} else if (resource === "browser-sessions" && action === "delete") {
  console.log(JSON.stringify({ data: { id, status: "closed" } }));
} else if (resource === "browser-sessions" && action === "retrieve-artifact") {
  console.log(JSON.stringify({ data: { id: flag("--artifact-id"), type: "screenshot", signed_url: "https://download.example.invalid/artifact" } }));
} else if (resource === "browser-sessions:actions" && action === "create") {
  console.log(JSON.stringify({ data: { id: "baction-1", status: "completed", type: flag("--type"), url: flag("--url"), include_observation: equalsFlag("--include-observation") === "--include-observation=true" } }));
} else if (resource === "browser-sessions:actions" && action === "retrieve") {
  console.log(JSON.stringify({ data: { id: flag("--action-id"), status: "completed", type: "navigate" } }));
} else {
  console.error("unexpected fake telnyx invocation: " + args.join(" "));
  process.exit(2);
}
`);
  chmodSync(fakeTelnyx, 0o755);
  return {
    logPath,
    env: { ...process.env, TELNYX_CLI_PATH: fakeTelnyx, TELNYX_FAKE_ARGS_LOG: logPath },
  };
}

function runAgent(args: string[], env: NodeJS.ProcessEnv): { stdout: string; stderr: string; status: number } {
  try {
    const stdout = execFileSync(process.execPath, ["--import", "tsx", cliBin, ...args], {
      cwd: cliRoot,
      encoding: "utf8",
      env,
      timeout: 30_000,
    });
    return { stdout, stderr: "", status: 0 };
  } catch (err: any) {
    return { stdout: err.stdout?.toString() ?? "", stderr: err.stderr?.toString() ?? "", status: err.status ?? 1 };
  }
}

function loggedArgs(logPath: string): string[][] {
  if (!existsSync(logPath)) return [];
  const contents = readFileSync(logPath, "utf8");
  assert.ok(contents.endsWith("\n"), "fake binary JSONL must use an actual newline terminator");
  assert.ok(!contents.endsWith("\n\n"), "fake binary must not write blank JSONL records");
  return contents.trimEnd().split("\n").map((line) => JSON.parse(line) as string[]);
}

function expectSuccess(args: string[], fake: ReturnType<typeof setupFakeTelnyx>): any {
  const result = runAgent([...args, "--json"], fake.env);
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

describe("browser session commands", () => {
  it("creates a scoped session with allowlisted domains, bounded limits, metadata, and idempotency", () => {
    const fake = setupFakeTelnyx();
    const output = expectSuccess([
      "create-browser-session",
      "--allowed-domains", "example.com,*.docs.example.com",
      "--idle-timeout-seconds", "60",
      "--lifetime-seconds", "300",
      "--metadata", '{"ticket":"INC-42"}',
      "--idempotency-key", "browser-retry-1",
    ], fake);
    assert.equal(output.browser_session_id, "bsess-created");
    assert.deepEqual(output.browser_session.policy.allowed_domains, ["example.com", "*.docs.example.com"]);
    assert.deepEqual(loggedArgs(fake.logPath), [[
      "browser-sessions", "create",
      "--policy.allowed-domains", '["example.com","*.docs.example.com"]',
      "--idempotency-key", "browser-retry-1",
      "--limits.idle-timeout-s", "60",
      "--limits.lifetime-s", "300",
      "--metadata", '{"ticket":"INC-42"}',
      "--format", "json",
    ]]);
  });

  it("retrieves and lists sessions through the exact v0.35 generated commands", () => {
    const retrieveFake = setupFakeTelnyx();
    const retrieved = expectSuccess(["get-browser-session", "--id", "bsess-1"], retrieveFake);
    assert.equal(retrieved.browser_session.status, "ready");
    assert.deepEqual(loggedArgs(retrieveFake.logPath), [[
      "browser-sessions", "retrieve", "--id", "bsess-1", "--format", "json",
    ]]);

    const listFake = setupFakeTelnyx();
    const listed = expectSuccess(["list-browser-sessions", "--status", "ready"], listFake);
    assert.equal(listed.count, 1);
    assert.deepEqual(loggedArgs(listFake.logPath), [[
      "browser-sessions", "list", "--status", "ready", "--format", "raw",
    ]]);
  });

  it("requires a bare confirmation before closing and does not forward it", () => {
    const rejectedFake = setupFakeTelnyx();
    const rejected = runAgent(["close-browser-session", "--id", "bsess-1", "--json"], rejectedFake.env);
    assert.notEqual(rejected.status, 0);
    assert.match(JSON.parse(rejected.stdout).error, /--confirm is required/);
    assert.deepEqual(loggedArgs(rejectedFake.logPath), []);

    const fake = setupFakeTelnyx();
    const closed = expectSuccess(["close-browser-session", "--id", "bsess-1", "--confirm"], fake);
    assert.equal(closed.closed, true);
    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args, ["browser-sessions", "delete", "--id", "bsess-1", "--format", "json"]);
    assert.ok(!args.includes("--confirm"));
  });

  it("exposes only navigate action fields and preserves navigation controls", () => {
    const fake = setupFakeTelnyx();
    const output = expectSuccess([
      "navigate-browser-session",
      "--id", "bsess-1",
      "--url", "https://example.com/docs",
      "--wait-seconds", "0",
      "--include-observation", "true",
      "--wait-until", "dom_stable",
      "--idempotency-key", "navigate-retry-1",
    ], fake);
    assert.equal(output.browser_session_action.type, "navigate");
    assert.deepEqual(loggedArgs(fake.logPath), [[
      "browser-sessions:actions", "create",
      "--id", "bsess-1",
      "--type", "navigate",
      "--url", "https://example.com/docs",
      "--wait-seconds", "0",
      "--idempotency-key", "navigate-retry-1",
      "--include-observation=true",
      "--wait-until", "dom_stable",
      "--format", "json",
    ]]);
  });

  it("retrieves stored action and artifact metadata without exposing signed artifact download", () => {
    const actionFake = setupFakeTelnyx();
    const action = expectSuccess([
      "get-browser-session-action", "--id", "bsess-1", "--action-id", "baction-1",
    ], actionFake);
    assert.equal(action.browser_session_action_id, "baction-1");
    assert.deepEqual(loggedArgs(actionFake.logPath), [[
      "browser-sessions:actions", "retrieve", "--id", "bsess-1", "--action-id", "baction-1", "--format", "json",
    ]]);

    const artifactFake = setupFakeTelnyx();
    const artifact = expectSuccess([
      "get-browser-session-artifact", "--id", "bsess-1", "--artifact-id", "artifact-1",
    ], artifactFake);
    assert.equal(artifact.artifact_id, "artifact-1");
    assert.equal(artifact.artifact.signed_url, "https://download.example.invalid/artifact");
    assert.deepEqual(loggedArgs(artifactFake.logPath), [[
      "browser-sessions", "retrieve-artifact", "--id", "bsess-1", "--artifact-id", "artifact-1", "--format", "json",
    ]]);
  });

  it("validates agent-facing values before invoking the Go CLI and requires v0.35", () => {
    const invalidArgs = [
      ["create-browser-session", "--json"],
      ["create-browser-session", "--allowed-domains", "127.0.0.1", "--json"],
      ["create-browser-session", "--allowed-domains", "example.com", "--idle-timeout-seconds", "301", "--lifetime-seconds", "300", "--json"],
      ["list-browser-sessions", "--status", "pending", "--json"],
      ["navigate-browser-session", "--id", "bsess-1", "--url", "file:///etc/passwd", "--json"],
      ["navigate-browser-session", "--id", "bsess-1", "--url", "https://example.com", "--wait-until", "networkidle", "--json"],
      ["close-browser-session", "--id", "bsess-1", "--confirm", "true", "--json"],
    ];
    for (const args of invalidArgs) {
      const fake = setupFakeTelnyx();
      const result = runAgent(args, fake.env);
      assert.notEqual(result.status, 0, `expected ${args.join(" ")} to fail`);
      assert.ok(JSON.parse(result.stdout).error);
      assert.deepEqual(loggedArgs(fake.logPath), []);
    }

    const oldFake = setupFakeTelnyx("0.34.9");
    const oldResult = runAgent(["list-browser-sessions", "--json"], oldFake.env);
    assert.notEqual(oldResult.status, 0);
    assert.match(JSON.parse(oldResult.stdout).error, /requires >= 0\.35\.0/);
    assert.deepEqual(loggedArgs(oldFake.logPath), []);
  });

  it("registers every browser-session command in help and capabilities", () => {
    const commands = [
      "create-browser-session", "get-browser-session", "list-browser-sessions", "close-browser-session",
      "navigate-browser-session", "get-browser-session-action", "get-browser-session-artifact",
    ];
    const help = runAgent(["help"], process.env);
    assert.equal(help.status, 0, help.stderr);
    assert.doesNotMatch(help.stdout, /artifact-download/);
    const capabilitiesResult = runAgent(["capabilities", "--json"], process.env);
    assert.equal(capabilitiesResult.status, 0, capabilitiesResult.stderr);
    const capabilities = JSON.parse(capabilitiesResult.stdout);
    for (const command of commands) {
      assert.match(help.stdout, new RegExp(command));
      assert.ok(capabilities.composite_commands.some((entry: { name: string }) => entry.name === `telnyx-agent ${command}`));
    }
    assert.deepEqual(capabilities.api_capabilities["🌐 Browser Sessions"][0].actions, commands.map((command) => command.replaceAll("-", "_")));
  });
});
