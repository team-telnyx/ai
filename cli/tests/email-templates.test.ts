/** Mock-binary coverage for reusable Liquid email-template lifecycle wrappers. */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliRoot = join(__dirname, "..");
const cliBin = join(cliRoot, "bin", "telnyx-agent.mjs");

function setupFakeTelnyx(): { env: NodeJS.ProcessEnv; logPath: string } {
  const tempDir = mkdtempSync(join(tmpdir(), "telnyx-agent-email-templates-"));
  const binDir = join(tempDir, "bin");
  const logPath = join(tempDir, "args.jsonl");
  const fakeTelnyx = join(binDir, "telnyx");
  mkdirSync(binDir, { recursive: true });
  writeFileSync(fakeTelnyx, `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
fs.appendFileSync(process.env.TELNYX_FAKE_ARGS_LOG, JSON.stringify(args) + "\\n");
if (args[0] === "--version") {
  console.log("telnyx version 0.32.0");
  process.exit(0);
}
function flag(name) { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : undefined; }
const id = flag("--id") || "template-created";
const template = { id, name: flag("--name") || "Welcome", subject: flag("--subject") || "Hi {{name}}" };
if (args[0] !== "email-templates") {
  console.error("unexpected fake invocation: " + JSON.stringify(args));
  process.exit(2);
}
if (args[1] === "list") {
  console.log(JSON.stringify({ data: [{ id: "template-1", name: "Welcome", subject: "Hi {{name}}" }], meta: { page_size: 25, page_cursor: "next" } }));
} else if (args[1] === "delete") {
  process.exit(0);
} else if (args[1] === "render") {
  console.log(JSON.stringify({ data: { subject: "Hi Ada", html_body: "<p>Hi Ada</p>", text_body: "Hi Ada" } }));
} else if (["create", "retrieve", "update", "replace"].includes(args[1])) {
  console.log(JSON.stringify({ data: template }));
} else {
  console.error("unexpected email template action: " + JSON.stringify(args));
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
  return execFileSync(process.execPath, [cliBin, ...args], {
    cwd: cliRoot,
    env,
    encoding: "utf8",
    timeout: 30_000,
  });
}

function runCliResult(args: string[], env: NodeJS.ProcessEnv) {
  return spawnSync(process.execPath, [cliBin, ...args], {
    cwd: cliRoot,
    env,
    encoding: "utf8",
    timeout: 30_000,
  });
}

function loggedArgs(logPath: string): string[][] {
  if (!existsSync(logPath)) return [];
  const contents = readFileSync(logPath, "utf8");
  assert.ok(contents.endsWith("\n"), "fake binary should terminate each JSON record with one newline");
  assert.ok(!contents.endsWith("\n\n"), "fake binary should not append a blank JSONL record");
  assert.ok(!contents.includes("\\n"), "fake binary should write a newline, not a literal backslash-n");
  return contents.trimEnd().split("\n").map((line) => JSON.parse(line) as string[]);
}

function actionCall(logPath: string): string[] {
  const call = loggedArgs(logPath).find((args) => args[0] !== "--version");
  assert.ok(call, "expected an email-template action invocation");
  return call;
}

describe("email template lifecycle commands", () => {
  it("registers CRUD, render, help, and Email capability actions", () => {
    const fake = setupFakeTelnyx();
    const help = runCli(["help"], fake.env);
    for (const command of [
      "create-email-template", "get-email-template", "list-email-templates",
      "update-email-template", "replace-email-template", "delete-email-template", "render-email-template",
    ]) {
      assert.match(help, new RegExp(command));
    }
    assert.match(help, /--variable-schema <json\|null>/);
    assert.match(help, /--confirm\s+Required safety confirmation \(delete-email-template; never forwarded\)/);

    const capabilities = JSON.parse(runCli(["capabilities", "--json"], fake.env));
    const email = capabilities.api_capabilities["📧 Email"][0].actions as string[];
    for (const action of [
      "create_email_template", "get_email_template", "list_email_templates", "update_email_template",
      "replace_email_template", "delete_email_template", "render_email_template",
    ]) assert.ok(email.includes(action));
  });

  it("creates a template with exact generated-CLI argv and normalized JSON", () => {
    const fake = setupFakeTelnyx();
    const output = JSON.parse(runCli([
      "create-email-template",
      "--name", "Welcome Email",
      "--subject", "Hi {{ name }}",
      "--html-body", "<p>Hi {{ name }}</p>",
      "--text-body", "Hi {{ name }}",
      "--autoescape", "true",
      "--strict-variables", "false",
      "--variable-schema", '{"name":{"required":true}}',
      "--variable", '["name"]',
      "--variables-mode", "explicit",
      "--idempotency-key", "template-create-1",
      "--json",
    ], fake.env));

    assert.equal(output.email_template_id, "template-created");
    assert.deepEqual(actionCall(fake.logPath), [
      "email-templates", "create", "--name", "Welcome Email",
      "--html-body", "<p>Hi {{ name }}</p>", "--subject", "Hi {{ name }}",
      "--text-body", "Hi {{ name }}", "--variables-mode", "explicit",
      "--autoescape=true", "--strict-variables=false",
      "--variable-schema", '{"name":{"required":true}}', "--variable", '["name"]',
      "--idempotency-key", "template-create-1", "--format", "json",
    ]);
  });

  it("retrieves, lists, updates, replaces, and renders with exact generated-CLI argv", () => {
    const getFake = setupFakeTelnyx();
    const retrieved = JSON.parse(runCli(["retrieve-email-template", "--id", "template-1", "--json"], getFake.env));
    assert.equal(retrieved.email_template_id, "template-1");
    assert.deepEqual(actionCall(getFake.logPath), ["email-templates", "retrieve", "--id", "template-1", "--format", "json"]);

    const listFake = setupFakeTelnyx();
    const listed = JSON.parse(runCli([
      "list-email-templates", "--filter-autoescape", "true", "--filter-content-type", "html_only",
      "--filter-query", "welcome", "--filter-strict-variables", "false", "--page-cursor", "cursor-1",
      "--page-size", "25", "--max-items", "10", "--json",
    ], listFake.env));
    assert.equal(listed.count, 1);
    assert.deepEqual(actionCall(listFake.logPath), [
      "email-templates", "list", "--filter-autoescape", "true", "--filter-content-type", "html_only",
      "--filter-query", "welcome", "--filter-strict-variables", "false", "--page-cursor", "cursor-1",
      "--page-size", "25", "--max-items", "10", "--format", "raw",
    ]);

    const updateFake = setupFakeTelnyx();
    runCli(["update-email-template", "--id", "template-1", "--name", "Renamed", "--autoescape", "false", "--json"], updateFake.env);
    assert.deepEqual(actionCall(updateFake.logPath), [
      "email-templates", "update", "--id", "template-1", "--name", "Renamed", "--autoescape=false", "--format", "json",
    ]);

    const replaceFake = setupFakeTelnyx();
    runCli(["replace-email-template", "--id", "template-1", "--text-body", "New body", "--json"], replaceFake.env);
    assert.deepEqual(actionCall(replaceFake.logPath), [
      "email-templates", "replace", "--id", "template-1", "--text-body", "New body", "--format", "json",
    ]);

    const renderFake = setupFakeTelnyx();
    const rendered = JSON.parse(runCli(["render-email-template", "--id", "template-1", "--template-variables", '{"name":"Ada"}', "--json"], renderFake.env));
    assert.equal(rendered.rendered_template.subject, "Hi Ada");
    assert.deepEqual(actionCall(renderFake.logPath), [
      "email-templates", "render", "--id", "template-1", "--template-variables", '{"name":"Ada"}', "--format", "json",
    ]);
  });

  it("requires local delete confirmation and never forwards the local guard", () => {
    const missingConfirmation = setupFakeTelnyx();
    const denied = runCliResult(["delete-email-template", "--id", "template-1", "--json"], missingConfirmation.env);
    assert.notEqual(denied.status, 0);
    assert.match(JSON.parse(denied.stdout).error, /--confirm is required/);
    assert.deepEqual(loggedArgs(missingConfirmation.logPath), []);

    const confirmed = setupFakeTelnyx();
    assert.deepEqual(JSON.parse(runCli(["delete-email-template", "--id", "template-1", "--confirm", "--json"], confirmed.env)), {
      email_template_id: "template-1", deleted: true,
    });
    assert.deepEqual(actionCall(confirmed.logPath), ["email-templates", "delete", "--id", "template-1", "--format", "json"]);
  });

  it("rejects malformed variable schema and rendering context before invoking the Go CLI", () => {
    const schemaFake = setupFakeTelnyx();
    const invalidSchema = runCliResult([
      "create-email-template", "--name", "Invalid", "--variable-schema", "[]", "--json",
    ], schemaFake.env);
    assert.notEqual(invalidSchema.status, 0);
    assert.match(JSON.parse(invalidSchema.stdout).error, /--variable-schema must be a JSON object/);
    assert.deepEqual(loggedArgs(schemaFake.logPath), []);

    const contextFake = setupFakeTelnyx();
    const invalidContext = runCliResult([
      "render-email-template", "--id", "template-1", "--template-variables", "not-json", "--json",
    ], contextFake.env);
    assert.notEqual(invalidContext.status, 0);
    assert.match(JSON.parse(invalidContext.stdout).error, /--template-variables must be a JSON object/);
    assert.deepEqual(loggedArgs(contextFake.logPath), []);
  });
});
