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
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, chmodSync, existsSync } from "node:fs";
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
function flags(f) { const out = []; for (let i = 0; i < command.length; i++) { if (command[i] === f && i + 1 < command.length) out.push(command[i + 1]); } return out; }

// Realistic Telnyx message resources: delivery state is reported per
// recipient in data.to[].status — there is NO top-level status field.
if (command[0] === "messages" && command[1] === "send") {
  console.log(JSON.stringify({ data: { id: "msg-123", record_type: "message", type: flag("--type"), from: { phone_number: flag("--from"), carrier: "", line_type: "" }, to: [{ phone_number: flag("--to"), status: "queued", carrier: "", line_type: "" }] } }));
} else if (command[0] === "messages" && command[1] === "send-group-mms") {
  const recipients = flags("--to").map((p) => ({ phone_number: p, status: "queued", carrier: "", line_type: "" }));
  console.log(JSON.stringify({ data: { id: "grp-789", record_type: "message", type: "MMS", from: { phone_number: flag("--from") }, to: recipients } }));
} else if (command[0] === "messages" && command[1] === "schedule") {
  console.log(JSON.stringify({ data: { id: "sched-456", record_type: "message", from: { phone_number: flag("--from") }, to: [{ phone_number: flag("--to"), status: "scheduled" }], send_at: flag("--send-at") } }));
} else if (command[0] === "messages" && command[1] === "retrieve") {
  console.log(JSON.stringify({ data: { id: flag("--id"), record_type: "message", direction: "outbound", to: [{ phone_number: "+13125550001", status: "delivered" }] } }));
} else if (command[0] === "messages" && command[1] === "cancel-scheduled") {
  console.log(JSON.stringify({ data: { id: flag("--id"), record_type: "message", to: [{ phone_number: "+13125550001", status: "cancelled" }] } }));
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
  if (!existsSync(logPath)) return [];
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

function runAgentExpectingFailure(args: string[], env: NodeJS.ProcessEnv, expected: RegExp): void {
  try {
    runAgent(args, env);
    assert.fail("expected command to fail (non-zero exit), but it succeeded");
  } catch (err: any) {
    assert.ok(
      err && err.status !== undefined && err.status !== 0,
      `expected non-zero exit, got ${err?.status}`,
    );
    const output = `${err.stderr ?? ""}${err.stdout ?? ""}`;
    assert.match(output, expected);
  }
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

  it("send-group-mms constructs messages send-group-mms args with --from, --to, --text", () => {
    const fake = setupFakeTelnyx();

    const out = runAgent(
      [
        "send-group-mms",
        "--from", "+131****0000",
        "--to", "+131****0001,+131****0002,+131****0003",
        "--text", "Group hi!",
        "--json",
      ],
      fake.env,
    );

    const data = JSON.parse(out);
    assert.equal(data.message_id, "grp-789");
    assert.equal(data.status, "queued");
    assert.equal(data.type, "MMS");
    assert.deepEqual(data.to, ["+131****0001", "+131****0002", "+131****0003"]);

    const calls = readLoggedArgs(fake.logPath);
    const groupCall = calls.find((a) => a.slice(0, 2).join(" ") === "messages send-group-mms");
    assert.ok(groupCall, "should call messages send-group-mms");
    assertFlagValue(groupCall, "--from", "+131****0000");
    // Recipients are expanded into repeated --to flags, one per recipient.
    const toIndices = groupCall
      .map((a, i) => (a === "--to" ? i : -1))
      .filter((i) => i >= 0);
    assert.equal(toIndices.length, 3, "should push --to once per recipient");
    assert.deepEqual(
      toIndices.map((i) => groupCall[i + 1]),
      ["+131****0001", "+131****0002", "+131****0003"],
      "each --to should carry a single recipient (not a comma-separated list)",
    );
    assertFlagValue(groupCall, "--text", "Group hi!");
    assert.ok(!groupCall.includes("--media-url"), "should not include --media-url when not provided");
  });

  it("send-group-mms with --media-url passes the flag through", () => {
    const fake = setupFakeTelnyx();

    const out = runAgent(
      [
        "send-group-mms",
        "--from", "+131****0000",
        "--to", "+131****0001,+131****0002",
        "--media-url", "https://example.com/cat.png",
        "--json",
      ],
      fake.env,
    );

    const data = JSON.parse(out);
    assert.equal(data.type, "MMS");

    const calls = readLoggedArgs(fake.logPath);
    const groupCall = calls.find((a) => a.slice(0, 2).join(" ") === "messages send-group-mms");
    assert.ok(groupCall, "should call messages send-group-mms");
    assertFlagValue(groupCall, "--media-url", "https://example.com/cat.png");
    assert.ok(!groupCall.includes("--text"), "should not include --text when not provided");
  });

  it("send-group-mms rejects --messaging-profile-id (not in the group MMS schema)", () => {
    const fake = setupFakeTelnyx();

    runAgentExpectingFailure(
      [
        "send-group-mms",
        "--from", "+131****0000",
        "--to", "+131****0001,+131****0002",
        "--text", "hi",
        "--messaging-profile-id", "prof-1",
        "--json",
      ],
      fake.env,
      /--messaging-profile-id is not supported for group MMS/,
    );

    const calls = readLoggedArgs(fake.logPath);
    assert.ok(
      !calls.some((a) => a.slice(0, 2).join(" ") === "messages send-group-mms"),
      "should not invoke the Go CLI when an unsupported flag is passed",
    );
  });

  it("send-group-mms fails without --from", () => {
    const fake = setupFakeTelnyx();

    runAgentExpectingFailure(
      ["send-group-mms", "--to", "+131****0001,+131****0002", "--text", "hi", "--json"],
      fake.env,
      /--from is required/,
    );
  });

  it("send-group-mms fails without --to", () => {
    const fake = setupFakeTelnyx();

    runAgentExpectingFailure(
      ["send-group-mms", "--from", "+131****0000", "--text", "hi", "--json"],
      fake.env,
      /--to is required/,
    );
  });

  // schedule-sms was REST-swapped from Go CLI to POST /v2/messages with send_at.
  // Tests for the REST path are in tests/schedule-sms-rest.test.ts

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

  it("derives status from recipient entries (data.to[].status)", async () => {
    const { deriveMessageStatus, recipientStatuses } = await import("../src/utils/message-status.ts");

    // Real send/retrieve responses carry status per recipient, not top-level.
    assert.equal(
      deriveMessageStatus({ to: [{ phone_number: "+1", status: "queued" }] }, "submitted"),
      "queued",
    );
    // Multiple distinct recipient statuses are all surfaced.
    assert.equal(
      deriveMessageStatus(
        { to: [{ phone_number: "+1", status: "delivered" }, { phone_number: "+2", status: "sending_failed" }] },
        "unknown",
      ),
      "delivered, sending_failed",
    );
    // Defensive: top-level status honored if recipients carry none.
    assert.equal(deriveMessageStatus({ status: "cancelled", to: [] }, "unknown"), "cancelled");
    // Fallback only when the response has no status information at all.
    assert.equal(deriveMessageStatus({}, "unknown"), "unknown");

    assert.deepEqual(recipientStatuses({ to: [{ phone_number: "+1", status: "queued" }] }), [
      { phone_number: "+1", status: "queued" },
    ]);
    assert.deepEqual(recipientStatuses({ to: "not-an-array" }), []);
  });

  it("help text includes SMS commands", () => {
    const out = execFileSync("npx", ["tsx", cliBin, "help"], {
      cwd: cliRoot,
      encoding: "utf8",
      timeout: 30000,
    });
    assert.match(out, /send-sms/);
    assert.match(out, /send-group-mms/);
    assert.match(out, /schedule-sms/);
    assert.match(out, /sms-status/);
  });
});
