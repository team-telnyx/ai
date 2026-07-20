/**
 * Tests for setup-10dlc's mapping to the generated Go CLI surface.
 *
 * Uses a fake `telnyx` binary so the tests can assert the exact command path
 * and arguments without making live API requests.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliRoot = join(__dirname, "..");
const cliBin = join(cliRoot, "bin", "telnyx-agent.ts");

function setupFakeTelnyx(): { logPath: string; env: NodeJS.ProcessEnv } {
  const tempDir = mkdtempSync(join(tmpdir(), "telnyx-agent-10dlc-"));
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

if (args[0] === "messaging-10dlc:brand" && args[1] === "create") {
  console.log(JSON.stringify({ data: { id: "brand-123", status: "PENDING" } }));
} else if (args[0] === "messaging-10dlc:campaign-builder" && args[1] === "submit") {
  console.log(JSON.stringify({ data: { id: "campaign-456", status: "PENDING" } }));
} else {
  console.error("Unexpected telnyx command: " + args.join(" "));
  process.exit(2);
}
`,
  );
  chmodSync(fakeTelnyx, 0o755);

  return {
    logPath,
    env: {
      ...process.env,
      PATH: `${binDir}:${process.env.PATH}`,
      TELNYX_CLI_PATH: fakeTelnyx,
      TELNYX_FAKE_ARGS_LOG: logPath,
    },
  };
}

function run(args: string[], env: NodeJS.ProcessEnv): string {
  return execFileSync("npx", ["tsx", cliBin, ...args], {
    cwd: cliRoot,
    encoding: "utf8",
    env,
    timeout: 30000,
  });
}

function readLoggedArgs(logPath: string): string[][] {
  return readFileSync(logPath, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

describe("setup-10dlc campaign submission", () => {
  it("uses campaign-builder submit and maps every explicit campaign value to its generated flag", () => {
    const fake = setupFakeTelnyx();
    const messageFlow =
      "Consumers opt in by agreeing to receive messages from Acme. Message frequency may vary. Message and data rates may apply. Reply STOP to opt out, HELP for help. We will not share your mobile information with third parties.";
    const sample1 = "Acme: Your weekly offer is ready. Reply STOP to opt out.";
    const sample2 = "Acme: Your account update is available. Reply STOP to opt out.";
    const helpMessage = "Acme support: Reply HELP or call +15551234567. Reply STOP to unsubscribe.";
    const stopMessage = "You have been unsubscribed from Acme messages. Reply START to resubscribe.";
    const startMessage = "Acme: You have resubscribed. Reply STOP to unsubscribe, HELP for help.";

    const output = run(
      [
        "setup-10dlc",
        "--phone", "+15551234567",
        "--email", "ops@acme.example",
        "--brand-name", "Acme",
        "--usecase", "MARKETING",
        "--description", "Acme customer updates",
        "--sample-message", sample1,
        "--sample-message-2", sample2,
        "--message-flow", messageFlow,
        "--help-message", helpMessage,
        "--stop-message", stopMessage,
        "--start-message", startMessage,
        "--json",
      ],
      fake.env,
    );

    const result = JSON.parse(output);
    assert.equal(result.campaign_id, "campaign-456");
    assert.equal(result.help_message, helpMessage);
    assert.equal(result.stop_message, stopMessage);
    assert.equal(result.start_message, startMessage);

    const calls = readLoggedArgs(fake.logPath);
    assert.equal(calls.length, 2);
    assert.deepEqual(calls[1], [
      "messaging-10dlc:campaign-builder",
      "submit",
      "--brand-id", "brand-123",
      "--usecase", "MARKETING",
      "--description", "Acme customer updates",
      "--sample1", sample1,
      "--message-flow", messageFlow,
      "--help-message", helpMessage,
      "--optout-message", stopMessage,
      "--optin-message", startMessage,
      "--sample2", sample2,
      "--format", "json",
    ]);
  });

  it("submits the generated HELP, STOP, and START defaults and preserves optional sample behavior", () => {
    const fake = setupFakeTelnyx();
    const brandName = "Default Brand";
    const phone = "+15557654321";
    const email = "support@default.example";
    const website = "https://default.example/sms-opt-in";
    const sample1 = "Default Brand: Your appointment is confirmed. Reply STOP to opt out.";
    const messageFlow = `Consumers opt in by submitting the web form located at ${website}. The form includes clear SMS consent language: By submitting this form, you agree to receive SMS messages from ${brandName}. Message frequency may vary. Message and data rates may apply. Reply STOP to opt out, HELP for help. We will not share your mobile information with third parties for marketing purposes.`;
    const helpMessage = `${brandName} Support: For help, reply HELP or contact us at ${email} or ${phone}. Msg & data rates may apply. Reply STOP to unsubscribe.`;
    const stopMessage = `You have been unsubscribed from ${brandName} messages. No further messages will be sent. Reply START to resubscribe.`;
    const startMessage = `${brandName}: You have resubscribed to receive SMS messages. Msg frequency may vary. Msg & data rates may apply. Reply STOP to unsubscribe, HELP for help.`;

    run(
      [
        "setup-10dlc",
        "--phone", phone,
        "--email", email,
        "--brand-name", brandName,
        "--website", website,
        "--sample-message", sample1,
        "--json",
      ],
      fake.env,
    );

    const calls = readLoggedArgs(fake.logPath);
    assert.deepEqual(calls[1], [
      "messaging-10dlc:campaign-builder",
      "submit",
      "--brand-id", "brand-123",
      "--usecase", "CUSTOMER_CARE",
      "--description", "Agent-provisioned campaign for customer communications",
      "--sample1", sample1,
      "--message-flow", messageFlow,
      "--help-message", helpMessage,
      "--optout-message", stopMessage,
      "--optin-message", startMessage,
      "--format", "json",
    ]);
  });
});
