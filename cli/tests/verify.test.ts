/**
 * Mock-binary tests for telnyx-agent verify-send / verify-check commands.
 *
 * Uses a fake `telnyx` binary (installed on PATH) that records the args it
 * receives and returns canned JSON responses, mirroring the approach in
 * telnyx-cli-flags.test.ts.
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
  const tempDir = mkdtempSync(join(tmpdir(), "telnyx-agent-verify-"));
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

// Strip --format json for command inspection
const cmd = args.filter((a) => a !== "--format" && a !== "json");

const joined = cmd.join(" ");

if (joined.startsWith("verifications trigger-sms")) {
  console.log(JSON.stringify({ data: { id: "ver_sms_123", record_type: "verification", status: "pending" } }));
} else if (joined.startsWith("verifications trigger-call")) {
  console.log(JSON.stringify({ data: { id: "ver_call_456", record_type: "verification", status: "pending" } }));
} else if (joined.startsWith("verifications trigger-flashcall")) {
  console.log(JSON.stringify({ data: { id: "ver_flash_789", record_type: "verification", status: "pending" } }));
} else if (joined.startsWith("verifications:actions verify")) {
  // POST /verifications/{id}/actions/verify returns only phone_number and
  // response_code ("accepted" | "rejected") — no status field.
  const code = cmd[cmd.indexOf("--code") + 1];
  const responseCode = code === "000000" ? "rejected" : "accepted";
  console.log(JSON.stringify({ data: { phone_number: "+13125550001", response_code: responseCode } }));
} else if (joined.startsWith("verifications retrieve")) {
  console.log(JSON.stringify({ data: { id: cmd[cmd.indexOf("--verification-id") + 1], status: "pending", custom_code: "123456" } }));
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

function runCli(args: string[], env: NodeJS.ProcessEnv): string {
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

describe("verify-send command", () => {
  it("--method sms calls verifications trigger-sms", () => {
    const fake = setupFakeTelnyx();
    const out = runCli(
      ["verify-send", "--phone-number", "+13125550001", "--verify-profile-id", "prof_abc", "--method", "sms", "--json"],
      fake.env,
    );
    const data = JSON.parse(out);
    assert.equal(data.method, "sms");
    assert.equal(data.verification_id, "ver_sms_123");
    assert.equal(data.phone_number, "+13125550001");

    const calls = readLoggedArgs(fake.logPath);
    assert.equal(calls.length, 1, "verify-send should make exactly one CLI call");
    const call = calls[0];
    assert.equal(call.slice(0, 2).join(" "), "verifications trigger-sms",
      "should call verifications trigger-sms");
    assertFlagValue(call, "--phone-number", "+13125550001");
    assertFlagValue(call, "--verify-profile-id", "prof_abc");
  });

  it("--method call calls verifications trigger-call and forwards --extension", () => {
    const fake = setupFakeTelnyx();
    const out = runCli(
      ["verify-send", "--phone-number", "+13125550001", "--verify-profile-id", "prof_abc",
       "--method", "call", "--extension", "1234", "--json"],
      fake.env,
    );
    const data = JSON.parse(out);
    assert.equal(data.method, "call");
    assert.equal(data.verification_id, "ver_call_456");

    const calls = readLoggedArgs(fake.logPath);
    const call = calls[0];
    assert.equal(call.slice(0, 2).join(" "), "verifications trigger-call");
    assertFlagValue(call, "--extension", "1234");
  });

  it("--method flashcall calls verifications trigger-flashcall and omits --custom-code", () => {
    const fake = setupFakeTelnyx();
    const out = runCli(
      ["verify-send", "--phone-number", "+13125550001", "--verify-profile-id", "prof_abc", "--method", "flashcall", "--json"],
      fake.env,
    );
    const data = JSON.parse(out);
    assert.equal(data.method, "flashcall");
    assert.equal(data.verification_id, "ver_flash_789");

    const calls = readLoggedArgs(fake.logPath);
    const call = calls[0];
    assert.equal(call.slice(0, 2).join(" "), "verifications trigger-flashcall");
    assert.ok(!call.includes("--custom-code"), "flashcall must not pass --custom-code");
  });

  it("rejects --method whatsapp (not supported by the pinned telnyx CLI)", () => {
    const fake = setupFakeTelnyx();
    assert.throws(
      () => runCli(
        ["verify-send", "--phone-number", "+13125550001", "--verify-profile-id", "prof_abc",
         "--method", "whatsapp", "--json"],
        fake.env,
      ),
      /Command failed|exit code|Invalid --method/,
    );
  });

  it("forwards --custom-code and --timeout-secs when provided (sms)", () => {
    const fake = setupFakeTelnyx();
    runCli(
      ["verify-send", "--phone-number", "+13125550001", "--verify-profile-id", "prof_abc",
       "--method", "sms", "--custom-code", "424242", "--timeout-secs", "120", "--json"],
      fake.env,
    );
    const call = readLoggedArgs(fake.logPath)[0];
    assertFlagValue(call, "--custom-code", "424242");
    assertFlagValue(call, "--timeout-secs", "120");
  });

  it("rejects an invalid --method", () => {
    const fake = setupFakeTelnyx();
    assert.throws(
      () => runCli(
        ["verify-send", "--phone-number", "+131****0001", "--verify-profile-id", "prof_abc", "--method", "carrier-pigeon", "--json"],
        fake.env,
      ),
      /Command failed|exit code|Invalid --method/,
    );
  });
});

describe("verify-check command", () => {
  it("with --code calls verifications:actions verify", () => {
    const fake = setupFakeTelnyx();
    const out = runCli(
      ["verify-check", "--verification-id", "ver_abc", "--code", "123456", "--json"],
      fake.env,
    );
    const data = JSON.parse(out);
    assert.equal(data.mode, "verify");
    assert.equal(data.verification_id, "ver_abc");
    assert.equal(data.response_code, "accepted");
    assert.equal(data.verified, true);

    const calls = readLoggedArgs(fake.logPath);
    assert.equal(calls.length, 1);
    const call = calls[0];
    assert.equal(call.slice(0, 2).join(" "), "verifications:actions verify",
      "should call verifications:actions verify");
    assertFlagValue(call, "--verification-id", "ver_abc");
    assertFlagValue(call, "--code", "123456");
  });

  it("with --code reports a rejected code as not verified", () => {
    const fake = setupFakeTelnyx();
    const out = runCli(
      ["verify-check", "--verification-id", "ver_abc", "--code", "000000", "--json"],
      fake.env,
    );
    const data = JSON.parse(out);
    assert.equal(data.mode, "verify");
    assert.equal(data.response_code, "rejected");
    assert.equal(data.verified, false);
  });

  it("without --code calls verifications retrieve", () => {
    const fake = setupFakeTelnyx();
    const out = runCli(
      ["verify-check", "--verification-id", "ver_abc", "--json"],
      fake.env,
    );
    const data = JSON.parse(out);
    assert.equal(data.mode, "retrieve");
    assert.equal(data.verification_id, "ver_abc");
    assert.equal(data.status, "pending");
    assert.equal(data.verified, undefined, "retrieve mode should not derive a verified boolean");

    const calls = readLoggedArgs(fake.logPath);
    assert.equal(calls.length, 1);
    const call = calls[0];
    assert.equal(call.slice(0, 2).join(" "), "verifications retrieve",
      "should call verifications retrieve");
    assertFlagValue(call, "--verification-id", "ver_abc");
    assert.ok(!call.includes("--code"), "retrieve must not pass --code");
  });

  it("redacts custom_code from --json output", () => {
    const fake = setupFakeTelnyx();
    const out = runCli(["verify-check", "--verification-id", "ver_abc", "--json"], fake.env);
    const data = JSON.parse(out);
    assert.equal(data.response.custom_code, undefined,
      "raw response must not include the OTP custom_code");
    assert.ok(!out.includes("123456"), "OTP value must not appear anywhere in output");
    assert.equal(data.response.status, "pending", "other response fields are preserved");
  });
});

describe("help text", () => {
  it("includes verify-send and verify-check commands", () => {
    const fake = setupFakeTelnyx();
    const out = runCli(["help"], fake.env);
    assert.ok(out.includes("verify-send"), "help should list verify-send");
    assert.ok(out.includes("verify-check"), "help should list verify-check");
    assert.ok(out.includes("--method"), "help should document --method flag");
    assert.ok(out.includes("--verification-id"), "help should document --verification-id flag");
  });

  it("capabilities lists verify composite commands and actions", () => {
    const fake = setupFakeTelnyx();
    const out = runCli(["capabilities", "--json"], fake.env);
    const data = JSON.parse(out);
    const compositeNames = data.composite_commands.map((c: { name: string }) => c.name);
    assert.ok(compositeNames.includes("telnyx-agent verify-send"),
      "capabilities should include verify-send composite command");
    assert.ok(compositeNames.includes("telnyx-agent verify-check"),
      "capabilities should include verify-check composite command");

    const verifyActions = (data.api_capabilities["✅ Verify"] as { actions: string[] }[])
      .flatMap((c) => c.actions);
    assert.ok(verifyActions.includes("send_verification_sms"));
    assert.ok(verifyActions.includes("send_verification_call"));
    assert.ok(verifyActions.includes("send_verification_flashcall"));
    assert.ok(!verifyActions.includes("send_verification_whatsapp"),
      "whatsapp is not supported by the pinned telnyx CLI (0.11.0)");
    assert.ok(verifyActions.includes("verify_code"));
    assert.ok(verifyActions.includes("check_verification_status"));
  });
});
