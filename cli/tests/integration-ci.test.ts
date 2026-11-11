/**
 * CI Integration tests for Agent CLI.
 * Read-only commands only. Requires TELNYX_API_KEY.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = join(__dirname, "..", "bin", "telnyx-agent.mjs");

if (!process.env.TELNYX_API_KEY) {
  console.log("TELNYX_API_KEY not set — skipping");
  process.exit(0);
}

const CLI_TIMEOUT_MS = Number(process.env.CLI_INTEGRATION_TIMEOUT_MS ?? 60000);
let cachedStatusJson: any | undefined;

// Only these commands belong in the live read-only suite. Setup/error-path
// probes must use offline mocks: account state can make them provision resources.
const run = (command: "help" | "status" | "capabilities", json = false): string => {
  assert.ok(["help", "status", "capabilities"].includes(command), "Not a read-only probe");
  return execFileSync(process.execPath, [CLI, command, ...(json ? ["--json"] : [])], {
    encoding: "utf-8",
    timeout: CLI_TIMEOUT_MS,
    env: {
      ...process.env,
      // A read-only command must not POST success/error reports, even when the
      // invoking account or CI environment enables these reporters.
      TELNYX_FRICTION_ENABLED: "false",
      TELNYX_FRICTION_ENDPOINT: "",
      TELNYX_TELEMETRY_ENDPOINT: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
};

const runJson = (command: "status" | "capabilities"): any => JSON.parse(run(command, true));

const getStatusJson = (): any => {
  cachedStatusJson ??= runJson("status");
  return cachedStatusJson;
};

describe("CLI — help", () => {
  it("lists all 10 commands", () => {
    const out = run("help");
    const expected = [
      "setup-sms",
      "setup-voice",
      "setup-ai",
      "setup-iot",
      "setup-wireguard",
      "setup-verify",
      "setup-10dlc",
      "status",
      "capabilities",
      "fund-account",
    ];
    for (const cmd of expected) {
      assert.ok(out.includes(cmd), `Missing command: ${cmd}`);
    }
  });
});

describe("CLI — status", () => {
  it("returns valid JSON with --json", () => {
    const data = getStatusJson();
    assert.ok(data.balance !== undefined, "Missing balance");
    assert.ok(data.phone_numbers !== undefined, "Missing phone_numbers");
    assert.ok(
      data.messaging_profiles !== undefined,
      "Missing messaging_profiles"
    );
    assert.ok(data.connections !== undefined, "Missing connections");
    assert.ok(data.ai_assistants !== undefined, "Missing ai_assistants");
    assert.ok(Array.isArray(data.warnings), "Missing warnings");
    assert.deepEqual(
      data.warnings.filter((warning: string) => warning.startsWith("Could not fetch")),
      [],
      "A partially failed status query must not pass integration coverage",
    );
  });

  it("balance is a valid object with numeric amount", () => {
    const data = getStatusJson();
    assert.ok(typeof data.balance === "object", "balance should be an object");
    const amount = parseFloat(String(data.balance.amount));
    assert.ok(!isNaN(amount), `Balance amount should be numeric, got: ${data.balance.amount}`);
    assert.ok(data.balance.currency, "balance should have currency");
  });

  it("all count fields have total as non-negative number", () => {
    const data = getStatusJson();
    for (const field of ["phone_numbers", "messaging_profiles", "connections", "ai_assistants"]) {
      assert.ok(typeof data[field] === "object", `${field} should be an object`);
      assert.ok(typeof data[field].total === "number", `${field}.total should be a number`);
      assert.ok(data[field].total >= 0, `${field}.total should be non-negative`);
    }
  });

  it("human output contains key sections", () => {
    const out = run("status");
    assert.ok(
      out.includes("Balance") || out.includes("balance"),
      "Missing balance"
    );
  });
});

describe("CLI — capabilities", () => {
  it("returns valid JSON with --json", () => {
    const data = runJson("capabilities");
    assert.ok(
      data.total_tools >= 20,
      `Expected >= 20 tools, got ${data.total_tools}`
    );
    assert.ok(data.composite_commands, "Missing composite_commands");
    assert.ok(
      data.composite_commands.length >= 7,
      `Expected >= 7 composite commands, got ${data.composite_commands.length}`
    );
  });

  it("total_tools matches CLI capabilities count (>= 27)", () => {
    const data = runJson("capabilities");
    assert.ok(data.total_tools >= 27, `Expected >= 27 tools, got ${data.total_tools}`);
  });

  it("lists all categories with name and actions", () => {
    const data = runJson("capabilities");
    const categories = Object.keys(data.api_capabilities || {});
    assert.ok(
      categories.length >= 8,
      `Expected >= 8 categories, got ${categories.length}`
    );
    // Each category should have capabilities with name and actions
    for (const catName of categories) {
      const caps = data.api_capabilities[catName];
      assert.ok(Array.isArray(caps), `Category ${catName} should be an array`);
      for (const cap of caps) {
        assert.ok(cap.name, `Capability in ${catName} missing name`);
        assert.ok(Array.isArray(cap.actions), `Capability ${cap.name} missing actions array`);
      }
    }
  });

  it("composite_commands includes all setup commands", () => {
    const data = runJson("capabilities");
    const names = data.composite_commands.map((c: any) => c.name || c.command || c);
    const expected = ["setup-sms", "setup-voice", "setup-ai", "setup-iot", "setup-wireguard", "setup-verify", "setup-10dlc"];
    for (const cmd of expected) {
      assert.ok(
        names.some((n: string) => n.includes(cmd)),
        `Missing composite command: ${cmd}`
      );
    }
  });

  it("human output is readable", () => {
    const out = run("capabilities");
    assert.ok(
      out.includes("Messaging") || out.includes("messaging"),
      "Missing messaging category"
    );
    assert.ok(
      out.includes("Voice") || out.includes("voice"),
      "Missing voice category"
    );
  });
});
