/**
 * Mock-binary coverage for Port-Out order lifecycle wrappers.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliRoot = join(__dirname, "..");
const cliBin = join(cliRoot, "bin", "telnyx-agent.ts");

function setupFakeTelnyx(): { logPath: string; env: NodeJS.ProcessEnv } {
  const tempDir = mkdtempSync(join(tmpdir(), "telnyx-agent-portout-"));
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

if (args[0] === "portouts" && args[1] === "list") {
  console.log(JSON.stringify({
    data: [{ id: "portout-1", status: "pending", carrier_name: "Example Carrier", support_key: "PO_abc123" }],
    meta: { page_number: 2, page_size: 25, total_results: 1 }
  }));
} else if (args[0] === "portouts" && args[1] === "retrieve") {
  console.log(JSON.stringify({ data: { id: flag("--id"), status: "pending", support_key: "PO_abc123" } }));
} else if (args[0] === "portouts" && args[1] === "list-rejection-codes") {
  console.log(JSON.stringify({ data: [{ code: 1002, description: "Customer requested rejection" }] }));
} else if (args[0] === "portouts" && args[1] === "update-status") {
  console.log(JSON.stringify({ data: { id: flag("--id"), status: flag("--status"), reason: flag("--reason") } }));
} else if (args[0] === "portouts:comments" && args[1] === "create") {
  console.log(JSON.stringify({ data: { id: "comment-1", body: flag("--body") } }));
} else if (args[0] === "portouts:comments" && args[1] === "list") {
  console.log(JSON.stringify({ data: [{ id: "comment-1", body: "Review complete", user_id: "user-1" }] }));
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
      TELNYX_API_KEY: "KEY_fake_test",
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

function runFailure(args: string[], env: NodeJS.ProcessEnv): string {
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
  assert.ok(contents.endsWith("\n"), "fake binary must append a real newline to every JSON record");
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

describe("Port-Out lifecycle commands", () => {
  it("lists Port-Out orders with exact generated filters and raw envelope output", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent([
      "list-portout-orders",
      "--carrier-name", "Example Carrier",
      "--country-code", "US",
      "--country-code-in", "US,CA",
      "--foc-date", "2026-08-24",
      "--inserted-at", '{"gte":"2026-08-01T00:00:00Z"}',
      "--phone-number", "+131****0001",
      "--pon", "PON-1",
      "--ported-out-at", '{"lte":"2026-09-01T00:00:00Z"}',
      "--spid", "1234",
      "--status", "pending",
      "--status-in", '["pending","authorized"]',
      "--support-key", "PO_abc123",
      "--page-number", "2",
      "--page-size", "25",
      "--max-items", "10",
      "--json",
    ], fake.env);

    assert.deepEqual(JSON.parse(output), {
      count: 1,
      portout_orders: [{ id: "portout-1", status: "pending", carrier_name: "Example Carrier", support_key: "PO_abc123" }],
      meta: { page_number: 2, page_size: 25, total_results: 1 },
    });

    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args.slice(0, 2), ["portouts", "list"]);
    assertFlag(args, "--filter.carrier-name", "Example Carrier");
    assertFlag(args, "--filter.country-code", "US");
    assertFlag(args, "--filter.country-code-in", '["US","CA"]');
    assertFlag(args, "--filter.foc-date", "2026-08-24");
    assertFlag(args, "--filter.inserted-at", '{"gte":"2026-08-01T00:00:00Z"}');
    assertFlag(args, "--filter.phone-number", "+131****0001");
    assertFlag(args, "--filter.pon", "PON-1");
    assertFlag(args, "--filter.ported-out-at", '{"lte":"2026-09-01T00:00:00Z"}');
    assertFlag(args, "--filter.spid", "1234");
    assertFlag(args, "--filter.status", "pending");
    assertFlag(args, "--filter.status-in", '["pending","authorized"]');
    assertFlag(args, "--filter.support-key", "PO_abc123");
    assertFlag(args, "--page-number", "2");
    assertFlag(args, "--page-size", "25");
    assertFlag(args, "--max-items", "10");
    assertFlag(args, "--format", "raw");
  });

  it("supports the generated consolidated --filter object without mixing filter forms", () => {
    const fake = setupFakeTelnyx();
    runAgent(["list-portout-orders", "--filter", '{"status":"pending"}', "--json"], fake.env);
    const [args] = loggedArgs(fake.logPath);
    assertFlag(args, "--filter", '{"status":"pending"}');

    const invalidFake = setupFakeTelnyx();
    assert.match(
      runFailure([
        "list-portout-orders", "--filter", '{"status":"pending"}', "--status", "pending", "--json",
      ], invalidFake.env),
      /cannot be combined/,
    );
    assertNoCalls(invalidFake.logPath);
  });

  it("retrieves a Port-Out order by the exact upstream --id flag", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent(["get-portout-order", "--id", "portout-1", "--json"], fake.env);
    assert.deepEqual(JSON.parse(output), {
      portout_order_id: "portout-1",
      portout_order: { id: "portout-1", status: "pending", support_key: "PO_abc123" },
    });
    assert.deepEqual(loggedArgs(fake.logPath), [[
      "portouts", "retrieve", "--id", "portout-1", "--format", "json",
    ]]);
  });

  it("lists eligible rejection codes using --portout-id and --filter.code", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent([
      "list-portout-rejection-codes", "--portout-id", "portout-1", "--code", "1002", "--json",
    ], fake.env);
    assert.deepEqual(JSON.parse(output), {
      portout_id: "portout-1",
      count: 1,
      rejection_codes: [{ code: 1002, description: "Customer requested rejection" }],
    });
    assert.deepEqual(loggedArgs(fake.logPath), [[
      "portouts", "list-rejection-codes", "--portout-id", "portout-1",
      "--filter.code", "1002", "--format", "json",
    ]]);
  });

  it("requires bare confirmation for status changes and never forwards --confirm", () => {
    const noConfirm = setupFakeTelnyx();
    assert.match(
      runFailure([
        "update-portout-status", "--id", "portout-1", "--status", "authorized",
        "--reason", "Verified request", "--json",
      ], noConfirm.env),
      /bare --confirm/,
    );
    assertNoCalls(noConfirm.logPath);

    for (const value of ["true", "false"]) {
      const valuedConfirm = setupFakeTelnyx();
      assert.match(
        runFailure([
          "update-portout-status", "--id", "portout-1", "--status", "rejected-pending",
          "--reason", "Not recognized", "--confirm", value, "--json",
        ], valuedConfirm.env),
        /bare --confirm/,
      );
      assertNoCalls(valuedConfirm.logPath);
    }

    const fake = setupFakeTelnyx();
    const output = runAgent([
      "update-portout-status", "--id", "portout-1", "--status", "rejected-pending",
      "--reason", "Not recognized", "--host-messaging", "false", "--confirm", "--json",
    ], fake.env);
    assert.equal(JSON.parse(output).status, "rejected-pending");
    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args.slice(0, 2), ["portouts", "update-status"]);
    assertFlag(args, "--id", "portout-1");
    assertFlag(args, "--status", "rejected-pending");
    assertFlag(args, "--reason", "Not recognized");
    assert.ok(args.includes("--host-messaging=false"));
    assert.ok(!args.includes("--confirm"));
    assertFlag(args, "--format", "json");
  });

  it("creates and lists comments with the generated portouts:comments hierarchy", () => {
    const fake = setupFakeTelnyx();
    const created = runAgent([
      "create-portout-comment", "--id", "portout-1", "--body", "Review complete", "--json",
    ], fake.env);
    assert.deepEqual(JSON.parse(created), {
      portout_order_id: "portout-1",
      comment: { id: "comment-1", body: "Review complete" },
    });

    const listed = runAgent(["list-portout-comments", "--id", "portout-1", "--json"], fake.env);
    assert.deepEqual(JSON.parse(listed), {
      portout_order_id: "portout-1",
      count: 1,
      comments: [{ id: "comment-1", body: "Review complete", user_id: "user-1" }],
    });
    assert.deepEqual(loggedArgs(fake.logPath), [
      ["portouts:comments", "create", "--id", "portout-1", "--body", "Review complete", "--format", "json"],
      ["portouts:comments", "list", "--id", "portout-1", "--format", "json"],
    ]);
  });

  it("validates required values, generated value types, and status choices before shelling out", () => {
    const invalidCommands = [
      ["get-portout-order", "--json"],
      ["list-portout-rejection-codes", "--json"],
      ["create-portout-comment", "--id", "portout-1", "--json"],
      ["list-portout-comments", "--json"],
      ["list-portout-orders", "--inserted-at", "not-json", "--json"],
      ["list-portout-orders", "--country-code-in", "[]", "--json"],
      ["list-portout-orders", "--foc-date", "not-a-date", "--json"],
      ["list-portout-orders", "--page-size", "0", "--json"],
      ["list-portout-orders", "--max-items", "-2", "--json"],
      [
        "update-portout-status", "--id", "portout-1", "--status", "pending",
        "--reason", "No", "--confirm", "--json",
      ],
      [
        "update-portout-status", "--id", "portout-1", "--status", "authorized",
        "--reason", "No", "--host-messaging", "maybe", "--confirm", "--json",
      ],
    ];

    for (const command of invalidCommands) {
      const fake = setupFakeTelnyx();
      runFailure(command, fake.env);
      assertNoCalls(fake.logPath);
    }
  });

  it("wires all six commands into help and capabilities", () => {
    const help = runAgent(["help"]);
    const expectedCommands = [
      "list-portout-orders",
      "get-portout-order",
      "list-portout-rejection-codes",
      "update-portout-status",
      "create-portout-comment",
      "list-portout-comments",
    ];
    for (const command of expectedCommands) assert.match(help, new RegExp(command));
    assert.match(help, /--confirm\s+Required safety acknowledgement for update-portout-status/);

    const capabilities = JSON.parse(runAgent(["capabilities", "--json"]));
    const portout = capabilities.api_capabilities["🔄 Porting"].find(
      (capability: { name: string }) => capability.name === "Port-Out",
    );
    assert.deepEqual(portout.actions, [
      "list_portout_orders",
      "get_portout_order",
      "list_portout_rejection_codes",
      "update_portout_status",
      "create_portout_comment",
      "list_portout_comments",
    ]);
    for (const command of expectedCommands) {
      assert.ok(
        capabilities.composite_commands.some((entry: { name: string }) => entry.name === `telnyx-agent ${command}`),
        `capabilities should expose ${command}`,
      );
    }
  });
});
