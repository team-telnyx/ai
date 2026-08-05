/**
 * Regression tests for status command — REST-based (no Go CLI dependency).
 *
 * status was REST-swapped from Go CLI shell-outs to direct TelnyxClient calls.
 * These tests verify:
 * 1. status exits non-zero when all API queries fail (no API key)
 * 2. status produces JSON output with the expected shape
 *
 * The previous test (in telnyx-cli-flags.test.ts) checked Go CLI flag
 * compatibility, which is no longer relevant since status no longer uses
 * the Go CLI.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliRoot = join(__dirname, "..");
const launcher = join(cliRoot, "bin", "telnyx-agent.mjs");

describe("status command (REST-based)", () => {
  it("exits non-zero when all API queries fail (no API key)", () => {
    // Run with an invalid API key so all 5 REST calls fail.
    // The command should exit 1, not 0.
    const result = spawnSync(
      process.execPath,
      [launcher, "status", "--json"],
      {
        cwd: cliRoot,
        encoding: "utf8",
        timeout: 30000,
        env: {
          ...process.env,
          TELNYX_API_KEY: "invalid-test-key-00000",
          // Ensure no config file overrides the env var
          HOME: "/tmp/nonexistent-home-for-status-test",
        },
      },
    );

    assert.notEqual(result.status, 0, "status must exit non-zero when all queries fail");
    assert.ok(result.stdout, "status should produce output even on failure");
  });

  it("produces JSON output with the expected shape", () => {
    const result = spawnSync(
      process.execPath,
      [launcher, "status", "--json"],
      {
        cwd: cliRoot,
        encoding: "utf8",
        timeout: 30000,
        env: {
          ...process.env,
          TELNYX_API_KEY: "invalid-test-key-00000",
          HOME: "/tmp/nonexistent-home-for-status-test",
        },
      },
    );

    const output = result.stdout.trim();
    const data = JSON.parse(output);
    assert.ok(data.balance, "should have balance object");
    assert.ok(data.phone_numbers, "should have phone_numbers object");
    assert.ok(data.messaging_profiles, "should have messaging_profiles object");
    assert.ok(data.connections, "should have connections object");
    assert.ok(data.ai_assistants, "should have ai_assistants object");
    assert.ok(Array.isArray(data.warnings), "should have warnings array");
    assert.ok(data.warnings.length > 0, "should have warnings when queries fail");
  });

  it("does not invoke the telnyx Go CLI binary", () => {
    // Set TELNYX_CLI_PATH to a sentinel that would fail if called.
    // If status still works (via REST), it proves it doesn't use the Go CLI.
    const result = spawnSync(
      process.execPath,
      [launcher, "status", "--json"],
      {
        cwd: cliRoot,
        encoding: "utf8",
        timeout: 30000,
        env: {
          ...process.env,
          TELNYX_API_KEY: "invalid-test-key-00000",
          TELNYX_CLI_PATH: "/tmp/totally-nonexistent-telnyx-binary-should-not-be-called",
          HOME: "/tmp/nonexistent-home-for-status-test",
        },
      },
    );

    // Should still produce valid JSON output (not a "binary not found" error)
    const output = result.stdout.trim();
    assert.doesNotMatch(output, /telnyx CLI not found/i);
    assert.doesNotMatch(output, /No such file or directory.*telnyx/i);
    JSON.parse(output); // should parse as valid JSON
  });
});
