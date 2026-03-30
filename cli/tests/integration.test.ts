/**
 * Integration tests for telnyx-agent CLI.
 * Tests read-only commands (status, capabilities) against real API.
 * Setup commands are NOT tested against real API (they cost money).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = join(__dirname, "..", "bin", "telnyx-agent.ts");
const run = (args: string) => execSync(`npx tsx ${CLI} ${args}`, { encoding: "utf-8", timeout: 30000 });

describe("telnyx-agent CLI", () => {
  describe("help", () => {
    it("shows help with no args", () => {
      const output = run("help");
      assert.ok(output.includes("telnyx-agent"), "Should contain CLI name");
      assert.ok(output.includes("setup-sms"), "Should list setup-sms command");
      assert.ok(output.includes("status"), "Should list status command");
    });
  });

  describe("capabilities", () => {
    it("outputs human-readable capabilities", () => {
      const output = run("capabilities");
      assert.ok(output.includes("Capabilities"), "Should have capabilities header");
      assert.ok(output.includes("Messaging"), "Should list Messaging category");
      assert.ok(output.includes("Voice"), "Should list Voice category");
      assert.ok(output.includes("AI"), "Should list AI category");
    });

    it("outputs JSON capabilities", () => {
      const output = run("capabilities --json");
      const data = JSON.parse(output);
      assert.ok(data.api_capabilities, "Should have api_capabilities");
      assert.ok(data.composite_commands, "Should have composite_commands");
      assert.ok(typeof data.total_tools === "number", "Should have total_tools count");
      assert.ok(data.total_tools >= 18, "Should have at least 18 tools");
    });
  });

  describe("status", () => {
    it("outputs account status (requires TELNYX_API_KEY)", () => {
      try {
        const output = run("status");
        assert.ok(output.includes("Account Status"), "Should have status header");
        assert.ok(output.includes("Balance"), "Should show balance");
      } catch (err: unknown) {
        const e = err as { stderr?: string };
        // Skip if no API key configured
        if (e.stderr?.includes("No Telnyx API key")) {
          console.log("  ⊘ Skipped: No API key configured");
          return;
        }
        throw err;
      }
    });

    it("outputs JSON status (requires TELNYX_API_KEY)", () => {
      try {
        const output = run("status --json");
        const data = JSON.parse(output);
        assert.ok("balance" in data, "Should have balance");
        assert.ok("phone_numbers" in data, "Should have phone_numbers");
        assert.ok("messaging_profiles" in data, "Should have messaging_profiles");
      } catch (err: unknown) {
        const e = err as { stderr?: string };
        if (e.stderr?.includes("No Telnyx API key")) {
          console.log("  ⊘ Skipped: No API key configured");
          return;
        }
        throw err;
      }
    });
  });

  describe("unknown command", () => {
    it("shows error for unknown command", () => {
      try {
        run("foobar");
        assert.fail("Should have thrown");
      } catch (err: unknown) {
        const e = err as { stderr?: string };
        assert.ok(e.stderr?.includes("Unknown command"), "Should show unknown command error");
      }
    });
  });
});
