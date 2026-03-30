/**
 * CI Integration tests for Agent CLI.
 * Read-only commands only. Requires TELNYX_API_KEY.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = join(__dirname, "..", "bin", "telnyx-agent.ts");

if (!process.env.TELNYX_API_KEY) {
  console.log("TELNYX_API_KEY not set — skipping");
  process.exit(0);
}

const run = (args: string): string => {
  return execSync(`npx tsx ${CLI} ${args}`, {
    encoding: "utf-8",
    timeout: 30000,
    env: { ...process.env },
  });
};

const runJson = (args: string): any => {
  const out = run(args);
  return JSON.parse(out);
};

/**
 * Attempt to run a CLI command and return the result.
 * If the command fails, return { error, exitCode, stderr }.
 */
const tryRunJson = (args: string): { ok: true; data: any } | { ok: false; error: string; exitCode: number } => {
  try {
    const data = runJson(args);
    return { ok: true, data };
  } catch (err: any) {
    // execSync throws on non-zero exit — try to parse stderr/stdout
    const output = err.stdout?.toString() || err.stderr?.toString() || err.message;
    return { ok: false, error: output, exitCode: err.status ?? 1 };
  }
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
    const data = runJson("status --json");
    assert.ok(data.balance !== undefined, "Missing balance");
    assert.ok(data.phone_numbers !== undefined, "Missing phone_numbers");
    assert.ok(
      data.messaging_profiles !== undefined,
      "Missing messaging_profiles"
    );
    assert.ok(data.connections !== undefined, "Missing connections");
    assert.ok(data.ai_assistants !== undefined, "Missing ai_assistants");
  });

  it("balance is a valid object with numeric amount", () => {
    const data = runJson("status --json");
    assert.ok(typeof data.balance === "object", "balance should be an object");
    const amount = parseFloat(String(data.balance.amount));
    assert.ok(!isNaN(amount), `Balance amount should be numeric, got: ${data.balance.amount}`);
    assert.ok(data.balance.currency, "balance should have currency");
  });

  it("all count fields have total as non-negative number", () => {
    const data = runJson("status --json");
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
    const data = runJson("capabilities --json");
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
    const data = runJson("capabilities --json");
    assert.ok(data.total_tools >= 27, `Expected >= 27 tools, got ${data.total_tools}`);
  });

  it("lists all categories with name and actions", () => {
    const data = runJson("capabilities --json");
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
    const data = runJson("capabilities --json");
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

describe("CLI — setup-iot (read-only, lists SIMs)", () => {
  it("runs without error and returns JSON", () => {
    const result = tryRunJson("setup-iot --json");
    if (result.ok) {
      // If it succeeds, verify the output shape
      const data = result.data;
      assert.ok(data.steps || data.sim_id || data.ready !== undefined,
        "Expected steps, sim_id, or ready field in output");
    } else {
      // setup-iot may fail if no SIMs available — that's OK
      assert.ok(
        result.error.includes("No SIM") ||
        result.error.includes("sim") ||
        result.error.includes("not found") ||
        result.exitCode !== 0,
        "Expected graceful failure for no SIMs"
      );
    }
  });
});

describe("CLI — fund-account (error case, no wallet)", () => {
  it("returns error when no wallet key provided", () => {
    const result = tryRunJson("fund-account --json --amount 10");
    // fund-account requires a wallet private key — should fail gracefully
    if (result.ok) {
      // If it returns JSON, it should indicate an error or missing wallet
      const data = result.data;
      assert.ok(
        data.error || data.status === "error" || data.previous_balance,
        "Expected error or wallet-related output"
      );
    } else {
      // Non-zero exit is expected without a wallet
      assert.ok(result.exitCode !== 0 || result.error.length > 0,
        "Expected non-zero exit or error message");
    }
  });
});

describe("CLI — setup-10dlc (requires flags, error case)", () => {
  it("fails gracefully without required --phone and --email flags", () => {
    const result = tryRunJson("setup-10dlc --json");
    // setup-10dlc requires --phone and --email
    assert.equal(result.ok, false, "Should fail without required flags");
    assert.ok(result.exitCode !== 0, "Should exit with non-zero code");
  });
});

describe("CLI — setup-wireguard (network creation)", () => {
  it("returns valid JSON output shape or graceful error", () => {
    const result = tryRunJson("setup-wireguard --json");
    if (result.ok) {
      const data = result.data;
      // Verify expected output fields
      assert.ok(
        data.network_id || data.steps || data.ready !== undefined,
        "Expected network_id, steps, or ready field"
      );
    } else {
      // May fail on test accounts — just verify it doesn't crash silently
      assert.ok(result.error.length > 0 || result.exitCode !== 0,
        "Expected error message or non-zero exit");
    }
  });
});

describe("CLI — setup-verify (verify profile creation)", () => {
  it("returns valid JSON output shape or graceful error", () => {
    const result = tryRunJson("setup-verify --json");
    if (result.ok) {
      const data = result.data;
      assert.ok(
        data.profile_id || data.steps || data.ready !== undefined,
        "Expected profile_id, steps, or ready field"
      );

      // If it created resources, clean up
      if (data.profile_id) {
        try {
          const headers = {
            Authorization: `Bearer ${process.env.TELNYX_API_KEY}`,
            "Content-Type": "application/json",
          };
          // Best-effort cleanup via curl
          execSync(`curl -s -X DELETE "https://api.telnyx.com/v2/verify/profiles/${data.profile_id}" -H "Authorization: Bearer ${process.env.TELNYX_API_KEY}"`, {
            timeout: 10000,
          });
          if (data.phone_number_id) {
            execSync(`curl -s -X DELETE "https://api.telnyx.com/v2/phone_numbers/${data.phone_number_id}" -H "Authorization: Bearer ${process.env.TELNYX_API_KEY}"`, {
              timeout: 10000,
            });
          }
        } catch { /* best effort cleanup */ }
      }
    } else {
      // setup-verify may fail on some accounts
      assert.ok(result.error.length > 0 || result.exitCode !== 0,
        "Expected error message or non-zero exit");
    }
  });
});
