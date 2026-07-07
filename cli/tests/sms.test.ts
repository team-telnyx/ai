/**
 * Tests for SMS action commands (send-sms, schedule-sms, sms-status).
 *
 * Uses a fake `telnyx` binary (same pattern as telnyx-cli-flags.test.ts) that
 * logs the Go CLI args it receives and returns canned JSON for the
 * `messages send|schedule|retrieve|cancel-scheduled` subcommands.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliRoot = join(__dirname, "..");
const cliBin = join(cliRoot, "bin", "telnyx-agent.ts");

function setupFakeTelnyx(): { fakeTelnyx: string; logPath: string; env: NodeJS.ProcessEnv } {
  const tempDir = mkdtempSync(join(tmpdir(), "telnyx-agent-sms-"));
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

const command = args.filter((a) => a !== "--format" && a !== "json");
function flag(f) { const i = command.indexOf(f); return i >= 0 ? command[i + 1] : null; }

if (command[0] === "messages" && command[1] === "send") {
  console.log(JSON.stringify({ data: { id: "msg-123", status: "queued", type: flag("--type"), from: flag("--from"), to: flag("--to") } }));
} else if (command[0] === "messages" && command[1] === "schedule") {
  console.log(JSON.stringify({ data: { id: "sched-456", status: "scheduled", send_at: flag("--send-at") } }));
} else if (command[0] === "messages" && command[1] === "retrieve") {
  console.log(JSON.stringify({ data: { id: flag("--id"), status: "delivered", direction: "outbound" } }));
} else if (command[0] === "messages" && command[1] === "cancel-scheduled") {
  console.log(JSON.stringify({ data: { id: flag("--id"), status: "cancelled" } }));
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

function runAgent(args: string[], env: NodeJS.ProcessEnv): string {
  return execFileSync("npx", ["tsx", cliBin, ...args], {
    cwd: cliRoot,
    encoding: "utf8",
    env,
    timeout: 30000,
  });
}

function assertFlagValue(args: string[], flag: string, value: string): void {
  const index = args.indexOf(flag);
  assert.notEqual(index, -1, `expected ${flag} in ${args.join(" ")}`);
  assert.equal(args[index + 1], value, `expected ${flag} ${value} in ${args.join(" ")}`);
}

describe("SMS action commands", () => {
  it("send-sms constructs messages send args with --type SMS", () => {
    const fake = setupFakeTelnyx();

    const out = runAgent(
      ["send-sms", "--from", "+13125550000", "--to", "+13125550001", "--text", "Hello!", "--json"],
      fake.env,
    );

    const data = JSON.parse(out);
    assert.equal(data.message_id, "msg-123");
    assert.equal(data.status, "queued");
    assert.equal(data.type, "SMS");

    const calls = readLoggedArgs(fake.logPath);
    const sendCall = calls.find((a) => a.slice(0, 2).join(" ") === "messages send");
    assert.ok(sendCall, "should call messages send");
    assertFlagValue(sendCall, "--from", "+13125550000");
    assertFlagValue(sendCall, "--to", "+13125550001");
    assertFlagValue(sendCall, "--text", "Hello!");
    assertFlagValue(sendCall, "--type", "SMS");
    assert.ok(!sendCall.includes("--media-url"), "SMS should not include --media-url");
  });

  it("send-sms with --media-url sends MMS (--type MMS)", () => {
    const fake = setupFakeTelnyx();

    const out = runAgent(
      [
        "send-sms",
        "--from", "+13125550000",
        "--to", "+13125550001",
        "--text", "see this",
        "--media-url", "https://example.com/img.png",
        "--json",
      ],
      fake.env,
    );

    const data = JSON.parse(out);
    assert.equal(data.type, "MMS");

    const calls = readLoggedArgs(fake.logPath);
    const sendCall = calls.find((a) => a.slice(0, 2).join(" ") === "messages send");
    assert.ok(sendCall, "should call messages send");
    assertFlagValue(sendCall, "--type", "MMS");
    assertFlagValue(sendCall, "--media-url", "https://example.com/img.png");
  });

  it("send-sms passes optional flags through to the Go CLI", () => {
    const fake = setupFakeTelnyx();

    runAgent(
      [
        "send-sms",
        "--from", "+13125550000",
        "--to", "+13125550001",
        "--text", "hi",
        "--messaging-profile-id", "prof-1",
        "--webhook-url", "https://example.com/wh",
        "--subject", "Sub",
        "--json",
      ],
      fake.env,
    );

    const calls = readLoggedArgs(fake.logPath);
    const sendCall = calls.find((a) => a.slice(0, 2).join(" ") === "messages send");
    assert.ok(sendCall);
    assertFlagValue(sendCall, "--messaging-profile-id", "prof-1");
    assertFlagValue(sendCall, "--webhook-url", "https://example.com/wh");
    assertFlagValue(sendCall, "--subject", "Sub");
  });

  it("schedule-sms passes --send-at to messages schedule", () => {
    const fake = setupFakeTelnyx();

    const out = runAgent(
      [
        "schedule-sms",
        "--from", "+13125550000",
        "--to", "+13125550001",
        "--text", "later",
        "--send-at", "2024-12-31T00:00:00Z",
        "--json",
      ],
      fake.env,
    );

    const data = JSON.parse(out);
    assert.equal(data.message_id, "sched-456");
    assert.equal(data.status, "scheduled");
    assert.equal(data.send_at, "2024-12-31T00:00:00Z");

    const calls = readLoggedArgs(fake.logPath);
    const schedCall = calls.find((a) => a.slice(0, 2).join(" ") === "messages schedule");
    assert.ok(schedCall, "should call messages schedule");
    assertFlagValue(schedCall, "--from", "+13125550000");
    assertFlagValue(schedCall, "--to", "+13125550001");
    assertFlagValue(schedCall, "--text", "later");
    assertFlagValue(schedCall, "--send-at", "2024-12-31T00:00:00Z");
    assert.ok(!schedCall.includes("--type"), "schedule should not include --type");
  });

  it("sms-status retrieve calls messages retrieve", () => {
    const fake = setupFakeTelnyx();

    const out = runAgent(["sms-status", "--id", "msg-123", "--json"], fake.env);

    const data = JSON.parse(out);
    assert.equal(data.message_id, "msg-123");
    assert.equal(data.status, "delivered");

    const calls = readLoggedArgs(fake.logPath);
    const retrieveCall = calls.find((a) => a.slice(0, 2).join(" ") === "messages retrieve");
    assert.ok(retrieveCall, "should call messages retrieve");
    assertFlagValue(retrieveCall, "--id", "msg-123");
    assert.ok(
      !calls.some((a) => a.slice(0, 2).join(" ") === "messages cancel-scheduled"),
      "should not call cancel-scheduled",
    );
  });

  it("sms-status --cancel calls messages cancel-scheduled", () => {
    const fake = setupFakeTelnyx();

    const out = runAgent(["sms-status", "--id", "sched-456", "--cancel", "--json"], fake.env);

    const data = JSON.parse(out);
    assert.equal(data.message_id, "sched-456");
    assert.equal(data.status, "cancelled");
    assert.equal(data.cancelled, true);

    const calls = readLoggedArgs(fake.logPath);
    const cancelCall = calls.find((a) => a.slice(0, 2).join(" ") === "messages cancel-scheduled");
    assert.ok(cancelCall, "should call messages cancel-scheduled");
    assertFlagValue(cancelCall, "--id", "sched-456");
    assert.ok(
      !calls.some((a) => a.slice(0, 2).join(" ") === "messages retrieve"),
      "should not call retrieve",
    );
  });

  it("help text includes SMS commands", () => {
    const out = execFileSync("npx", ["tsx", cliBin, "help"], {
      cwd: cliRoot,
      encoding: "utf8",
      timeout: 30000,
    });
    assert.match(out, /send-sms/);
    assert.match(out, /schedule-sms/);
    assert.match(out, /sms-status/);
  });
});
