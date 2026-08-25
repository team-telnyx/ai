/** Mock-binary coverage for outbound email and inbox forward/reply wrappers. */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliRoot = join(__dirname, "..");
const cliBin = join(cliRoot, "bin", "telnyx-agent.ts");

function setupFakeTelnyx(version = "0.27.0"): { env: NodeJS.ProcessEnv; logPath: string } {
  const tempDir = mkdtempSync(join(tmpdir(), "telnyx-agent-email-"));
  const binDir = join(tempDir, "bin");
  const logPath = join(tempDir, "args.jsonl");
  const fakeTelnyx = join(binDir, "telnyx");
  mkdirSync(binDir, { recursive: true });
  writeFileSync(fakeTelnyx, `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
fs.appendFileSync(process.env.TELNYX_FAKE_ARGS_LOG, JSON.stringify(args) + "\\n");
if (args.length === 1 && args[0] === "--version") {
  console.log("telnyx version ${version}");
} else if (args[0] === "email-messages" && args[1] === "create") {
  console.log(JSON.stringify({ data: { id: "email-out-1", status: "queued" } }));
} else if (args[0] === "email-inboxes:messages:actions") {
  console.log(JSON.stringify({ data: { id: "email-action-1", status: "queued" } }));
} else {
  console.error("unexpected fake invocation: " + JSON.stringify(args));
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

function runCli(args: string[], env: NodeJS.ProcessEnv): string {
  return execFileSync("npx", ["tsx", cliBin, ...args], {
    cwd: cliRoot,
    env,
    encoding: "utf8",
    timeout: 30_000,
  });
}

function runCliResult(args: string[], env: NodeJS.ProcessEnv) {
  return spawnSync("npx", ["tsx", cliBin, ...args], {
    cwd: cliRoot,
    env,
    encoding: "utf8",
    timeout: 30_000,
  });
}

function loggedArgs(logPath: string): string[][] {
  return readFileSync(logPath, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as string[]);
}

function actionCall(logPath: string): string[] {
  const call = loggedArgs(logPath).find((args) => args[0] !== "--version");
  assert.ok(call, "expected an email action invocation");
  return call;
}

function flagValues(args: string[], name: string): string[] {
  const values: string[] = [];
  for (let index = 0; index < args.length - 1; index++) {
    if (args[index] === name) values.push(args[index + 1]);
  }
  return values;
}

describe("email action commands", () => {
  it("registers commands, help, and Email capabilities", () => {
    const fake = setupFakeTelnyx();
    const help = runCli(["help"], fake.env);
    for (const command of ["email-send", "email-forward", "email-reply", "email-reply-all"]) {
      assert.match(help, new RegExp(command));
    }
    assert.match(help, /--attachment <json>\s+Attachment object; repeat/);
    assert.match(help, /--scheduled-at <iso8601>/);
    assert.match(help, /--to <email\|json>\s+Recipient; repeat/);

    const capabilities = JSON.parse(runCli(["capabilities", "--json"], fake.env));
    const email = capabilities.api_capabilities["📧 Email"];
    assert.ok(email, "Email capability category must be present");
    assert.deepEqual(email[0].actions, ["send_email", "forward_email", "reply_email", "reply_all_email"]);
    const commandNames = capabilities.composite_commands.map((entry: { name: string }) => entry.name);
    assert.ok(commandNames.includes("telnyx-agent email-send"));
    assert.ok(commandNames.includes("telnyx-agent email-reply-all"));
  });

  it("email-send forwards repeatable recipients, attachments, content, and scheduling fields", () => {
    const fake = setupFakeTelnyx();
    const attachmentOne = '{"content":"Zmlyc3Q=","filename":"first.txt"}';
    const attachmentTwo = '{"content":"c2Vjb25k","filename":"second.txt","content_type":"text/plain"}';
    const namedRecipient = '{"email":"bob@example.com","name":"Bob"}';
    const output = JSON.parse(runCli([
      "email-send",
      "--from", "sender@example.com",
      "--to", "alice@example.com",
      "--to", namedRecipient,
      "--cc", "copy@example.com",
      "--bcc", "blind@example.com",
      "--subject", "Quarterly update",
      "--text-body", "Plain body",
      "--html-body", "<p>HTML body</p>",
      "--attachment", attachmentOne,
      "--attachment", attachmentTwo,
      "--scheduled-at", "2026-08-18T12:00:00Z",
      "--reply-to", "replies@example.com",
      "--tag", "quarterly",
      "--tag", "customer",
      "--metadata", '{"campaign":"q3"}',
      "--headers", '{"X-Campaign":"q3"}',
      "--tracking-settings", '{"open_tracking":true}',
      "--idempotency-key", "email-key-1",
      "--inline-css", "true",
      "--sandbox-mode", "false",
      "--json",
    ], fake.env));

    assert.deepEqual(output, {
      email_id: "email-out-1",
      status: "queued",
      from: "sender@example.com",
      to: ["alice@example.com", namedRecipient],
    });

    const call = actionCall(fake.logPath);
    assert.deepEqual(call.slice(0, 2), ["email-messages", "create"]);
    assert.deepEqual(flagValues(call, "--to"), ["alice@example.com", namedRecipient]);
    assert.deepEqual(flagValues(call, "--cc"), ["copy@example.com"]);
    assert.deepEqual(flagValues(call, "--bcc"), ["blind@example.com"]);
    assert.deepEqual(flagValues(call, "--attachment"), [attachmentOne, attachmentTwo]);
    assert.deepEqual(flagValues(call, "--tag"), ["quarterly", "customer"]);
    assert.ok(call.includes("--inline-css=true"));
    assert.ok(call.includes("--sandbox-mode=false"));
    assert.ok(call.includes("--format"));
    assert.equal(call[call.indexOf("--scheduled-at") + 1], "2026-08-18T12:00:00Z");
    assert.equal(call[call.indexOf("--text-body") + 1], "Plain body");
    assert.equal(call[call.indexOf("--html-body") + 1], "<p>HTML body</p>");
  });

  it("email-send permits a template instead of a subject", () => {
    const fake = setupFakeTelnyx();
    runCli([
      "email-send",
      "--from", "sender@example.com",
      "--to", "alice@example.com",
      "--template-id", "template-1",
      "--template-variables", '{"name":"Alice"}',
      "--json",
    ], fake.env);

    const call = actionCall(fake.logPath);
    assert.equal(call[call.indexOf("--template-id") + 1], "template-1");
    assert.equal(call[call.indexOf("--template-variables") + 1], '{"name":"Alice"}');
    assert.ok(!call.includes("--subject"));
  });

  it("email-forward packs repeatable recipients into generated-CLI arrays", () => {
    const fake = setupFakeTelnyx();
    const output = JSON.parse(runCli([
      "email-forward",
      "--inbox-id", "inbox-1",
      "--message-id", "received-1",
      "--to", "alice@example.com",
      "--to", '{"email":"bob@example.com","name":"Bob"}',
      "--cc", "copy@example.com",
      "--cc", '["copy-two@example.com"]',
      "--bcc", "blind@example.com",
      "--text", "FYI",
      "--html", "<p>FYI</p>",
      "--json",
    ], fake.env));

    assert.equal(output.action, "forward");
    assert.equal(output.source_message_id, "received-1");
    const call = actionCall(fake.logPath);
    assert.deepEqual(call, [
      "email-inboxes:messages:actions", "forward",
      "--inbox-id", "inbox-1",
      "--message-id", "received-1",
      "--to", '["alice@example.com",{"email":"bob@example.com","name":"Bob"}]',
      "--bcc", '["blind@example.com"]',
      "--cc", '["copy@example.com","copy-two@example.com"]',
      "--html", "<p>FYI</p>",
      "--text", "FYI",
      "--format", "json",
    ]);
  });

  it("email-reply and email-reply-all target distinct generated actions", () => {
    const replyFake = setupFakeTelnyx();
    const reply = JSON.parse(runCli([
      "email-reply", "--inbox-id", "inbox-1", "--message-id", "received-1",
      "--text", "Thanks", "--html", "<p>Thanks</p>", "--json",
    ], replyFake.env));
    assert.equal(reply.action, "reply");
    assert.deepEqual(actionCall(replyFake.logPath), [
      "email-inboxes:messages:actions", "reply",
      "--inbox-id", "inbox-1", "--message-id", "received-1",
      "--html", "<p>Thanks</p>", "--text", "Thanks", "--format", "json",
    ]);

    const replyAllFake = setupFakeTelnyx();
    const replyAll = JSON.parse(runCli([
      "email-reply-all", "--inbox-id", "inbox-2", "--message-id", "received-2",
      "--text", "Thanks all", "--json",
    ], replyAllFake.env));
    assert.equal(replyAll.action, "reply-all");
    assert.deepEqual(actionCall(replyAllFake.logPath), [
      "email-inboxes:messages:actions", "reply-all",
      "--inbox-id", "inbox-2", "--message-id", "received-2",
      "--text", "Thanks all", "--format", "json",
    ]);
  });

  it("validates required fields before invoking the Go CLI", () => {
    const fake = setupFakeTelnyx();
    const missingSubject = runCliResult([
      "email-send", "--from", "sender@example.com", "--to", "alice@example.com", "--json",
    ], fake.env);
    assert.notEqual(missingSubject.status, 0);
    assert.match(JSON.parse(missingSubject.stdout).error, /--subject is required unless --template-id/);

    const missingTo = runCliResult([
      "email-forward", "--inbox-id", "inbox-1", "--message-id", "received-1", "--json",
    ], fake.env);
    assert.notEqual(missingTo.status, 0);
    assert.match(JSON.parse(missingTo.stdout).error, /--to is required/);
  });

  it("requires Go CLI v0.27 without changing the bundled platform pin", () => {
    const fake = setupFakeTelnyx("0.26.9");
    const result = runCliResult([
      "email-reply", "--inbox-id", "inbox-1", "--message-id", "received-1", "--text", "Hi", "--json",
    ], fake.env);
    assert.notEqual(result.status, 0);
    assert.match(JSON.parse(result.stdout).error, /requires >= 0\.27\.0/);
    assert.deepEqual(loggedArgs(fake.logPath), [["--version"]]);
  });
});
