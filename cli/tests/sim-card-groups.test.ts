/** Mock-binary coverage for SIM card group lifecycle and assignment wrappers. */
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
  const tempDir = mkdtempSync(join(tmpdir(), "telnyx-agent-sim-card-groups-"));
  const binDir = join(tempDir, "bin");
  const logPath = join(tempDir, "args.jsonl");
  mkdirSync(binDir, { recursive: true });
  const fakeTelnyx = join(binDir, "telnyx");
  writeFileSync(fakeTelnyx, `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
fs.appendFileSync(process.env.TELNYX_FAKE_ARGS_LOG, JSON.stringify(args) + "\\n");
function flag(name) { const i = args.indexOf(name); return i < 0 ? undefined : args[i + 1]; }
if (args[0] === "sim-card-groups" && args[1] === "list") {
  console.log(JSON.stringify({ data: [{ id: "group-1", name: "Fleet", data_limit: { amount: "2", unit: "GB" } }], meta: { page_number: 2, page_size: 10, total_results: 1 } }));
} else if (args[0] === "sim-card-groups" && args[1] === "delete") {
  console.log(JSON.stringify({ data: { id: flag("--id"), deleted_at: "2026-10-19T12:00:00Z" } }));
} else if (args[0] === "sim-card-groups") {
  console.log(JSON.stringify({ data: { id: args[1] === "create" ? "group-new" : flag("--id"), name: flag("--name") || "Fleet", iccids: ["89310410106543789301"], data_limit: { amount: flag("--data-limit.amount") || "2", unit: flag("--data-limit.unit") || "GB" } } }));
} else if (args[0] === "sim-cards" && args[1] === "update") {
  console.log(JSON.stringify({ data: { id: flag("--sim-card-id"), sim_card_group_id: flag("--sim-card-group-id"), status: { value: "enabled" } } }));
} else {
  console.error("unexpected fake telnyx invocation: " + args.join(" "));
  process.exit(2);
}
`);
  chmodSync(fakeTelnyx, 0o755);
  return { logPath, env: { ...process.env, TELNYX_CLI_PATH: fakeTelnyx, TELNYX_FAKE_ARGS_LOG: logPath } };
}

function runAgent(args: string[], env: NodeJS.ProcessEnv): string {
  return execFileSync("npx", ["tsx", cliBin, ...args], { cwd: cliRoot, encoding: "utf8", env, timeout: 30_000 });
}

function runAgentResult(args: string[], env: NodeJS.ProcessEnv): ReturnType<typeof spawnSync> {
  return spawnSync("npx", ["tsx", cliBin, ...args], { cwd: cliRoot, encoding: "utf8", env, timeout: 30_000 });
}

function commandStdout(result: ReturnType<typeof spawnSync>): string {
  return typeof result.stdout === "string" ? result.stdout : result.stdout.toString("utf8");
}

function loggedArgs(logPath: string): string[][] {
  if (!existsSync(logPath)) return [];
  const contents = readFileSync(logPath, "utf8");
  assert.ok(contents.endsWith("\n"), "fake binary should terminate its JSONL record with one newline");
  assert.ok(!contents.endsWith("\n\n"), "fake binary should not write a blank JSONL record");
  return contents.trimEnd().split("\n").map((line) => JSON.parse(line) as string[]);
}

function assertFlag(args: string[], flag: string, value: string): void {
  const index = args.indexOf(flag);
  assert.notEqual(index, -1, `expected ${flag} in ${args.join(" ")}`);
  assert.equal(args[index + 1], value);
}

describe("SIM card group commands", () => {
  it("creates a group with validated data limits and preserves JSON", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent(["sim-card-group", "--action", "create", "--name", "Fleet", "--data-limit-amount", "2", "--data-limit-unit", "GB", "--json"], fake.env);
    assert.deepEqual(JSON.parse(output), {
      sim_card_group_id: "group-new",
      sim_card_group: { id: "group-new", name: "Fleet", iccids: ["89310410106543789301"], data_limit: { amount: "2", unit: "GB" } },
    });
    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args.slice(0, 2), ["sim-card-groups", "create"]);
    assertFlag(args, "--name", "Fleet");
    assertFlag(args, "--data-limit.amount", "2");
    assertFlag(args, "--data-limit.unit", "GB");
  });

  it("retrieves and updates groups with their useful generated flags", () => {
    const fake = setupFakeTelnyx();
    const retrieved = runAgent(["sim-card-group", "--action", "retrieve", "--id", "group-1", "--include-iccids", "true", "--json"], fake.env);
    assert.equal(JSON.parse(retrieved).sim_card_group.iccids[0], "89310410106543789301");
    const updated = runAgent(["sim-card-group", "--action", "update", "--id", "group-1", "--name", "Fleet West"], fake.env);
    assert.match(updated, /SIM card group updated!/);

    const [retrieveArgs, updateArgs] = loggedArgs(fake.logPath);
    assert.deepEqual(retrieveArgs.slice(0, 2), ["sim-card-groups", "retrieve"]);
    assertFlag(retrieveArgs, "--id", "group-1");
    assert.ok(retrieveArgs.includes("--include-iccids=true"));
    assert.deepEqual(updateArgs.slice(0, 2), ["sim-card-groups", "update"]);
    assertFlag(updateArgs, "--id", "group-1");
    assertFlag(updateArgs, "--name", "Fleet West");
  });

  it("lists groups with generated filters and raw envelope preservation", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent([
      "sim-card-group", "--action", "list", "--filter-name", "Fleet", "--filter-private-wireless-gateway-id", "gateway-1", "--filter-wireless-blocklist-id", "blocklist-1", "--page-number", "2", "--page-size", "10", "--json",
    ], fake.env);
    assert.deepEqual(JSON.parse(output), {
      count: 1,
      sim_card_groups: [{ id: "group-1", name: "Fleet", data_limit: { amount: "2", unit: "GB" } }],
      meta: { page_number: 2, page_size: 10, total_results: 1 },
    });
    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args.slice(0, 2), ["sim-card-groups", "list"]);
    assertFlag(args, "--filter-name", "Fleet");
    assertFlag(args, "--filter-private-wireless-gateway-id", "gateway-1");
    assertFlag(args, "--filter-wireless-blocklist-id", "blocklist-1");
    assertFlag(args, "--page-number", "2");
    assertFlag(args, "--page-size", "10");
    assertFlag(args, "--format", "raw");
  });

  it("requires bare confirmation for deletion and never forwards it", () => {
    const rejected = setupFakeTelnyx();
    const rejectedResult = runAgentResult(["sim-card-group", "--action", "delete", "--id", "group-1", "--confirm", "true", "--json"], rejected.env);
    assert.equal(rejectedResult.status, 1);
    assert.match(commandStdout(rejectedResult), /--confirm is required/);
    assert.deepEqual(loggedArgs(rejected.logPath), []);

    const fake = setupFakeTelnyx();
    const output = runAgent(["sim-card-group", "--action", "delete", "--id", "group-1", "--confirm", "--json"], fake.env);
    assert.equal(JSON.parse(output).deleted, true);
    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args, ["sim-card-groups", "delete", "--id", "group-1", "--format", "json"]);
    assert.ok(!args.includes("--confirm"));
  });

  it("maps SIM assignment exactly to sim-cards update", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent(["sim-card-assign", "--sim-card-id", "sim-1", "--sim-card-group-id", "group-1", "--json"], fake.env);
    assert.deepEqual(JSON.parse(output), {
      sim_card_id: "sim-1",
      sim_card_group_id: "group-1",
      sim_card: { id: "sim-1", sim_card_group_id: "group-1", status: { value: "enabled" } },
    });
    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args, ["sim-cards", "update", "--sim-card-id", "sim-1", "--sim-card-group-id", "group-1", "--format", "json"]);
  });

  it("validates actions, group changes, and assignment IDs locally", () => {
    const fake = setupFakeTelnyx();
    for (const args of [
      ["sim-card-group", "--json"],
      ["sim-card-group", "--action", "update", "--id", "group-1", "--json"],
      ["sim-card-group", "--action", "create", "--name", "Fleet", "--data-limit-amount", "2", "--json"],
      ["sim-card-assign", "--sim-card-id", "sim-1", "--json"],
    ]) {
      const result = runAgentResult(args, fake.env);
      assert.equal(result.status, 1, args.join(" "));
      assert.ok(JSON.parse(commandStdout(result)).error);
    }
    assert.deepEqual(loggedArgs(fake.logPath), []);
  });

  it("advertises lifecycle and assignment commands in help and capabilities", () => {
    const fake = setupFakeTelnyx();
    const help = runAgent(["help"], fake.env);
    const capabilities = JSON.parse(runAgent(["capabilities", "--json"], fake.env));
    assert.match(help, /sim-card-group/);
    assert.match(help, /sim-card-assign/);
    const names = capabilities.composite_commands.map((entry: { name: string }) => entry.name);
    assert.ok(names.includes("telnyx-agent sim-card-group"));
    assert.ok(names.includes("telnyx-agent sim-card-assign"));
    const actions = capabilities.api_capabilities["📡 IoT"].flatMap((entry: { actions: string[] }) => entry.actions);
    for (const action of ["create_sim_card_group", "retrieve_sim_card_group", "update_sim_card_group", "list_sim_card_groups", "delete_sim_card_group", "assign_sim_card_to_group"]) {
      assert.ok(actions.includes(action), action);
    }
  });
});
