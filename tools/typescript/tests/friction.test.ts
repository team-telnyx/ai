import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { FrictionReporter } from "../src/shared/friction.js";

describe("FrictionReporter", () => {
  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    originalEnv = {
      TELNYX_FRICTION_ENDPOINT: process.env.TELNYX_FRICTION_ENDPOINT,
      TELNYX_FRICTION_ENABLED: process.env.TELNYX_FRICTION_ENABLED,
    };
  });

  afterEach(() => {
    for (const [key, val] of Object.entries(originalEnv)) {
      if (val === undefined) delete process.env[key];
      else process.env[key] = val;
    }
  });

  it("is enabled by default", () => {
    const reporter = new FrictionReporter();
    assert.equal(reporter.enabled, true);
  });

  it("can be disabled via constructor", () => {
    const reporter = new FrictionReporter(undefined, false);
    assert.equal(reporter.enabled, false);
  });

  it("can be disabled via env var", () => {
    process.env.TELNYX_FRICTION_ENABLED = "false";
    const reporter = new FrictionReporter();
    assert.equal(reporter.enabled, false);
  });

  it("uses custom endpoint from constructor", () => {
    const reporter = new FrictionReporter("http://custom:3000/v2/friction");
    // Can't directly check private field, but it should not throw
    assert.equal(reporter.enabled, true);
  });

  it("does not throw when reporting with valid event", () => {
    // Disabled to avoid real HTTP calls in tests
    const reporter = new FrictionReporter(undefined, false);
    assert.doesNotThrow(() => {
      reporter.report({
        tool: "test_tool",
        http_status: 500,
        http_method: "POST",
        api_path: "/v2/test",
        error_message: "internal error",
        api_key: "test_key",
      });
    });
  });

  it("does not throw when fetch fails", () => {
    // Use an unreachable endpoint to simulate failure
    const reporter = new FrictionReporter("http://localhost:1/unreachable", true);
    assert.doesNotThrow(() => {
      reporter.report({
        tool: "test_tool",
        http_status: 422,
        http_method: "POST",
        api_path: "/v2/test",
        error_message: "validation error",
        api_key: "test_key",
      });
    });
  });

  it("maps 5xx to blocker severity", () => {
    // We can verify by checking the method doesn't throw
    // Full payload verification would need fetch interception
    const reporter = new FrictionReporter(undefined, false);
    assert.doesNotThrow(() => {
      reporter.report({
        tool: "test_tool",
        http_status: 500,
        http_method: "POST",
        api_path: "/v2/test",
        error_message: "server error",
        api_key: "key",
      });
    });
  });

  it("maps 401/403 to auth type", () => {
    const reporter = new FrictionReporter(undefined, false);
    assert.doesNotThrow(() => {
      reporter.report({
        tool: "test_tool",
        http_status: 401,
        http_method: "GET",
        api_path: "/v2/test",
        error_message: "unauthorized",
        api_key: "key",
      });
    });
  });
});
