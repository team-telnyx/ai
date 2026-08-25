/**
 * Focused mock-binary coverage for web search, contents, and research actions.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliRoot = join(__dirname, "..");
const cliBin = join(cliRoot, "bin", "telnyx-agent.ts");

function setupFakeTelnyx(version = "0.27.0"): { logPath: string; env: NodeJS.ProcessEnv } {
  const tempDir = mkdtempSync(join(tmpdir(), "telnyx-agent-web-search-"));
  const binDir = join(tempDir, "bin");
  const logPath = join(tempDir, "args.jsonl");
  const fakeTelnyx = join(binDir, "telnyx");
  mkdirSync(binDir, { recursive: true });

  writeFileSync(fakeTelnyx, `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
if (args[0] === "--version") {
  console.log("telnyx version ${version}");
  process.exit(0);
}
fs.appendFileSync(process.env.TELNYX_FAKE_ARGS_LOG, JSON.stringify(args) + "\\n");
const commandOffset = args[0] === "--format" ? 2 : 0;
if (args[commandOffset] === "web-search" && args[commandOffset + 1] === "create") {
  console.log(JSON.stringify({
    data: { results: [{ title: "Telnyx", url: "https://telnyx.com", snippet: "Cloud communications" }] },
    meta: { request_id: "search-1" }
  }));
} else if (args[commandOffset] === "web-search" && args[commandOffset + 1] === "contents") {
  console.log(JSON.stringify({
    data: [{ url: "https://example.com", markdown: "# Example", metadata: { title: "Example" } }],
    meta: { request_id: "contents-1" }
  }));
} else if (args[commandOffset] === "web-search:research" && args[commandOffset + 1] === "create") {
  console.log(JSON.stringify({
    data: { task_id: "research-123", status: "pending", answer: null },
    meta: { request_id: "research-1" }
  }));
} else if (args[commandOffset] === "web-search:research" && args[commandOffset + 1] === "retrieve") {
  console.log(JSON.stringify({
    data: { task_id: "research-123", status: "completed", answer: "A cited answer", citations: [{ url: "https://example.com" }] },
    meta: { request_id: "research-2" }
  }));
} else {
  console.error("unexpected command: " + args.join(" "));
  process.exit(2);
}
`);
  chmodSync(fakeTelnyx, 0o755);

  return {
    logPath,
    env: {
      ...process.env,
      TELNYX_API_KEY: "KEY_fake_test",
      TELNYX_CLI_PATH: fakeTelnyx,
      TELNYX_FAKE_ARGS_LOG: logPath,
    },
  };
}

function runCli(args: string[], env: NodeJS.ProcessEnv = process.env): { stdout: string; stderr: string; status: number } {
  const result = spawnSync(process.execPath, ["--import", "tsx", cliBin, ...args], {
    cwd: cliRoot,
    encoding: "utf8",
    env,
    timeout: 30_000,
  });
  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    status: result.status ?? 1,
  };
}

function loggedArgs(logPath: string): string[][] {
  if (!existsSync(logPath)) return [];
  const contents = readFileSync(logPath, "utf8");
  assert.ok(contents.endsWith("\n"), "fake binary must write a real newline after JSON.stringify(args)");
  assert.ok(!contents.endsWith("\n\n"), "fake binary must not write a blank JSONL record");
  return contents.trimEnd().split("\n").map((line) => JSON.parse(line) as string[]);
}

function assertFlag(args: string[], flag: string, expected: string): void {
  const index = args.indexOf(flag);
  assert.notEqual(index, -1, `expected ${flag} in ${args.join(" ")}`);
  assert.equal(args[index + 1], expected);
}

function flagValues(args: string[], flag: string): string[] {
  return args.flatMap((arg, index) => arg === flag ? [args[index + 1]] : []);
}

describe("Web intelligence action commands", () => {
  it("web-search forwards all generated search controls and preserves the response", () => {
    const fake = setupFakeTelnyx();
    const result = runCli([
      "web-search",
      "--query", "Telnyx voice API",
      "--count", "12",
      "--country", "US",
      "--exclude-domain", "pinterest.com",
      "--exclude-domain", "facebook.com",
      "--freshness", "week",
      "--include-domain", "telnyx.com",
      "--include-domain", "developers.telnyx.com",
      "--livecrawl", "true",
      "--safesearch", "moderate",
      "--json",
    ], fake.env);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, "", "documented web-search flags must not warn");
    assert.deepEqual(JSON.parse(result.stdout), {
      data: { results: [{ title: "Telnyx", url: "https://telnyx.com", snippet: "Cloud communications" }] },
      meta: { request_id: "search-1" },
    });

    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args.slice(0, 2), ["web-search", "create"]);
    assertFlag(args, "--query", "Telnyx voice API");
    assertFlag(args, "--count", "12");
    assertFlag(args, "--country", "US");
    assert.deepEqual(flagValues(args, "--exclude-domain"), ["pinterest.com", "facebook.com"]);
    assertFlag(args, "--freshness", "week");
    assert.deepEqual(flagValues(args, "--include-domain"), ["telnyx.com", "developers.telnyx.com"]);
    assert.ok(args.includes("--livecrawl=true"));
    assertFlag(args, "--safesearch", "moderate");
    assert.deepEqual(args.slice(-2), ["--format", "json"]);
  });

  it("web-contents forwards repeated URLs and formats plus cache controls", () => {
    const fake = setupFakeTelnyx();
    const result = runCli([
      "web-contents",
      "--url", "https://example.com",
      "--url", "https://telnyx.com/resources",
      "--crawl-timeout", "30",
      "--format", "markdown",
      "--format", "metadata",
      "--max-age", "null",
      "--json",
    ], fake.env);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, "");
    assert.equal(JSON.parse(result.stdout).data[0].markdown, "# Example");

    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args.slice(0, 4), ["--format", "json", "web-search", "contents"]);
    assert.deepEqual(flagValues(args, "--url"), ["https://example.com", "https://telnyx.com/resources"]);
    assertFlag(args, "--crawl-timeout", "30");
    assert.deepEqual(flagValues(args, "--format"), ["json", "markdown", "metadata"]);
    assert.equal(args.indexOf("--format"), 0, "output format must be a root flag, not a content format");
    assertFlag(args, "--max-age", "null");
  });

  it("web-research forwards asynchronous research controls", () => {
    const fake = setupFakeTelnyx();
    const result = runCli([
      "web-research",
      "--query", "Compare CPaaS platforms",
      "--background", "true",
      "--max-sources", "25",
      "--research-effort", "deep",
      "--json",
    ], fake.env);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, "");
    assert.equal(JSON.parse(result.stdout).data.task_id, "research-123");

    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args.slice(0, 2), ["web-search:research", "create"]);
    assertFlag(args, "--query", "Compare CPaaS platforms");
    assert.ok(args.includes("--background=true"));
    assertFlag(args, "--max-sources", "25");
    assertFlag(args, "--research-effort", "deep");
    assert.deepEqual(args.slice(-2), ["--format", "json"]);
  });

  it("web-research-status retrieves a task and preserves its answer and citations", () => {
    const fake = setupFakeTelnyx();
    const result = runCli(["web-research-status", "--task-id", "research-123", "--json"], fake.env);

    assert.equal(result.status, 0, result.stderr);
    const response = JSON.parse(result.stdout);
    assert.equal(response.data.status, "completed");
    assert.equal(response.data.answer, "A cited answer");
    assert.deepEqual(response.data.citations, [{ url: "https://example.com" }]);

    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args, [
      "web-search:research", "retrieve", "--task-id", "research-123", "--format", "json",
    ]);
  });

  it("validates required fields and boolean values before invoking the Go CLI", () => {
    for (const args of [
      ["web-search", "--json"],
      ["web-contents", "--json"],
      ["web-research", "--json"],
      ["web-research-status", "--json"],
      ["web-search", "--query", "test", "--livecrawl", "sometimes", "--json"],
      ["web-research", "--query", "test", "--background", "later", "--json"],
    ]) {
      const fake = setupFakeTelnyx();
      const result = runCli(args, fake.env);
      assert.notEqual(result.status, 0, `expected ${args.join(" ")} to fail`);
      assert.ok(JSON.parse(result.stdout).error);
      assert.deepEqual(loggedArgs(fake.logPath), []);
    }
  });

  it("clearly rejects the currently bundled v0.24 CLI until the v0.27 dependency lands", () => {
    const fake = setupFakeTelnyx("0.24.0");
    const result = runCli(["web-search", "--query", "test", "--json"], fake.env);

    assert.notEqual(result.status, 0);
    assert.match(
      JSON.parse(result.stdout).error,
      /Telnyx Go CLI 0\.24\.0, but this command requires >= 0\.27\.0/,
    );
    assert.deepEqual(loggedArgs(fake.logPath), []);
  });

  it("advertises every web command and capability", () => {
    const help = runCli(["help"]);
    assert.equal(help.status, 0, help.stderr);
    for (const command of ["web-search", "web-contents", "web-research", "web-research-status"]) {
      assert.match(help.stdout, new RegExp(command));
    }
    assert.match(help.stdout, /--exclude-domain <host>/);
    assert.match(help.stdout, /--task-id <id>/);

    const capabilities = runCli(["capabilities", "--json"]);
    assert.equal(capabilities.status, 0, capabilities.stderr);
    const response = JSON.parse(capabilities.stdout);
    const commands = response.composite_commands.map((entry: { name: string }) => entry.name);
    for (const command of ["web-search", "web-contents", "web-research", "web-research-status"]) {
      assert.ok(commands.includes(`telnyx-agent ${command}`));
    }
    const actions = response.api_capabilities["🌐 Web Intelligence"]
      .flatMap((capability: { actions: string[] }) => capability.actions);
    assert.deepEqual(actions, ["web_search", "web_contents", "web_research", "get_web_research_status"]);
  });
});
