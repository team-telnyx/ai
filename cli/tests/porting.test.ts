/**
 * Canonical mock-binary coverage for direct porting-order management actions.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { setupPortingCommand } from "../src/commands/setup-porting.ts";
import { parseFlags } from "../src/utils/output.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliRoot = join(__dirname, "..");
const cliBin = join(cliRoot, "bin", "telnyx-agent.ts");

function setupFakeTelnyx(): { logPath: string; env: NodeJS.ProcessEnv } {
  const tempDir = mkdtempSync(join(tmpdir(), "telnyx-agent-porting-"));
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
function flag(name) { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : undefined; }

if (args[0] === "porting-orders" && args[1] === "list") {
  console.log(JSON.stringify({
    data: [{
      id: "po-1", status: "draft", customer_reference: "migration-2026", porting_phone_numbers_count: 3,
      end_user: { admin: { pin_passcode: "list-pin-6152", name: "List Admin" } }
    }],
    meta: { page_number: 2, page_size: 25, total_results: 1 }
  }));
} else if (args[0] === "porting-orders" && args[1] === "retrieve") {
  const id = flag("--id");
  const phoneNumberFields = id === "po-array-precedence"
    ? { phone_numbers: [{ phone_number: "+131****0000" }], porting_phone_numbers_count: 99 }
    : { porting_phone_numbers_count: id === "po-zero" ? 0 : 2 };
  console.log(JSON.stringify({ data: {
    id, status: "draft", customer_reference: "migration-2026", ...phoneNumberFields,
    end_user: { admin: { pin_passcode: "retrieve-pin-4931", name: "Porting Admin" } }
  } }));
} else if (args[0] === "porting-orders" && args[1] === "update") {
  console.log(JSON.stringify({ data: {
    id: flag("--id"), status: "draft", customer_reference: flag("--customer-reference") || "migration-2026",
    phone_numbers_count: 2,
    end_user: { admin: { pinPasscode: "update-pin-8274", name: "Updated Admin" } }
  } }));
} else if (args[0] === "porting-orders:actions" && args[1] === "activate") {
  console.log(JSON.stringify({ data: {
    id: "activation-job-1", status: "in-process", activation_type: "on-demand"
  } }));
} else if (args[0] === "porting-orders:actions" && (args[1] === "confirm" || args[1] === "cancel")) {
  console.log(JSON.stringify({ data: {
    id: flag("--id"), status: args[1] === "confirm" ? "submitted" : { value: "cancel-pending" }
  } }));
} else if (args[0] === "porting-orders:additional-documents" && args[1] === "create") {
  console.log(JSON.stringify({ data: [{
    id: "attachment-1", porting_order_id: flag("--id"),
    document_id: flag("--additional-document.document-id"),
    document_type: flag("--additional-document.document-type"), filename: "loa.pdf"
  }] }));
} else if (args[0] === "porting-orders:additional-documents" && args[1] === "list") {
  console.log(JSON.stringify({
    data: [{ id: "attachment-1", porting_order_id: flag("--id"), document_id: "doc-1", document_type: "loa", filename: "loa.pdf" }],
    meta: { page_number: 1, total_results: 1 }
  }));
} else {
  console.error("unexpected fake telnyx invocation: " + args.join(" "));
  process.exit(2);
}
`,
  );
  chmodSync(fakeTelnyx, 0o755);

  return {
    logPath,
    env: {
      ...process.env,
      TELNYX_CLI_PATH: fakeTelnyx,
      TELNYX_FAKE_ARGS_LOG: logPath,
    },
  };
}

function runAgent(args: string[], env: NodeJS.ProcessEnv = process.env): string {
  return execFileSync(process.execPath, ["--import", "tsx", cliBin, ...args], {
    cwd: cliRoot,
    encoding: "utf8",
    env,
    timeout: 30_000,
  });
}

function expectFailure(args: string[], env: NodeJS.ProcessEnv): string {
  const result = spawnSync(process.execPath, ["--import", "tsx", cliBin, ...args], {
    cwd: cliRoot,
    encoding: "utf8",
    env,
    timeout: 30_000,
  });
  assert.notEqual(result.status, 0, `expected command to fail: ${args.join(" ")}`);
  return `${result.stdout}${result.stderr}`;
}

function loggedArgs(logPath: string): string[][] {
  if (!existsSync(logPath)) return [];
  const contents = readFileSync(logPath, "utf8");
  assert.ok(contents.endsWith("\n"), "fake binary should terminate each JSON record with one newline");
  assert.ok(!contents.endsWith("\n\n"), "fake binary should not write a blank JSONL record");
  return contents.trimEnd().split("\n").map((line) => JSON.parse(line) as string[]);
}

function assertFlag(args: string[], flag: string, value: string): void {
  const index = args.indexOf(flag);
  assert.notEqual(index, -1, `expected ${flag} in ${args.join(" ")}`);
  assert.equal(args[index + 1], value);
}

function assertNoCalls(logPath: string): void {
  assert.deepEqual(loggedArgs(logPath), []);
}

async function runSetupPorting(args: string[]): Promise<{ output: string; requests: string[]; status: number }> {
  const requests: string[] = [];
  const originalFetch = globalThis.fetch;
  const originalLog = console.log;
  const originalExit = process.exit;
  const originalApiKey = process.env.TELNYX_API_KEY;
  const output: string[] = [];
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    requests.push(`${init?.method ?? "GET"} ${url.pathname}`);
    if (init?.method === "POST" && url.pathname === "/v2/portability_checks") {
      return Response.json({ data: { results: [{ portable: true }] } });
    }
    if (init?.method === "POST" && url.pathname === "/v2/porting_orders") {
      return Response.json({ data: { id: "po-setup", status: "draft" } });
    }
    if (init?.method === "GET" && url.pathname === "/v2/porting_orders/po-setup/requirements") {
      return Response.json({ data: { requirements: [] } });
    }
    if (init?.method === "POST" && url.pathname === "/v2/porting_orders/po-setup/actions/confirm") {
      return Response.json({ data: { id: "po-setup", status: "submitted" } });
    }
    return Response.json({ errors: [{ detail: "unexpected request" }] }, { status: 404 });
  };
  console.log = (...values: unknown[]) => { output.push(values.join(" ")); };
  process.exit = ((code?: number) => { throw new Error(`EXIT:${code ?? 0}`); }) as typeof process.exit;
  process.env.TELNYX_API_KEY = "KEY_test";

  try {
    const { flags } = parseFlags(args);
    try {
      await setupPortingCommand(flags);
      return { output: output.join("\n"), requests, status: 0 };
    } catch (err) {
      if (err instanceof Error && err.message === "EXIT:1") {
        return { output: output.join("\n"), requests, status: 1 };
      }
      throw err;
    }
  } finally {
    globalThis.fetch = originalFetch;
    console.log = originalLog;
    process.exit = originalExit;
    if (originalApiKey === undefined) delete process.env.TELNYX_API_KEY;
    else process.env.TELNYX_API_KEY = originalApiKey;
  }
}

describe("Porting-order management commands", () => {
  it("requires a bare --submit before confirming a setup-porting order", async () => {
    const explicitFalse = await runSetupPorting([
      "setup-porting", "--phone-numbers", "+13125550001", "--submit", "false", "--json",
    ]);
    assert.equal(explicitFalse.status, 1);
    assert.match(JSON.parse(explicitFalse.output).error, /--submit does not accept a value/);
    assert.ok(!explicitFalse.requests.includes("POST /v2/porting_orders/po-setup/actions/confirm"));

    const bare = await runSetupPorting([
      "setup-porting", "--phone-numbers", "+13125550001", "--submit", "--json",
    ]);
    assert.equal(bare.status, 0);
    assert.equal(JSON.parse(bare.output).submitted, true);
    assert.ok(bare.requests.includes("POST /v2/porting_orders/po-setup/actions/confirm"));
  });

  it("lists porting orders with generated deep-object filters and stable JSON", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent([
      "list-porting-orders",
      "--customer-reference", "migration-2026",
      "--customer-group-reference", "batch-a",
      "--parent-support-key", "support-1",
      "--phone-number", "312555",
      "--country-code", "US",
      "--carrier-name", "Example Carrier",
      "--port-type", "partial",
      "--fast-port-eligible", "true",
      "--foc-after", "2026-08-03T00:00:00Z",
      "--foc-before", "2026-09-03T00:00:00Z",
      "--include-phone-numbers", "false",
      "--page-number", "2",
      "--page-size", "25",
      "--sort", "-created_at",
      "--json",
    ], fake.env);

    assert.deepEqual(JSON.parse(output), {
      count: 1,
      porting_orders: [{
        id: "po-1",
        status: "draft",
        customer_reference: "migration-2026",
        porting_phone_numbers_count: 3,
        end_user: { admin: { pin_passcode: "[REDACTED]", name: "List Admin" } },
      }],
      meta: { page_number: 2, page_size: 25, total_results: 1 },
    });

    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args.slice(0, 2), ["porting-orders", "list"]);
    assertFlag(args, "--filter.customer-reference", "migration-2026");
    assertFlag(args, "--filter.customer-group-reference", "batch-a");
    assertFlag(args, "--filter.parent-support-key", "support-1");
    assertFlag(args, "--filter.phone-numbers", JSON.stringify({
      country_code: "US",
      carrier_name: "Example Carrier",
      phone_number: { contains: "312555" },
    }));
    assertFlag(args, "--filter.misc", JSON.stringify({ type: "partial" }));
    assertFlag(args, "--filter.activation-settings", JSON.stringify({
      fast_port_eligible: true,
      foc_datetime_requested: { gt: "2026-08-03T00:00:00Z", lt: "2026-09-03T00:00:00Z" },
    }));
    assert.ok(args.includes("--include-phone-numbers=false"));
    assertFlag(args, "--page-number", "2");
    assertFlag(args, "--page-size", "25");
    assertFlag(args, "--sort.value", "-created_at");
    assertFlag(args, "--format", "raw");
  });

  it("redacts a nested porting admin pin_passcode from list JSON output", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent(["list-porting-orders", "--json"], fake.env);
    const result = JSON.parse(output);

    assert.equal(result.porting_orders[0].end_user.admin.pin_passcode, "[REDACTED]");
    assert.equal(result.porting_orders[0].end_user.admin.name, "List Admin");
    assert.doesNotMatch(output, /list-pin-6152/);
  });

  it("does not expose a porting admin PIN in human list output", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent(["list-porting-orders"], fake.env);

    assert.match(output, /po-1 — draft · migration-2026 · 3 phone number\(s\)/);
    assert.doesNotMatch(output, /list-pin-6152/);
  });

  it("retrieves a porting order under stable JSON keys", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent([
      "get-porting-order", "--id", "po-1", "--include-phone-numbers", "true", "--json",
    ], fake.env);

    const result = JSON.parse(output);
    assert.equal(result.porting_order_id, "po-1");
    assert.equal(result.porting_order.status, "draft");
    assert.equal(result.porting_order.porting_phone_numbers_count, 2);

    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args.slice(0, 2), ["porting-orders", "retrieve"]);
    assertFlag(args, "--id", "po-1");
    assert.ok(args.includes("--include-phone-numbers=true"));
    assertFlag(args, "--format", "json");
  });

  it("redacts a nested porting admin pin_passcode from get JSON output", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent(["get-porting-order", "--id", "po-1", "--json"], fake.env);
    const result = JSON.parse(output);

    assert.equal(result.porting_order.end_user.admin.pin_passcode, "[REDACTED]");
    assert.equal(result.porting_order.end_user.admin.name, "Porting Admin");
    assert.doesNotMatch(output, /retrieve-pin-4931/);
  });

  it("shows the API count when list and retrieve responses omit phone number arrays", () => {
    const listFake = setupFakeTelnyx();
    const listOutput = runAgent(["list-porting-orders"], listFake.env);
    assert.match(listOutput, /po-1 — draft · migration-2026 · 3 phone number\(s\)/);

    const retrieveFake = setupFakeTelnyx();
    const retrieveOutput = runAgent(["get-porting-order", "--id", "po-1"], retrieveFake.env);
    assert.match(retrieveOutput, /Phone Numbers\s+2 phone number\(s\)/);
  });

  it("uses phone number arrays before count fields and renders a zero count", () => {
    const precedenceFake = setupFakeTelnyx();
    const precedenceOutput = runAgent([
      "get-porting-order", "--id", "po-array-precedence",
    ], precedenceFake.env);
    assert.match(precedenceOutput, /Phone Numbers\s+1 phone number\(s\)/);
    assert.doesNotMatch(precedenceOutput, /99 phone number\(s\)/);

    const zeroFake = setupFakeTelnyx();
    const zeroOutput = runAgent(["get-porting-order", "--id", "po-zero"], zeroFake.env);
    assert.match(zeroOutput, /Phone Numbers\s+0 phone number\(s\)/);
  });

  it("updates core order and post-port number settings using generated inner flags", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent([
      "update-porting-order",
      "--id", "po-1",
      "--customer-reference", "migration-2027",
      "--customer-group-reference", "batch-b",
      "--webhook-url", "https://example.com/porting",
      "--requirement-group-id", "req-group-1",
      "--loa-document-id", "doc-loa",
      "--invoice-document-id", "doc-invoice",
      "--foc-datetime-requested", "2026-08-10T15:30:00Z",
      "--enable-messaging", "false",
      "--billing-group-id", "billing-1",
      "--connection-id", "connection-1",
      "--emergency-address-id", "address-1",
      "--messaging-profile-id", "profile-1",
      "--tags", "migration,vip",
      "--port-type", "partial",
      "--remaining-numbers-action", "keep",
      "--new-billing-phone-number", "+131****9999",
      "--json",
    ], fake.env);

    const result = JSON.parse(output);
    assert.equal(result.porting_order_id, "po-1");
    assert.equal(result.porting_order.customer_reference, "migration-2027");

    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args.slice(0, 2), ["porting-orders", "update"]);
    assertFlag(args, "--id", "po-1");
    assertFlag(args, "--customer-reference", "migration-2027");
    assertFlag(args, "--customer-group-reference", "batch-b");
    assertFlag(args, "--webhook-url", "https://example.com/porting");
    assertFlag(args, "--requirement-group-id", "req-group-1");
    assertFlag(args, "--documents.loa", "doc-loa");
    assertFlag(args, "--documents.invoice", "doc-invoice");
    assertFlag(args, "--activation-settings.foc-datetime-requested", "2026-08-10T15:30:00Z");
    assert.ok(args.includes("--messaging.enable-messaging=false"));
    assertFlag(args, "--phone-number-configuration.billing-group-id", "billing-1");
    assertFlag(args, "--phone-number-configuration.connection-id", "connection-1");
    assertFlag(args, "--phone-number-configuration.emergency-address-id", "address-1");
    assertFlag(args, "--phone-number-configuration.messaging-profile-id", "profile-1");
    assertFlag(args, "--phone-number-configuration.tags", JSON.stringify(["migration", "vip"]));
    assertFlag(args, "--misc.type", "partial");
    assertFlag(args, "--misc.remaining-numbers-action", "keep");
    assertFlag(args, "--misc.new-billing-phone-number", "+131****9999");
    assertFlag(args, "--format", "json");
  });

  it("redacts a nested camel-case porting admin pinPasscode from update JSON output", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent([
      "update-porting-order", "--id", "po-1", "--customer-reference", "migration-2027", "--json",
    ], fake.env);
    const result = JSON.parse(output);

    assert.equal(result.porting_order.end_user.admin.pinPasscode, "[REDACTED]");
    assert.equal(result.porting_order.end_user.admin.name, "Updated Admin");
    assert.doesNotMatch(output, /update-pin-8274/);
  });

  it("does not include nested porting admin passcodes in human get or update output", () => {
    const getFake = setupFakeTelnyx();
    const getOutput = runAgent(["get-porting-order", "--id", "po-1"], getFake.env);
    assert.match(getOutput, /migration-2026/);
    assert.doesNotMatch(getOutput, /retrieve-pin-4931/);

    const updateFake = setupFakeTelnyx();
    const updateOutput = runAgent([
      "update-porting-order", "--id", "po-1", "--customer-reference", "migration-2027",
    ], updateFake.env);
    assert.match(updateOutput, /migration-2027/);
    assert.doesNotMatch(updateOutput, /update-pin-8274/);
  });

  it("submits through the Go CLI confirm action and normalizes the result", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent(["submit-porting-order", "--id", "po-1", "--json"], fake.env);

    assert.deepEqual(JSON.parse(output), {
      porting_order_id: "po-1",
      action: "submit",
      status: "submitted",
      porting_order: { id: "po-1", status: "submitted" },
    });
    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args.slice(0, 2), ["porting-orders:actions", "confirm"]);
    assertFlag(args, "--id", "po-1");
    assertFlag(args, "--format", "json");
  });

  it("requires a bare --confirm before cancelling, then invokes the generated cancel action", () => {
    const fake = setupFakeTelnyx();
    const error = expectFailure(["cancel-porting-order", "--id", "po-1", "--json"], fake.env);
    assert.match(error, /pass --confirm/);
    assertNoCalls(fake.logPath);

    for (const explicitValue of ["true", "false"]) {
      const explicitFake = setupFakeTelnyx();
      const explicitError = expectFailure([
        "cancel-porting-order", "--id", "po-1", "--confirm", explicitValue, "--json",
      ], explicitFake.env);
      assert.match(explicitError, /pass --confirm/);
      assertNoCalls(explicitFake.logPath);
    }

    const output = runAgent(["cancel-porting-order", "--id", "po-1", "--confirm", "--json"], fake.env);
    assert.deepEqual(JSON.parse(output), {
      porting_order_id: "po-1",
      action: "cancel",
      status: "cancel-pending",
      porting_order: { id: "po-1", status: { value: "cancel-pending" } },
    });
    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args.slice(0, 2), ["porting-orders:actions", "cancel"]);
    assertFlag(args, "--id", "po-1");
  });

  it("activates a US FastPort order through the generated asynchronous action", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent(["activate-porting-order", "--id", "po-fastport-1", "--json"], fake.env);

    assert.deepEqual(JSON.parse(output), {
      porting_order_id: "po-fastport-1",
      action: "activate",
      status: "in-process",
      activation_job_id: "activation-job-1",
      activation_job: { id: "activation-job-1", status: "in-process", activation_type: "on-demand" },
    });
    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args.slice(0, 2), ["porting-orders:actions", "activate"]);
    assertFlag(args, "--id", "po-fastport-1");
    assertFlag(args, "--format", "json");
  });

  it("attaches an existing Telnyx document using exact additional-document inner flags", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent([
      "attach-porting-document",
      "--id", "po-1",
      "--document-id", "doc-1",
      "--document-type", "loa",
      "--json",
    ], fake.env);

    assert.deepEqual(JSON.parse(output), {
      porting_order_id: "po-1",
      attached_count: 1,
      documents: [{
        id: "attachment-1",
        porting_order_id: "po-1",
        document_id: "doc-1",
        document_type: "loa",
        filename: "loa.pdf",
      }],
    });
    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args.slice(0, 2), ["porting-orders:additional-documents", "create"]);
    assertFlag(args, "--id", "po-1");
    assertFlag(args, "--additional-document.document-id", "doc-1");
    assertFlag(args, "--additional-document.document-type", "loa");
    assertFlag(args, "--format", "json");
  });

  it("lists attached documents with type filters, pagination, and stable JSON", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent([
      "list-porting-documents",
      "--id", "po-1",
      "--document-type", "loa,invoice",
      "--page-number", "1",
      "--page-size", "10",
      "--sort", "created_at",
      "--json",
    ], fake.env);

    const result = JSON.parse(output);
    assert.equal(result.porting_order_id, "po-1");
    assert.equal(result.count, 1);
    assert.equal(result.documents[0].document_id, "doc-1");
    assert.equal(result.meta.total_results, 1);

    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args.slice(0, 2), ["porting-orders:additional-documents", "list"]);
    assertFlag(args, "--id", "po-1");
    assertFlag(args, "--filter.document-type", JSON.stringify(["loa", "invoice"]));
    assertFlag(args, "--page-number", "1");
    assertFlag(args, "--page-size", "10");
    assertFlag(args, "--sort.value", "created_at");
    assertFlag(args, "--format", "raw");
  });

  it("validates IDs, updates, dates, pagination, booleans, and document types before invoking telnyx", () => {
    const invalidCommands = [
      ["get-porting-order", "--json"],
      ["activate-porting-order", "--json"],
      ["update-porting-order", "--id", "po-1", "--json"],
      ["update-porting-order", "--id", "po-1", "--foc-datetime-requested", "tomorrow", "--json"],
      ["update-porting-order", "--id", "po-1", "--enable-messaging", "maybe", "--json"],
      ["update-porting-order", "--id", "po-1", "--port-type", "full", "--remaining-numbers-action", "disconnect", "--json"],
      ["update-porting-order", "--id", "po-1", "--remaining-numbers-action", "keep", "--json"],
      ["list-porting-orders", "--page-size", "0", "--json"],
      ["attach-porting-document", "--id", "po-1", "--document-id", "doc-1", "--document-type", "passport", "--json"],
      ["list-porting-documents", "--id", "po-1", "--document-type", "loa,passport", "--json"],
    ];

    for (const args of invalidCommands) {
      const fake = setupFakeTelnyx();
      expectFailure(args, fake.env);
      assertNoCalls(fake.logPath);
    }
  });

  it("advertises every direct porting command in help and capabilities", () => {
    const help = runAgent(["help"]);
    const capabilities = JSON.parse(runAgent(["capabilities", "--json"]));
    const commands = [
      "list-porting-orders",
      "get-porting-order",
      "update-porting-order",
      "submit-porting-order",
      "cancel-porting-order",
      "activate-porting-order",
      "attach-porting-document",
      "list-porting-documents",
    ];

    for (const command of commands) {
      assert.match(help, new RegExp(command));
      assert.ok(
        capabilities.composite_commands.some((entry: { name: string }) => entry.name === `telnyx-agent ${command}`),
        `capabilities should advertise ${command}`,
      );
    }
    const actions = capabilities.api_capabilities["🔄 Porting"][0].actions;
    for (const action of [
      "list_porting_orders",
      "get_porting_order",
      "update_porting_order",
      "submit_porting_order",
      "cancel_porting_order",
      "activate_porting_order",
      "attach_porting_document",
      "list_porting_documents",
    ]) {
      assert.ok(actions.includes(action), `Porting capabilities should include ${action}`);
    }
    assert.ok(!actions.includes("upload_porting_document"), "attach command should not claim to upload local file bytes");
  });
});
