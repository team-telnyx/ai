/**
 * Regression tests for telnyx-agent's Go CLI flag compatibility.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, chmodSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseFlags } from "../src/utils/output.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliRoot = join(__dirname, "..");
const cliBin = join(cliRoot, "bin", "telnyx-agent.ts");

function setupFakeTelnyx(): { fakeTelnyx: string; logPath: string; env: NodeJS.ProcessEnv } {
  const tempDir = mkdtempSync(join(tmpdir(), "telnyx-agent-flags-"));
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

if (args.includes("--page.size")) {
  console.error('Incorrect Usage: flag provided but not defined: -page.size Did you mean "--page-size"?');
  process.exit(1);
}

const command = args.filter((arg) => arg !== "--format" && arg !== "json");
if (command[0] === "ai:assistants" && command[1] === "list" && command.includes("--page-size")) {
  console.error('Incorrect Usage: flag provided but not defined: -page-size Did you mean "--help"?');
  process.exit(1);
}

if (command[0] === "balance" && command[1] === "retrieve") {
  console.log(JSON.stringify({ data: { balance: "10.00", currency: "USD", credit_limit: "0.00" } }));
} else if (command[0] === "ai:assistants" && command[1] === "list") {
  console.log(JSON.stringify({ data: [{ id: "assistant-1" }, { id: "assistant-2" }] }));
} else if (command[0] === "available-phone-numbers" && command[1] === "list") {
  console.log(JSON.stringify({ data: [{ phone_number: "+15550000000" }] }));
} else {
  console.log(JSON.stringify({ data: [], meta: { total_results: 0 } }));
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

describe("telnyx CLI flag compatibility", () => {
  it("parseFlags tracks inherited flag names without breaking repeated flags", () => {
    const parsed = parseFlags([
      "ai-chat",
      "--constructor", "first",
      "--__proto__", "second",
      "--message", "one",
      "--message", "two",
      "--model", "old",
      "--model", "new",
    ]);

    assert.deepEqual(parsed.occurrences.constructor, ["first"]);
    assert.deepEqual(parsed.occurrences.__proto__, ["second"]);
    assert.deepEqual(parsed.occurrences.message, ["one", "two"]);
    assert.equal(parsed.flags.model, "new");
  });

  // NOTE: `status` was REST-swapped from Go CLI to TelnyxClient (direct fetch)
  // and no longer shells out to `telnyx`. Its Go CLI flag compat is no longer
  // relevant. See tests/status-rest.test.ts for the new REST-based tests.

  it("searchNumbers uses the Go CLI's --filter.limit flag for limits", async () => {
    const fake = setupFakeTelnyx();
    const previousPath = process.env.PATH;
    const previousCliPath = process.env.TELNYX_CLI_PATH;
    const previousArgsLog = process.env.TELNYX_FAKE_ARGS_LOG;

    try {
      process.env.PATH = fake.env.PATH;
      process.env.TELNYX_CLI_PATH = fake.fakeTelnyx;
      process.env.TELNYX_FAKE_ARGS_LOG = fake.logPath;

      const moduleUrl = pathToFileURL(join(cliRoot, "src", "utils", "number-order.ts")).href;
      const { searchNumbers } = await import(`${moduleUrl}?test=${Date.now()}`);

      const numbers = await searchNumbers("US", { limit: 5, type: "local" });
      assert.equal(numbers[0].phone_number, "+15550000000");

      const calls = readLoggedArgs(fake.logPath);
      const searchCall = calls.find((args) => args.slice(0, 2).join(" ") === "available-phone-numbers list");
      assert.ok(searchCall, "searchNumbers should call available-phone-numbers list");
      // v0.21 Go CLI uses --filter.limit (not --page-size) for available-phone-numbers list
      assertFlagValue(searchCall, "--filter.limit", "5");
      assert.ok(!searchCall.includes("--page-size"), "searchNumbers must not use legacy --page-size flag");
    } finally {
      process.env.PATH = previousPath;
      if (previousCliPath === undefined) delete process.env.TELNYX_CLI_PATH;
      else process.env.TELNYX_CLI_PATH = previousCliPath;
      if (previousArgsLog === undefined) delete process.env.TELNYX_FAKE_ARGS_LOG;
      else process.env.TELNYX_FAKE_ARGS_LOG = previousArgsLog;
    }
  });
});

describe("help flag never triggers command execution (AIF-325)", () => {
  // A --help/-h flag on a setup-* command must print help and make ZERO Go CLI
  // calls. Regression: `setup-voice --help` previously fell through to the handler
  // and purchased a billable number/connection before erroring on the unknown flag.
  const helpInvocations: string[][] = [
    ["setup-voice", "--help"],
    ["setup-sms", "--help"],
    ["setup-verify", "-h"],
    ["setup-ai", "--help"],
    ["setup-10dlc", "--help"],
    ["help"],
    ["--help"],
    ["-h"],
    [],
  ];

  for (const argv of helpInvocations) {
    const label = argv.length ? argv.join(" ") : "(no args)";
    it(`prints help and makes no Go CLI calls for: ${label}`, () => {
      const fake = setupFakeTelnyx();

      const output = execFileSync("npx", ["tsx", cliBin, ...argv], {
        cwd: cliRoot,
        encoding: "utf8",
        env: fake.env,
        timeout: 30000,
      });

      // Help text was printed.
      assert.match(output, /telnyx-agent — Agent-friendly CLI for Telnyx API v2/);
      assert.match(output, /Usage:/);

      // The fake telnyx binary only creates its log file when invoked. If it was
      // never called, the log file must not exist at all — proving zero API calls.
      if (existsSync(fake.logPath)) {
        const calls = readLoggedArgs(fake.logPath);
        assert.equal(
          calls.length,
          0,
          `expected zero Go CLI calls for \`${label}\`, got: ${JSON.stringify(calls)}`,
        );
      }
    });
  }
});

describe("help detection ignores -h in flag-VALUE position (AIF-325)", () => {
  // A literal "-h" passed as the VALUE of another flag (e.g. an SMS body or
  // password) must NOT be treated as a help request. parseFlags captures "-h" as
  // a real value (single-dash tokens are not flags), so the command must dispatch
  // to the handler and reach the Go CLI as normal.
  // Note: "--help" as a value is a separate parser limitation (parseFlags never
  // consumes a `--`-prefixed token as a value), so it is intentionally not tested
  // here — that input is non-functional independent of this fix.
  const valueInvocations: string[][] = [
    ["send-sms", "--from", "+10000000000", "--to", "+20000000000", "--text", "-h"],
  ];

  for (const argv of valueInvocations) {
    const label = argv.join(" ");
    it(`dispatches to the handler (no help short-circuit) for: ${label}`, () => {
      const fake = setupFakeTelnyx();

      const output = execFileSync("npx", ["tsx", cliBin, ...argv], {
        cwd: cliRoot,
        encoding: "utf8",
        env: fake.env,
        timeout: 30000,
      });

      // Must NOT be the top-level help screen.
      assert.doesNotMatch(output, /telnyx-agent — Agent-friendly CLI for Telnyx API v2/);

      // The command reached the Go CLI (fake logged at least one invocation).
      assert.equal(existsSync(fake.logPath), true, "expected the Go CLI to be invoked");
      const calls = readLoggedArgs(fake.logPath);
      assert.ok(
        calls.length >= 1,
        `expected at least one Go CLI call for \`${label}\`, got: ${JSON.stringify(calls)}`,
      );
    });
  }
});
