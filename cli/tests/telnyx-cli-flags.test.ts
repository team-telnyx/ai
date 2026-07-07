/**
 * Regression tests for telnyx-agent's Go CLI flag compatibility.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

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
  it("status uses --page-size for paginated list commands and no page-size for ai:assistants", () => {
    const fake = setupFakeTelnyx();

    const output = execFileSync("npx", ["tsx", cliBin, "status", "--json"], {
      cwd: cliRoot,
      encoding: "utf8",
      env: fake.env,
      timeout: 30000,
    });

    const data = JSON.parse(output);
    assert.equal(data.ai_assistants.total, 2);

    const calls = readLoggedArgs(fake.logPath);
    assert.ok(calls.every((args) => !args.includes("--page.size")), "must not use unsupported --page.size flag");

    const numbersCall = calls.find((args) => args.slice(0, 2).join(" ") === "phone-numbers list");
    const profilesCall = calls.find((args) => args.slice(0, 2).join(" ") === "messaging-profiles list");
    const connectionsCall = calls.find((args) => args.slice(0, 2).join(" ") === "credential-connections list");
    assert.ok(numbersCall, "status should query phone-numbers list");
    assert.ok(profilesCall, "status should query messaging-profiles list");
    assert.ok(connectionsCall, "status should query credential-connections list");
    assertFlagValue(numbersCall, "--page-size", "1");
    assertFlagValue(profilesCall, "--page-size", "1");
    assertFlagValue(connectionsCall, "--page-size", "1");

    const assistantsCall = calls.find((args) => args.slice(0, 2).join(" ") === "ai:assistants list");
    assert.ok(assistantsCall, "status should query ai:assistants list");
    assert.ok(!assistantsCall.includes("--page-size"), "ai:assistants list does not support pagination flags");
  });

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
