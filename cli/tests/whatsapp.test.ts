/**
 * Tests for WhatsApp commands — verify correct Go CLI subcommand invocations
 * and flag passing without making real API calls.
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

/**
 * Create a fake `telnyx` binary that logs its args and returns canned JSON
 * based on the subcommand being called.
 */
function setupFakeTelnyx(): { fakeTelnyx: string; logPath: string; env: NodeJS.ProcessEnv } {
  const tempDir = mkdtempSync(join(tmpdir(), "telnyx-agent-wa-"));
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

const fmtIdx = args.indexOf("--format");
const format = fmtIdx >= 0 ? args[fmtIdx + 1] : "json";
const cmd = args.filter((a, i) => i !== fmtIdx && i !== fmtIdx + 1);

// Emulate the real Go CLI list behavior: with --format json, list commands
// route through ShowJSONIterator and print each item as a SEPARATE
// pretty-printed JSON document (concatenated — NOT a JSON array, NOT a
// { data: [...] } envelope). Only --format raw prints the REST envelope.
function printList(items) {
  if (format === "raw") {
    console.log(JSON.stringify({ data: items, meta: { total_results: items.length } }));
  } else {
    for (const item of items) console.log(JSON.stringify(item, null, 2));
  }
}

// WhatsApp Business Accounts — list
if (cmd[0] === "whatsapp:business-accounts" && cmd[1] === "list") {
  printList([{ id: "waba_test123", name: "Test WABA" }]);
}
// WhatsApp Business Account phone numbers — list
else if (cmd[0] === "whatsapp:business-accounts:phone-numbers" && cmd[1] === "list") {
  printList([]);
}
// WhatsApp Business Account phone numbers — initialize-verification
else if (cmd[0] === "whatsapp:business-accounts:phone-numbers" && cmd[1] === "initialize-verification") {
  console.log(JSON.stringify({ data: { id: "wa_ph_test", status: "pending" } }));
}
// WhatsApp phone numbers — verify
else if (cmd[0] === "whatsapp:phone-numbers" && cmd[1] === "verify") {
  console.log(JSON.stringify({ data: { phone_number: cmd[cmd.indexOf("--phone-number") + 1], status: "verified" } }));
}
// WhatsApp phone numbers — profile retrieve
else if (cmd[0] === "whatsapp:phone-numbers:profile" && cmd[1] === "retrieve") {
  console.log(JSON.stringify({ data: { display_name: "Test", about: "Hello" } }));
}
// WhatsApp phone numbers — profile update
else if (cmd[0] === "whatsapp:phone-numbers:profile" && cmd[1] === "update") {
  console.log(JSON.stringify({ data: { display_name: "Updated", status: "updated" } }));
}
// WhatsApp templates — list
else if (cmd[0] === "whatsapp:templates" && cmd[1] === "list") {
  printList([{ id: "tpl_1", name: "order_ready", language: "en_US", category: "UTILITY", status: "APPROVED" }, { id: "tpl_2", name: "order_shipped", language: "en_US", category: "UTILITY", status: "PENDING" }]);
}
// WhatsApp templates — create
else if (cmd[0] === "whatsapp:templates" && cmd[1] === "create") {
  console.log(JSON.stringify({ data: { id: "tpl_new", name: cmd[cmd.indexOf("--name") + 1], status: "PENDING" } }));
}
// Messages send-whatsapp
else if (cmd[0] === "messages" && cmd[1] === "send-whatsapp") {
  // Mirror the real Telnyx envelope: per-recipient state lives in to[0].status
  // while the top-level status is a coarse "submitted". The wrapper must
  // surface the recipient status, not the top-level one.
  console.log(JSON.stringify({ data: { id: "msg_abc123", to: [{ status: "queued" }], status: "submitted" } }));
}
// available-phone-numbers list (for setup-whatsapp number search).
// Pre-existing callers (utils/number-order.ts) still read this with
// --format json, so keep the envelope here regardless of format.
else if (cmd[0] === "available-phone-numbers" && cmd[1] === "list") {
  console.log(JSON.stringify({ data: [{ phone_number: "+15551234567" }] }));
}
// number-orders create (for setup-whatsapp number buy)
else if (cmd[0] === "number-orders" && cmd[1] === "create") {
  console.log(JSON.stringify({ data: { id: "order_123", status: "pending" } }));
}
// phone-numbers retrieve (for searchAndBuyNumber resolution)
else if (cmd[0] === "phone-numbers" && cmd[1] === "retrieve") {
  console.log(JSON.stringify({ data: { id: "ph_test123", phone_number: "+15551234567" } }));
}
// phone-numbers update
else if (cmd[0] === "phone-numbers" && cmd[1] === "update") {
  console.log(JSON.stringify({ data: { id: "ph_test123", status: "updated" } }));
}
// Fallback
else {
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
      TELNYX_CLI_PATH: fakeTelnyx,
      TELNYX_FAKE_ARGS_LOG: logPath,
      TELNYX_API_KEY: "KEY_fake_test",
    },
  };
}

/**
 * Variant that returns an existing WhatsApp phone number with status "connected"
 * so the setup-whatsapp command can skip number purchase and test the
 * verified-number reuse path.
 */
function setupFakeTelnyxWithNumbers(status: string = "connected"): { fakeTelnyx: string; logPath: string; env: NodeJS.ProcessEnv } {
  const base = setupFakeTelnyx();
  // Overwrite the fake binary to return an existing number with the given status
  writeFileSync(
    base.fakeTelnyx,
    `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
fs.appendFileSync(process.env.TELNYX_FAKE_ARGS_LOG, JSON.stringify(args) + "\\n");

const fmtIdx = args.indexOf("--format");
const format = fmtIdx >= 0 ? args[fmtIdx + 1] : "json";
const cmd = args.filter((a, i) => i !== fmtIdx && i !== fmtIdx + 1);

// Same list emulation as the base fake: --format raw returns the REST
// envelope; --format json streams concatenated per-item JSON documents.
function printList(items) {
  if (format === "raw") {
    console.log(JSON.stringify({ data: items, meta: { total_results: items.length } }));
  } else {
    for (const item of items) console.log(JSON.stringify(item, null, 2));
  }
}

if (cmd[0] === "whatsapp:business-accounts" && cmd[1] === "list") {
  printList([{ id: "waba_test123", name: "Test WABA" }]);
}
else if (cmd[0] === "whatsapp:business-accounts:phone-numbers" && cmd[1] === "list") {
  printList([{ phone_number: "+155****4567", status: "${status}", enabled: true }]);
}
else if (cmd[0] === "whatsapp:phone-numbers" && cmd[1] === "verify") {
  console.log(JSON.stringify({ data: { phone_number: "+155****4567", status: "verified" } }));
}
else if (cmd[0] === "whatsapp:phone-numbers:profile" && cmd[1] === "retrieve") {
  console.log(JSON.stringify({ data: { display_name: "Test", about: "Hello" } }));
}
else if (cmd[0] === "whatsapp:phone-numbers:profile" && cmd[1] === "update") {
  console.log(JSON.stringify({ data: { display_name: "Updated", status: "updated" } }));
}
else {
  console.log(JSON.stringify({ data: {} }));
}
`,
  );
  chmodSync(base.fakeTelnyx, 0o755);
  return base;
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

describe("WhatsApp commands", () => {
  it("help text includes WhatsApp commands", () => {
    const fake = setupFakeTelnyx();
    const output = runCli(["help"], fake.env);
    assert.ok(output.includes("setup-whatsapp"), "help must list setup-whatsapp");
    assert.ok(output.includes("whatsapp-send"), "help must list whatsapp-send");
    assert.ok(output.includes("whatsapp-templates"), "help must list whatsapp-templates");
    assert.ok(output.includes("--waba-id"), "help must document --waba-id flag");
    assert.ok(output.includes("--template-name"), "help must document --template-name flag");
  });

  it("capabilities includes WhatsApp category", () => {
    const fake = setupFakeTelnyx();
    const output = runCli(["capabilities", "--json"], fake.env);
    const data = JSON.parse(output);
    assert.ok(data.api_capabilities["💬 WhatsApp"], "capabilities must include WhatsApp category");
    assert.ok(
      data.api_capabilities["💬 WhatsApp"][0].actions.includes("send_whatsapp_message"),
      "WhatsApp capabilities must include send_whatsapp_message action",
    );
  });

  it("whatsapp-send constructs correct text message JSON and passes to Go CLI", () => {
    const fake = setupFakeTelnyx();
    const output = runCli(
      ["whatsapp-send", "--from", "+15551234567", "--to", "+15559876543", "--text", "Hello World!", "--json"],
      fake.env,
    );

    const data = JSON.parse(output);
    assert.equal(data.status, "queued");
    assert.equal(data.from, "+15551234567");
    assert.equal(data.to, "+15559876543");
    assert.equal(data.message_type, "text");

    const calls = readLoggedArgs(fake.logPath);
    const sendCall = calls.find((a) => a.slice(0, 2).join(" ") === "messages send-whatsapp");
    assert.ok(sendCall, "must call messages send-whatsapp");

    // Verify the --whatsapp-message JSON was constructed correctly
    const msgIdx = sendCall.indexOf("--whatsapp-message");
    assert.notEqual(msgIdx, -1, "must include --whatsapp-message flag");
    const msgJson = JSON.parse(sendCall[msgIdx + 1]);
    assert.equal(msgJson.type, "text");
    assert.equal(msgJson.text.body, "Hello World!");
  });

  it("whatsapp-send constructs correct template message JSON", () => {
    const fake = setupFakeTelnyx();
    runCli(
      ["whatsapp-send", "--from", "+15551234567", "--to", "+15559876543", "--template-name", "order_ready", "--template-language", "es_ES", "--json"],
      fake.env,
    );

    const calls = readLoggedArgs(fake.logPath);
    const sendCall = calls.find((a) => a.slice(0, 2).join(" ") === "messages send-whatsapp");
    assert.ok(sendCall, "must call messages send-whatsapp");

    const msgIdx = sendCall.indexOf("--whatsapp-message");
    const msgJson = JSON.parse(sendCall[msgIdx + 1]);
    assert.equal(msgJson.type, "template");
    assert.equal(msgJson.template.name, "order_ready");
    assert.equal(msgJson.template.language.code, "es_ES");
  });

  it("whatsapp-send fails without --text or --template-name", () => {
    const fake = setupFakeTelnyx();
    try {
      runCli(["whatsapp-send", "--from", "+15551234567", "--to", "+15559876543", "--json"], fake.env);
      assert.fail("should have exited with error");
    } catch (err: any) {
      assert.ok(err.status !== 0, "non-zero exit expected");
    }
  });

  it("whatsapp-templates list passes --filter.waba_id to Go CLI", () => {
    const fake = setupFakeTelnyx();
    const output = runCli(["whatsapp-templates", "--waba-id", "waba_abc", "--json"], fake.env);

    const data = JSON.parse(output);
    assert.equal(data.waba_id, "waba_abc");
    assert.ok(data.templates.length > 0, "should return templates");

    const calls = readLoggedArgs(fake.logPath);
    const listCall = calls.find((a) => a.slice(0, 2).join(" ") === "whatsapp:templates list");
    assert.ok(listCall, "must call whatsapp:templates list");
    const filterIdx = listCall.indexOf("--filter.waba_id");
    assert.notEqual(filterIdx, -1, "must include --filter.waba_id");
    assert.equal(listCall[filterIdx + 1], "waba_abc");
  });

  it("whatsapp-templates list passes --filter.status when provided", () => {
    const fake = setupFakeTelnyx();
    runCli(["whatsapp-templates", "--waba-id", "waba_abc", "--status", "APPROVED", "--json"], fake.env);

    const calls = readLoggedArgs(fake.logPath);
    const listCall = calls.find((a) => a.slice(0, 2).join(" ") === "whatsapp:templates list");
    assert.ok(listCall, "must call whatsapp:templates list");
    assert.ok(listCall!.includes("--filter.status"), "must include --filter.status");
    assert.equal(listCall![listCall!.indexOf("--filter.status") + 1], "APPROVED");
  });

  it("whatsapp-templates create passes all required flags", () => {
    const fake = setupFakeTelnyx();
    const component = '[{"type":"BODY","text":"Your order is ready"}]';
    const output = runCli(
      ["whatsapp-templates", "--waba-id", "waba_abc", "--create", "--name", "order_ready", "--language", "en_US", "--category", "UTILITY", "--component", component, "--json"],
      fake.env,
    );

    const data = JSON.parse(output);
    assert.equal(data.name, "order_ready");
    assert.equal(data.category, "UTILITY");

    const calls = readLoggedArgs(fake.logPath);
    const createCall = calls.find((a) => a.slice(0, 2).join(" ") === "whatsapp:templates create");
    assert.ok(createCall, "must call whatsapp:templates create");
    assert.equal(createCall[createCall.indexOf("--waba-id") + 1], "waba_abc");
    assert.equal(createCall[createCall.indexOf("--name") + 1], "order_ready");
    assert.equal(createCall[createCall.indexOf("--category") + 1], "UTILITY");
    assert.equal(createCall[createCall.indexOf("--component") + 1], component);
  });

  it("setup-whatsapp lists WABAs and picks the first one", () => {
    const fake = setupFakeTelnyxWithNumbers("connected");
    const output = runCli(["setup-whatsapp", "--json"], fake.env);

    const data = JSON.parse(output);
    assert.equal(data.waba_id, "waba_test123");

    const calls = readLoggedArgs(fake.logPath);
    const wabaListCall = calls.find((a) => a.slice(0, 2).join(" ") === "whatsapp:business-accounts list");
    assert.ok(wabaListCall, "must call whatsapp:business-accounts list");
  });

  it("setup-whatsapp with --code verifies a pending number", () => {
    const fake = setupFakeTelnyxWithNumbers("pending");
    runCli(["setup-whatsapp", "--code", "123456", "--json"], fake.env);

    const calls = readLoggedArgs(fake.logPath);
    const verifyCall = calls.find((a) => a.slice(0, 2).join(" ") === "whatsapp:phone-numbers verify");
    assert.ok(verifyCall, "must call whatsapp:phone-numbers verify when --code is provided");
    assert.equal(verifyCall![verifyCall!.indexOf("--code") + 1], "123456");
  });

  it("setup-whatsapp with --display-name and --category updates the profile", () => {
    const fake = setupFakeTelnyxWithNumbers("connected");
    runCli(["setup-whatsapp", "--display-name", "Acme", "--category", "RETAIL", "--json"], fake.env);

    const calls = readLoggedArgs(fake.logPath);
    const profileCall = calls.find((a) => a.slice(0, 2).join(" ") === "whatsapp:phone-numbers:profile update");
    assert.ok(profileCall, "must call profile update when profile flags are provided");
    assert.equal(profileCall![profileCall!.indexOf("--display-name") + 1], "Acme");
    assert.equal(profileCall![profileCall!.indexOf("--category") + 1], "RETAIL");
  });

  it("setup-whatsapp reports ready=true when number is connected (no --code needed)", () => {
    const fake = setupFakeTelnyxWithNumbers("connected");
    const output = runCli(["setup-whatsapp", "--json"], fake.env);
    const data = JSON.parse(output);
    assert.equal(data.verified, true);
    assert.equal(data.ready, true);
  });

  it("setup-whatsapp reports ready=false when number is pending and no --code", () => {
    const fake = setupFakeTelnyxWithNumbers("pending");
    const output = runCli(["setup-whatsapp", "--json"], fake.env);
    const data = JSON.parse(output);
    assert.equal(data.verified, false);
    assert.equal(data.ready, false);
  });

  it("setup-whatsapp requests --format raw for list commands (json list output is concatenated docs)", () => {
    const fake = setupFakeTelnyxWithNumbers("connected");
    const output = runCli(["setup-whatsapp", "--json"], fake.env);

    // The fake CLI mirrors the real one: list commands only return the
    // { data: [...] } envelope with --format raw. If the command regressed
    // to --format json, the WABA list would parse as a single bare item
    // (or fail entirely with multiple items) and setup would find no WABA.
    const data = JSON.parse(output);
    assert.equal(data.waba_id, "waba_test123");

    const calls = readLoggedArgs(fake.logPath);
    for (const subcommand of ["whatsapp:business-accounts", "whatsapp:business-accounts:phone-numbers"]) {
      const call = calls.find((a) => a[0] === subcommand && a[1] === "list");
      assert.ok(call, `must call ${subcommand} list`);
      const fmtIdx = call!.indexOf("--format");
      assert.notEqual(fmtIdx, -1, `${subcommand} list must pass --format`);
      assert.equal(call![fmtIdx + 1], "raw", `${subcommand} list must use --format raw`);
    }
  });

  it("whatsapp-templates list requests --format raw and parses the data envelope", () => {
    const fake = setupFakeTelnyx();
    const output = runCli(["whatsapp-templates", "--waba-id", "waba_abc", "--json"], fake.env);

    const data = JSON.parse(output);
    assert.equal(data.templates.length, 2, "must parse all templates from the data envelope");

    const calls = readLoggedArgs(fake.logPath);
    const listCall = calls.find((a) => a.slice(0, 2).join(" ") === "whatsapp:templates list");
    assert.ok(listCall, "must call whatsapp:templates list");
    const fmtIdx = listCall!.indexOf("--format");
    assert.equal(listCall![fmtIdx + 1], "raw", "templates list must use --format raw");
  });
});
