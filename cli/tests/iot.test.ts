/**
 * Mock-binary coverage for direct IoT SIM actions.
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
  const tempDir = mkdtempSync(join(tmpdir(), "telnyx-agent-iot-"));
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

if (args[0] === "sim-cards" && args[1] === "list") {
  console.log(JSON.stringify({
    data: [{ id: "sim-1", iccid: "89310410106543789301", msisdn: "+131****6224", status: "enabled", tags: ["fleet"] }],
    meta: { page_number: 2, page_size: 25, total_results: 1 }
  }));
} else if (args[0] === "sim-cards" && args[1] === "retrieve") {
  console.log(JSON.stringify({ data: {
    id: flag("--id"),
    iccid: "89310410106543789301",
    msisdn: "+131****6224",
    status: { value: "enabled", reason: "ready" },
    sim_card_group_id: "group-1"
  } }));
} else if (args[0] === "sim-cards:actions" && args[1] === "retrieve") {
  console.log(JSON.stringify({ data: {
    id: flag("--id"),
    sim_card_id: "sim-1",
    action_type: "enable",
    status: { value: "completed" },
    created_at: "2026-08-17T12:00:00Z",
    updated_at: "2026-08-17T12:00:01Z"
  } }));
} else if (args[0] === "sim-cards:actions" && args[1] === "list") {
  console.log(JSON.stringify({
    data: [{
      id: "action-enable",
      sim_card_id: "sim-1",
      action_type: "enable",
      status: { value: "completed" },
      bulk_sim_card_action_id: "bulk-1"
    }],
    meta: { page_number: 3, page_size: 10, total_results: 1 }
  }));
} else if (args[0] === "sim-cards:actions" && (args[1] === "enable" || args[1] === "disable")) {
  console.log(JSON.stringify({ data: {
    id: "action-" + args[1],
    sim_card_id: flag("--id"),
    action_type: args[1],
    status: process.env.TELNYX_FAKE_STRING_STATUS === "true"
      ? "in-progress"
      : { value: "in-progress" }
  } }));
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
  return execFileSync("npx", ["tsx", cliBin, ...args], {
    cwd: cliRoot,
    encoding: "utf8",
    env,
    timeout: 30_000,
  });
}

function loggedArgs(logPath: string): string[][] {
  if (!existsSync(logPath)) return [];
  const contents = readFileSync(logPath, "utf8");
  assert.ok(contents.endsWith("\n"), "fake binary should terminate its JSON record with one newline");
  assert.ok(!contents.endsWith("\n\n"), "fake binary should not write a blank JSONL record");
  return contents.trimEnd().split("\n").map((line) => JSON.parse(line) as string[]);
}

function assertFlag(args: string[], flag: string, value: string): void {
  const index = args.indexOf(flag);
  assert.notEqual(index, -1, `expected ${flag} in ${args.join(" ")}`);
  assert.equal(args[index + 1], value);
}

describe("IoT SIM action commands", () => {
  it("lists SIM cards with generated filter and pagination flags", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent([
      "list-sim-cards",
      "--iccid", "893104",
      "--msisdn", "+131****6224",
      "--status", "enabled,disabled",
      "--tags", "fleet,test",
      "--sim-card-group-id", "group-1",
      "--include-sim-card-group",
      "--page-number", "2",
      "--page-size", "25",
      "--sort", "-created_at",
      "--json",
    ], fake.env);

    const result = JSON.parse(output);
    assert.equal(result.count, 1);
    assert.equal(result.sim_cards[0].id, "sim-1");
    assert.equal(result.meta.total_results, 1);

    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args.slice(0, 2), ["sim-cards", "list"]);
    assertFlag(args, "--filter.iccid", "893104");
    assertFlag(args, "--filter.msisdn", "+131****6224");
    assertFlag(args, "--filter.status", JSON.stringify(["enabled", "disabled"]));
    assertFlag(args, "--filter.tags", JSON.stringify(["fleet", "test"]));
    assertFlag(args, "--filter-sim-card-group-id", "group-1");
    assert.ok(args.includes("--include-sim-card-group=true"));
    assertFlag(args, "--page-number", "2");
    assertFlag(args, "--page-size", "25");
    assertFlag(args, "--sort", "-created_at");
    assertFlag(args, "--format", "raw");
  });

  it("retrieves one SIM card and preserves it under a stable JSON key", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent([
      "retrieve-sim-card",
      "--id", "sim-1",
      "--include-sim-card-group", "true",
      "--json",
    ], fake.env);

    assert.deepEqual(JSON.parse(output), {
      sim_card_id: "sim-1",
      sim_card: {
        id: "sim-1",
        iccid: "89310410106543789301",
        msisdn: "+131****6224",
        status: { value: "enabled", reason: "ready" },
        sim_card_group_id: "group-1",
      },
    });

    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args.slice(0, 2), ["sim-cards", "retrieve"]);
    assertFlag(args, "--id", "sim-1");
    assert.ok(args.includes("--include-sim-card-group=true"));
    assertFlag(args, "--format", "json");
  });

  it("retrieves one SIM card action by an ID returned from enable or disable", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent(["retrieve-sim-card-action", "--id", "action-enable", "--json"], fake.env);

    assert.deepEqual(JSON.parse(output), {
      action_id: "action-enable",
      sim_card_action: {
        id: "action-enable",
        sim_card_id: "sim-1",
        action_type: "enable",
        status: { value: "completed" },
        created_at: "2026-08-17T12:00:00Z",
        updated_at: "2026-08-17T12:00:01Z",
      },
    });

    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args.slice(0, 2), ["sim-cards:actions", "retrieve"]);
    assertFlag(args, "--id", "action-enable");
    assertFlag(args, "--format", "json");
  });

  it("lists SIM card actions with generated filters and pagination flags", () => {
    const fake = setupFakeTelnyx();
    const output = runAgent([
      "list-sim-card-actions",
      "--sim-card-id", "sim-1",
      "--status", "completed",
      "--bulk-sim-card-action-id", "bulk-1",
      "--action-type", "enable",
      "--page-number", "3",
      "--page-size", "10",
      "--json",
    ], fake.env);

    assert.deepEqual(JSON.parse(output), {
      count: 1,
      sim_card_actions: [{
        id: "action-enable",
        sim_card_id: "sim-1",
        action_type: "enable",
        status: { value: "completed" },
        bulk_sim_card_action_id: "bulk-1",
      }],
      meta: { page_number: 3, page_size: 10, total_results: 1 },
    });

    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args.slice(0, 2), ["sim-cards:actions", "list"]);
    assertFlag(args, "--filter.sim-card-id", "sim-1");
    assertFlag(args, "--filter.status", "completed");
    assertFlag(args, "--filter.bulk-sim-card-action-id", "bulk-1");
    assertFlag(args, "--filter.action-type", "enable");
    assertFlag(args, "--page-number", "3");
    assertFlag(args, "--page-size", "10");
    assertFlag(args, "--format", "raw");
  });

  it("normalizes SIM card action status objects in human output", () => {
    const fake = setupFakeTelnyx();
    const retrieveOutput = runAgent(["retrieve-sim-card-action", "--id", "action-enable"], fake.env);
    const listOutput = runAgent(["list-sim-card-actions"], fake.env);

    assert.match(retrieveOutput, /Status\s+completed/);
    assert.match(listOutput, /action-enable.*completed/);
    assert.doesNotMatch(`${retrieveOutput}${listOutput}`, /\[object Object\]/);
  });

  for (const action of ["enable", "disable"] as const) {
    it(`${action}s a SIM card and normalizes the documented status object`, () => {
      const fake = setupFakeTelnyx();
      const output = runAgent([`${action}-sim-card`, "--id", "sim-1", "--json"], fake.env);

      assert.deepEqual(JSON.parse(output), {
        action_id: `action-${action}`,
        sim_card_id: "sim-1",
        action,
        status: "in-progress",
      });

      const [args] = loggedArgs(fake.logPath);
      assert.deepEqual(args.slice(0, 2), ["sim-cards:actions", action]);
      assertFlag(args, "--id", "sim-1");
      assertFlag(args, "--format", "json");
    });

    it(`prints the normalized ${action} status in human output`, () => {
      const fake = setupFakeTelnyx();
      const output = runAgent([`${action}-sim-card`, "--id", "sim-1"], fake.env);

      assert.match(output, /Status\s+in-progress/);
      assert.doesNotMatch(output, /\[object Object\]/);
    });
  }

  it("preserves compatibility with string action statuses", () => {
    const fake = setupFakeTelnyx();
    fake.env.TELNYX_FAKE_STRING_STATUS = "true";
    const output = runAgent(["enable-sim-card", "--id", "sim-1", "--json"], fake.env);

    assert.equal(JSON.parse(output).status, "in-progress");
  });

  it("advertises all direct SIM commands in help and capabilities", () => {
    const help = runAgent(["help"]);
    const capabilities = JSON.parse(runAgent(["capabilities", "--json"]));
    const commands = [
      "list-sim-cards",
      "retrieve-sim-card",
      "enable-sim-card",
      "disable-sim-card",
      "retrieve-sim-card-action",
      "list-sim-card-actions",
    ];

    for (const command of commands) {
      assert.match(help, new RegExp(command));
      assert.ok(
        capabilities.composite_commands.some((entry: { name: string }) => entry.name === `telnyx-agent ${command}`),
        `capabilities should advertise ${command}`,
      );
    }

    const iotActions = capabilities.api_capabilities["📡 IoT"][0].actions;
    for (const action of [
      "list_sim_cards",
      "retrieve_sim_card",
      "enable_sim_card",
      "disable_sim_card",
      "retrieve_sim_card_action",
      "list_sim_card_actions",
    ]) {
      assert.ok(iotActions.includes(action), `IoT capabilities should include ${action}`);
    }
  });
});
