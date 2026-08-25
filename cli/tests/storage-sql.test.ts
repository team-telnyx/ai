/**
 * Focused mock-binary coverage for Telnyx Storage SQL queries.
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
  const tempDir = mkdtempSync(join(tmpdir(), "telnyx-agent-storage-sql-"));
  const binDir = join(tempDir, "bin");
  const logPath = join(tempDir, "args.jsonl");
  const fakeTelnyx = join(binDir, "telnyx");
  mkdirSync(binDir, { recursive: true });

  writeFileSync(fakeTelnyx, `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
fs.appendFileSync(process.env.TELNYX_FAKE_ARGS_LOG, JSON.stringify(args) + "\\n");
if (args[0] === "--version") {
  console.log("telnyx version ${version}");
  process.exit(0);
}
if (args[0] === "storage:sqldbs:actions" && args[1] === "query") {
  console.log(JSON.stringify({
    data: {
      count: 1,
      duration: 2.75,
      meta: { changes: 0, duration: 2.1, last_row_id: 0, rows_read: 1, rows_written: 0 },
      results: [{ id: 42, name: "Alice", active: true }],
      success: true
    }
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
      TELNYX_FRICTION_ENABLED: "false",
      TELNYX_TELEMETRY_ENDPOINT: "",
    },
  };
}

function runCli(args: string[], env: NodeJS.ProcessEnv = process.env): {
  stdout: string;
  stderr: string;
  status: number;
} {
  const result = spawnSync(process.execPath, ["--import", "tsx", cliBin, ...args], {
    cwd: cliRoot,
    encoding: "utf8",
    env,
    timeout: 30_000,
  });
  assert.equal(result.error, undefined);
  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    status: result.status ?? 1,
  };
}

function loggedArgs(logPath: string): string[][] {
  if (!existsSync(logPath)) return [];
  const contents = readFileSync(logPath, "utf8");
  assert.ok(contents.endsWith("\n"), "fake binary must write a real newline after each JSON record");
  assert.ok(!contents.endsWith("\n\n"), "fake binary must not write a blank JSONL record");
  return contents.trimEnd().split("\n").map((line) => JSON.parse(line) as string[]);
}

function flagValues(args: string[], flag: string): string[] {
  return args.flatMap((arg, index) => arg === flag ? [args[index + 1]] : []);
}

describe("Storage SQL query command", () => {
  it("forwards the generated ID, SQL, and repeated typed binding fields verbatim", () => {
    const fake = setupFakeTelnyx();
    const result = runCli([
      "storage-sql-query",
      "--id", "sql-db-123",
      "--sql", "SELECT * FROM users WHERE name = ? AND id = ? AND score >= ? AND active = ? AND deleted_at IS ? AND code = ?",
      "--param", "alice",
      "--param", "42",
      "--param", "3.5",
      "--param", "true",
      "--param", "null",
      "--param", "\"007\"",
      "--json",
    ], fake.env);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, "", "documented Storage SQL flags must not warn");
    assert.deepEqual(JSON.parse(result.stdout), {
      data: {
        count: 1,
        duration: 2.75,
        meta: { changes: 0, duration: 2.1, last_row_id: 0, rows_read: 1, rows_written: 0 },
        results: [{ id: 42, name: "Alice", active: true }],
        success: true,
      },
    });

    const invocations = loggedArgs(fake.logPath);
    assert.deepEqual(invocations[0], ["--version"]);
    const args = invocations[1];
    assert.deepEqual(args.slice(0, 6), [
      "storage:sqldbs:actions", "query", "--id", "sql-db-123", "--sql",
      "SELECT * FROM users WHERE name = ? AND id = ? AND score >= ? AND active = ? AND deleted_at IS ? AND code = ?",
    ]);
    assert.deepEqual(flagValues(args, "--param"), ["alice", "42", "3.5", "true", "null", "\"007\""]);
    assert.deepEqual(args.slice(-2), ["--format", "json"]);
  });

  it("supports statements without bind parameters and exposes result metadata in human output", () => {
    const fake = setupFakeTelnyx();
    const result = runCli([
      "storage-sql-query", "--id", "sql-db-123", "--sql", "CREATE TABLE users (id INTEGER)",
    ], fake.env);

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /SQL query completed!/);
    assert.match(result.stdout, /SQL Database ID\s+sql-db-123/);
    assert.match(result.stdout, /"rows_read": 1/);

    const invocations = loggedArgs(fake.logPath);
    assert.deepEqual(flagValues(invocations[1], "--param"), []);
  });

  it("validates required fields and missing parameter values before invoking the Go CLI", () => {
    for (const args of [
      ["storage-sql-query", "--sql", "SELECT 1", "--json"],
      ["storage-sql-query", "--id", "sql-db-123", "--json"],
      ["storage-sql-query", "--id", "sql-db-123", "--sql", "SELECT ?", "--param", "--json"],
    ]) {
      const fake = setupFakeTelnyx();
      const result = runCli(args, fake.env);
      assert.notEqual(result.status, 0, `expected ${args.join(" ")} to fail`);
      assert.ok(JSON.parse(result.stdout).error);
      assert.deepEqual(loggedArgs(fake.logPath), []);
    }
  });

  it("enforces Telnyx Go CLI v0.27.0 without changing the vendored platform pin", () => {
    const fake = setupFakeTelnyx("0.26.9");
    const result = runCli([
      "storage-sql-query", "--id", "sql-db-123", "--sql", "SELECT 1", "--json",
    ], fake.env);

    assert.notEqual(result.status, 0);
    const error = JSON.parse(result.stdout).error as string;
    assert.match(error, /0\.26\.9/);
    assert.match(error, /requires >= 0\.27\.0/);
    assert.deepEqual(loggedArgs(fake.logPath), [["--version"]]);
  });

  it("registers command help and Storage capabilities", () => {
    const help = runCli(["help"]);
    assert.equal(help.status, 0, help.stderr);
    assert.match(help.stdout, /storage-sql-query/);
    assert.match(help.stdout, /--param <value>/);
    assert.match(help.stdout, /string, number, boolean, or null/);

    const capabilities = runCli(["capabilities", "--json"]);
    assert.equal(capabilities.status, 0, capabilities.stderr);
    const response = JSON.parse(capabilities.stdout);
    const commands = response.composite_commands.map((entry: { name: string }) => entry.name);
    assert.ok(commands.includes("telnyx-agent storage-sql-query"));
    assert.deepEqual(
      response.api_capabilities["🗄️ Storage"].flatMap(
        (capability: { actions: string[] }) => capability.actions,
      ),
      ["run_storage_sql_query"],
    );
  });
});
