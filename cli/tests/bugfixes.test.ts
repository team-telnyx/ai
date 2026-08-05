/**
 * Tests for pre-existing bug fixes:
 * - Bug 1: --help/-h passed to commands now shows help instead of running the command
 * - Bug 2: --flag "" (empty string) now stored as "" not true
 * - Bug 3: README has tts/tts-voices sections
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseFlags } from "../src/utils/output.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliRoot = join(__dirname, "..");
const cliBin = join(cliRoot, "bin", "telnyx-agent.ts");

function runCli(args: string[], env?: NodeJS.ProcessEnv): { stdout: string; status: number } {
  try {
    const stdout = execFileSync("npx", ["tsx", cliBin, ...args], {
      cwd: cliRoot,
      encoding: "utf8",
      env: env ?? { ...process.env },
      timeout: 30000,
    });
    return { stdout, status: 0 };
  } catch (err: any) {
    return { stdout: err.stdout?.toString() ?? "", status: err.status ?? 1 };
  }
}

describe("Bug fix: --help/-h shows help instead of running the command", () => {
  it("tts --help shows help and exits 0", () => {
    const { stdout, status } = runCli(["tts", "--help"]);
    assert.equal(status, 0, "expected --help to exit 0");
    assert.match(stdout, /Usage:/);
    assert.match(stdout, /tts/);
  });

  it("tts -h shows help and exits 0", () => {
    const { stdout, status } = runCli(["tts", "-h"]);
    assert.equal(status, 0, "expected -h to exit 0");
    assert.match(stdout, /Usage:/);
  });

  it("setup-voice --help shows help and exits 0", () => {
    const { stdout, status } = runCli(["setup-voice", "--help"]);
    assert.equal(status, 0);
    assert.match(stdout, /Usage:/);
  });

  it("setup-sms --help shows help and exits 0", () => {
    const { stdout, status } = runCli(["setup-sms", "--help"]);
    assert.equal(status, 0);
    assert.match(stdout, /Usage:/);
  });

  it("tts --help does NOT make an API call (no auth error)", () => {
    const { stdout, status } = runCli(["tts", "--help"], { ...process.env, TELNYX_API_KEY: "" });
    assert.equal(status, 0, "expected --help to exit 0 without API key");
    // If the command ran, it would fail with auth error, not show help
    assert.doesNotMatch(stdout, /error/i);
    assert.match(stdout, /Usage:/);
  });

  // Codex round-8: `-h`/`--help` AFTER a boolean flag must still be treated as
  // help. Boolean flags (--json, --force, ...) don't consume the next token, so
  // the help guard must not swallow a trailing -h as their "value" and fall
  // through into a handler that makes API calls / buys numbers.
  it("setup-sms --json -h shows help (does not run) even without API key", () => {
    const { stdout, status } = runCli(["setup-sms", "--json", "-h"], { ...process.env, TELNYX_API_KEY: "" });
    assert.equal(status, 0, "expected -h after --json to exit 0 without API key");
    assert.match(stdout, /Usage:/);
    assert.doesNotMatch(stdout, /error/i);
  });

  it("setup-voice --force -h shows help (does not provision) even without API key", () => {
    const { stdout, status } = runCli(["setup-voice", "--force", "-h"], { ...process.env, TELNYX_API_KEY: "" });
    assert.equal(status, 0, "expected -h after --force to exit 0 without API key");
    assert.match(stdout, /Usage:/);
    assert.doesNotMatch(stdout, /error/i);
  });

  it("send-sms --text \"-h\" still treats -h as a VALUE, not help", () => {
    // The value-taking flag path must be preserved: -h as a --text value is a
    // real message, not a help request.
    const parsed = parseFlags(["send-sms", "--text", "-h"]);
    assert.equal(parsed.flags.text, "-h", "expected -h to be the --text value");
  });
});

describe("Bug fix: parseFlags handles empty string values", () => {
  it('stores empty string for --flag ""', () => {
    const parsed = parseFlags(["cmd", "--text", ""]);
    assert.equal(parsed.flags.text, "", 'expected flags.text to be "" not true');
  });

  it("stores empty string for --text with explicit empty value", () => {
    const parsed = parseFlags(["tts", "--text", "", "--voice", "Amy"]);
    assert.equal(parsed.flags.text, "");
    assert.equal(parsed.flags.voice, "Amy");
  });

  it("still stores boolean true for bare --flag", () => {
    const parsed = parseFlags(["cmd", "--json"]);
    assert.equal(parsed.flags.json, true);
  });

  it("still stores string for --flag value", () => {
    const parsed = parseFlags(["cmd", "--text", "hello"]);
    assert.equal(parsed.flags.text, "hello");
  });

  it("occurrences track empty strings correctly", () => {
    const parsed = parseFlags(["cmd", "--text", ""]);
    assert.deepEqual(parsed.occurrences.text, [""]);
  });

  it("helpRequested is true when --help is passed", () => {
    const parsed = parseFlags(["cmd", "--help"]);
    assert.equal(parsed.helpRequested, true);
  });

  it("helpRequested is true when -h is passed", () => {
    const parsed = parseFlags(["cmd", "-h"]);
    assert.equal(parsed.helpRequested, true);
  });

  it("helpRequested is false when --help is not passed", () => {
    const parsed = parseFlags(["cmd", "--json"]);
    assert.equal(parsed.helpRequested, false);
  });

  it("--help does not create a flags.help entry", () => {
    const parsed = parseFlags(["cmd", "--help", "--json"]);
    assert.equal(parsed.flags.help, undefined);
    assert.equal(parsed.flags.json, true);
  });
});

describe("Bug fix: --json validation errors output JSON not human text", () => {
  it("rcs-send --json with missing --agent-id outputs JSON error", () => {
    const { stdout, status } = runCli(["rcs-send", "--json"], { ...process.env });
    assert.notEqual(status, 0, "expected non-zero exit");
    const data = JSON.parse(stdout);
    assert.ok(data.error, "expected error field in JSON");
    assert.match(data.error, /agent-id is required/i);
  });

  it("rcs-capabilities --json with missing --agent-id outputs JSON error", () => {
    const { stdout, status } = runCli(["rcs-capabilities", "--json"], { ...process.env });
    assert.notEqual(status, 0);
    const data = JSON.parse(stdout);
    assert.ok(data.error);
    assert.match(data.error, /agent-id is required/i);
  });

  it("whatsapp-send --json with missing --from/--to outputs JSON error", () => {
    const { stdout, status } = runCli(["whatsapp-send", "--json"], { ...process.env });
    assert.notEqual(status, 0);
    const data = JSON.parse(stdout);
    assert.ok(data.error);
    assert.match(data.error, /from and --to are required/i);
  });

  it("whatsapp-send --json with no --text or --template-name outputs JSON error", () => {
    const { stdout, status } = runCli(["whatsapp-send", "--from", "+13125550001", "--to", "+13125550002", "--json"], { ...process.env });
    assert.notEqual(status, 0);
    const data = JSON.parse(stdout);
    assert.ok(data.error);
    assert.match(data.error, /text.*template-name/i);
  });

  it("setup-10dlc --json with missing --phone/--email outputs JSON error", () => {
    const { stdout, status } = runCli(["setup-10dlc", "--json"], { ...process.env });
    assert.notEqual(status, 0);
    const data = JSON.parse(stdout);
    assert.ok(data.error);
    assert.match(data.error, /phone and --email are required/i);
  });

  it("setup-10dlc --json with invalid --usecase outputs JSON error", () => {
    const { stdout, status } = runCli(["setup-10dlc", "--phone", "+13125550001", "--email", "test@test.com", "--usecase", "INVALID", "--json"], { ...process.env });
    assert.notEqual(status, 0);
    const data = JSON.parse(stdout);
    assert.ok(data.error);
    assert.match(data.error, /invalid use case/i);
  });

  it("rcs-send without --json still outputs human-readable error", () => {
    const { stdout, status } = runCli(["rcs-send"], { ...process.env });
    assert.notEqual(status, 0);
    // Without --json, output goes to stderr as human text, stdout should be empty or non-JSON
    if (stdout.trim()) {
      assert.throws(() => JSON.parse(stdout), "expected non-JSON output without --json");
    }
  });
});

describe("Bug fix: README has tts and tts-voices sections", () => {
  it("README contains a tts section", () => {
    const readme = readFileSync(join(cliRoot, "README.md"), "utf8");
    assert.match(readme, /### `telnyx-agent tts`/);
  });

  it("README contains a tts-voices section", () => {
    const readme = readFileSync(join(cliRoot, "README.md"), "utf8");
    assert.match(readme, /### `telnyx-agent tts-voices`/);
  });

  it("README tts section mentions --text and --voice flags", () => {
    const readme = readFileSync(join(cliRoot, "README.md"), "utf8");
    assert.match(readme, /--text/);
    assert.match(readme, /--voice/);
  });
});

describe("Bug fix: -h after boolean flags triggers help (not swallowed as flag value)", () => {
  it("setup-voice --force -h shows help and exits 0", () => {
    const { stdout, status } = runCli(["setup-voice", "--force", "-h"]);
    assert.equal(status, 0, "expected --force -h to exit 0 with help");
    assert.match(stdout, /Usage:/);
  });

  it("setup-sms --json -h shows help and exits 0", () => {
    const { stdout, status } = runCli(["setup-sms", "--json", "-h"]);
    assert.equal(status, 0, "expected --json -h to exit 0 with help");
    assert.match(stdout, /Usage:/);
  });

  it("setup-voice --json -h shows help and exits 0", () => {
    const { stdout, status } = runCli(["setup-voice", "--json", "-h"]);
    assert.equal(status, 0);
    assert.match(stdout, /Usage:/);
  });

  it("setup-sms --force -h shows help and exits 0", () => {
    const { stdout, status } = runCli(["setup-sms", "--force", "-h"]);
    assert.equal(status, 0);
    assert.match(stdout, /Usage:/);
  });

  it("parseFlags: --json -h sets json=true and helpRequested=true", () => {
    const parsed = parseFlags(["setup-voice", "--json", "-h"]);
    assert.equal(parsed.flags.json, true, "expected json to be boolean true, not '-h'");
    assert.equal(parsed.helpRequested, true, "expected helpRequested to be true");
  });

  it("parseFlags: --force -h sets force=true and helpRequested=true", () => {
    const parsed = parseFlags(["setup-sms", "--force", "-h"]);
    assert.equal(parsed.flags.force, true, "expected force to be boolean true, not '-h'");
    assert.equal(parsed.helpRequested, true);
  });

  it("parseFlags: presence-only action flags preserve following help tokens", () => {
    const shortHelp = parseFlags(["update-ai-assistant", "--clear-tool-ids", "-h"]);
    assert.equal(shortHelp.flags["clear-tool-ids"], true);
    assert.equal(shortHelp.helpRequested, true);

    const longHelp = parseFlags(["cancel-porting-order", "--confirm", "--help"]);
    assert.equal(longHelp.flags.confirm, true);
    assert.equal(longHelp.helpRequested, true);
  });

  it("parseFlags: presence-only action flags capture explicit values for rejection", () => {
    const clear = parseFlags(["update-ai-assistant", "--clear-tool-ids", "false", "--json"]);
    assert.equal(clear.flags["clear-tool-ids"], "false");
    assert.equal(clear.flags.json, true);

    const confirm = parseFlags(["cancel-porting-order", "--confirm", "true", "--json"]);
    assert.equal(confirm.flags.confirm, "true");
    assert.equal(confirm.flags.json, true);
  });

  it("parseFlags: --text -h still treats -h as text value (non-boolean flag)", () => {
    const parsed = parseFlags(["send-sms", "--text", "-h"]);
    assert.equal(parsed.flags.text, "-h", "expected text to be '-h' for non-boolean flag");
    assert.equal(parsed.helpRequested, false, "expected helpRequested to be false when -h is a value");
  });
});
