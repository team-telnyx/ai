/**
 * Mock-binary coverage for the direct Numbers action surface.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliRoot = join(__dirname, "..");
const cliBin = join(cliRoot, "bin", "telnyx-agent.ts");

function setupFakeTelnyx(): { logPath: string; env: NodeJS.ProcessEnv } {
  const tempDir = mkdtempSync(join(tmpdir(), "telnyx-agent-numbers-"));
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

if (args[0] === "phone-numbers" && args[1] === "list") {
  console.log(JSON.stringify({
    data: [{ id: "pn-1", phone_number: "+131****0000", status: "active", phone_number_type: "local" }],
    meta: { page_number: 2, page_size: 25, total_results: 1 }
  }));
} else if (args[0] === "available-phone-numbers" && args[1] === "list") {
  console.log(JSON.stringify({
    data: [{ phone_number: "+131****0001", phone_number_type: "local", locality: "Chicago" }],
    meta: { total_results: 1 }
  }));
} else if (args[0] === "number-orders" && args[1] === "create") {
  console.log(JSON.stringify({ data: { id: "order-1", status: "pending", phone_numbers_count: 1 } }));
} else if (args[0] === "number-lookup" && args[1] === "retrieve") {
  console.log(JSON.stringify({ data: {
    phone_number: flag("--phone-number"),
    country_code: "US",
    national_format: "(312) 555-0000",
    carrier: { name: "Example Mobile", type: "mobile" },
    caller_name: { caller_name: "EXAMPLE" }
  } }));
} else if (args[0] === "phone-numbers" && args[1] === "retrieve") {
  console.log(JSON.stringify({ data: { id: flag("--id"), phone_number: "+131****0000", status: "active", connection_id: "conn-1" } }));
} else if (args[0] === "phone-numbers" && args[1] === "update") {
  console.log(JSON.stringify({ data: { id: flag("--phone-number-id"), phone_number: "+131****0000", status: "active", connection_id: flag("--connection-id") || "conn-1", tags: JSON.parse(flag("--tag") || "[]") } }));
} else if (args[0] === "phone-numbers" && args[1] === "delete") {
  console.log(JSON.stringify({ data: { id: flag("--id"), phone_number: "+131****0000", status: "deleted" } }));
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

describe("Numbers action commands", () => {
  it("lists owned numbers with current phone-numbers list filter and pagination flags", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent([
      "list-phone-numbers",
      "--phone-number", "312555",
      "--status", "active",
      "--country", "US",
      "--connection-id", "conn-1",
      "--tag", "support",
      "--source", "purchased",
      "--number-type", "local",
      "--page-number", "2",
      "--page-size", "25",
      "--json",
    ], fake.env);

    const result = JSON.parse(output);
    assert.equal(result.count, 1);
    assert.equal(result.phone_numbers[0].id, "pn-1");
    assert.equal(result.meta.total_results, 1);

    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args.slice(0, 2), ["phone-numbers", "list"]);
    assertFlag(args, "--filter.phone-number", "312555");
    assertFlag(args, "--filter.status", "active");
    assertFlag(args, "--filter.country-iso-alpha2", "US");
    assertFlag(args, "--filter.connection-id", "conn-1");
    assertFlag(args, "--filter.tag", "support");
    assertFlag(args, "--filter.source", "purchased");
    assertFlag(args, "--filter.number-type", JSON.stringify({ eq: "local" }));
    assertFlag(args, "--page-number", "2");
    assertFlag(args, "--page-size", "25");
    assertFlag(args, "--format", "raw");
  });

  it("searches available numbers with current nested filter flags and array/map values", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent([
      "search-phone-numbers",
      "--country", "US",
      "--type", "local",
      "--features", "sms,voice",
      "--area-code", "312",
      "--locality", "Chicago",
      "--administrative-area", "IL",
      "--contains", "555",
      "--starts-with", "312",
      "--limit", "5",
      "--json",
    ], fake.env);

    const result = JSON.parse(output);
    assert.equal(result.count, 1);
    assert.equal(result.phone_numbers[0].phone_number, "+131****0001");

    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args.slice(0, 2), ["available-phone-numbers", "list"]);
    assertFlag(args, "--filter.country-code", "US");
    assertFlag(args, "--filter.phone-number-type", "local");
    assertFlag(args, "--filter.features", JSON.stringify(["sms", "voice"]));
    assertFlag(args, "--filter.national-destination-code", "312");
    assertFlag(args, "--filter.locality", "Chicago");
    assertFlag(args, "--filter.administrative-area", "IL");
    assertFlag(args, "--filter.phone-number", JSON.stringify({ contains: "555", starts_with: "312" }));
    assertFlag(args, "--filter.limit", "5");
    assertFlag(args, "--format", "raw");
  });

  it("orders one number through number-orders create using generated inner flags", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent([
      "buy-phone-number",
      "--phone-number", "+131****0001",
      "--connection-id", "conn-1",
      "--messaging-profile-id", "mp-1",
      "--billing-group-id", "bg-1",
      "--customer-reference", "agent-order",
      "--bundle-id", "bundle-1",
      "--requirement-group-id", "requirements-1",
      "--json",
    ], fake.env);

    assert.deepEqual(JSON.parse(output), {
      order_id: "order-1",
      status: "pending",
      phone_number: "+131****0001",
    });

    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args.slice(0, 2), ["number-orders", "create"]);
    assertFlag(args, "--phone-number.phone-number", "+131****0001");
    assert.ok(!args.includes("--phone-number"), "a scalar --phone-number is invalid for number-orders create");
    assertFlag(args, "--connection-id", "conn-1");
    assertFlag(args, "--messaging-profile-id", "mp-1");
    assertFlag(args, "--billing-group-id", "bg-1");
    assertFlag(args, "--customer-reference", "agent-order");
    assertFlag(args, "--phone-number.bundle-id", "bundle-1");
    assertFlag(args, "--phone-number.requirement-group-id", "requirements-1");
    assertFlag(args, "--format", "json");
  });

  it("looks up a number through number-lookup retrieve and normalizes JSON", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent([
      "lookup-number",
      "--phone-number", "+131****0000",
      "--type", "carrier",
      "--json",
    ], fake.env);

    assert.deepEqual(JSON.parse(output), {
      phone_number: "+131****0000",
      country_code: "US",
      national_format: "(312) 555-0000",
      carrier: { name: "Example Mobile", type: "mobile" },
      caller_name: { caller_name: "EXAMPLE" },
    });

    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args.slice(0, 2), ["number-lookup", "retrieve"]);
    assertFlag(args, "--phone-number", "+131****0000");
    assertFlag(args, "--type", "carrier");
    assertFlag(args, "--format", "json");
  });

  it("rejects a lookup without --type before invoking telnyx", () => {
    const fake = setupFakeTelnyx();

    assert.throws(() => runAgent([
      "lookup-number",
      "--phone-number", "+131****0000",
      "--json",
    ], fake.env));
    assert.deepEqual(loggedArgs(fake.logPath), []);
  });

  it("rejects an unsupported lookup --type before invoking telnyx", () => {
    const fake = setupFakeTelnyx();

    assert.throws(() => runAgent([
      "lookup-number",
      "--phone-number", "+131****0000",
      "--type", "formatting",
      "--json",
    ], fake.env));
    assert.deepEqual(loggedArgs(fake.logPath), []);
  });

  it("retrieves an owned number and preserves the generated response envelope", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent(["phone-number", "--action", "retrieve", "--id", "pn-1", "--json"], fake.env);

    assert.deepEqual(JSON.parse(output), {
      data: { id: "pn-1", phone_number: "+131****0000", status: "active", connection_id: "conn-1" },
    });
    const human = runAgent(["phone-number", "--action", "retrieve", "--id", "pn-1"], fake.env);
    assert.match(human, /Phone number retrieved!/);
    assert.match(human, /\+131\*\*\*\*0000/);

    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args.slice(0, 2), ["phone-numbers", "retrieve"]);
    assertFlag(args, "--id", "pn-1");
    assertFlag(args, "--format", "json");
  });

  it("updates supported owned-number fields with generated update flags", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent([
      "phone-number", "--action", "update", "--id", "pn-1",
      "--connection-id", "conn-2", "--billing-group-id", "bg-1",
      "--customer-reference", "customer-ref", "--external-pin", "1234",
      "--address-id", "addr-1", "--tags", "support,voice", "--json",
    ], fake.env);

    const result = JSON.parse(output);
    assert.equal(result.data.id, "pn-1");
    assert.deepEqual(result.data.tags, ["support", "voice"]);
    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args.slice(0, 2), ["phone-numbers", "update"]);
    assertFlag(args, "--phone-number-id", "pn-1");
    assertFlag(args, "--connection-id", "conn-2");
    assertFlag(args, "--billing-group-id", "bg-1");
    assertFlag(args, "--customer-reference", "customer-ref");
    assertFlag(args, "--external-pin", "1234");
    assertFlag(args, "--address-id", "addr-1");
    assertFlag(args, "--tag", JSON.stringify(["support", "voice"]));
    assert.ok(!args.includes("--tags"));
  });

  it("requires a bare confirmation to release a number and never forwards it", () => {
    for (const confirmation of [[], ["--confirm", "true"], ["--confirm", "false"]]) {
      const fake = setupFakeTelnyx();
      assert.throws(() => runAgent([
        "phone-number", "--action", "delete", "--id", "pn-1", ...confirmation, "--json",
      ], fake.env));
      assert.deepEqual(loggedArgs(fake.logPath), []);
    }

    const fake = setupFakeTelnyx();
    const output = runAgent([
      "phone-number", "--action", "delete", "--id", "pn-1", "--confirm", "--json",
    ], fake.env);
    assert.equal(JSON.parse(output).data.status, "deleted");
    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args.slice(0, 2), ["phone-numbers", "delete"]);
    assertFlag(args, "--id", "pn-1");
    assert.ok(!args.includes("--confirm"));
  });

  it("validates lifecycle actions, IDs, tags, and unavailable generated update fields before invoking telnyx", () => {
    const invalidInvocations = [
      ["phone-number", "--id", "pn-1", "--json"],
      ["phone-number", "--action", "replace", "--id", "pn-1", "--json"],
      ["phone-number", "--action", "retrieve", "--id", "", "--json"],
      ["phone-number", "--action", "update", "--id", "pn-1", "--json"],
      ["phone-number", "--action", "update", "--id", "pn-1", "--tags", "one,,two", "--json"],
      ["phone-number", "--action", "update", "--id", "pn-1", "--emergency-address-id", "ea-1", "--json"],
      ["phone-number", "--action", "update", "--id", "pn-1", "--status", "active", "--json"],
      ["phone-number", "--action", "update", "--id", "pn-1", "--usage-payment-method", "pay-per-minute", "--json"],
    ];
    for (const invocation of invalidInvocations) {
      const fake = setupFakeTelnyx();
      assert.throws(() => runAgent(invocation, fake.env));
      assert.deepEqual(loggedArgs(fake.logPath), [], invocation.join(" "));
    }
  });

  it("advertises all five commands in help and capabilities", () => {
    const help = runAgent(["help"]);
    const capabilities = JSON.parse(runAgent(["capabilities", "--json"]));

    for (const command of ["list-phone-numbers", "phone-number", "search-phone-numbers", "buy-phone-number", "lookup-number"]) {
      assert.match(help, new RegExp(command));
      assert.ok(
        capabilities.composite_commands.some((entry: { name: string }) => entry.name === `telnyx-agent ${command}`),
        `capabilities should advertise ${command}`,
      );
    }
    assert.ok(capabilities.api_capabilities["🔢 Numbers"][0].actions.includes("retrieve_phone_number"));
    assert.ok(capabilities.api_capabilities["🔢 Numbers"][0].actions.includes("update_phone_number"));
    assert.ok(capabilities.api_capabilities["🔢 Numbers"][0].actions.includes("release_phone_number"));
    assert.match(help, /phone-number --action delete .* --confirm/);
    assert.match(help, /carrier\|caller-name \(lookup, required\)/);
    assert.match(help, /lookup-number .* --type carrier --json/);
    assert.match(help, /lookup-number .* --type caller-name --json/);
  });
});
