/**
 * Tests for the telemetry reporter.
 */
import { describe, it, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";

import { TelemetryReporter } from "../src/shared/telemetry.js";

describe("TelemetryReporter", () => {
  const originalEnv = process.env.TELNYX_TELEMETRY_ENDPOINT;

  beforeEach(() => {
    delete process.env.TELNYX_TELEMETRY_ENDPOINT;
  });

  afterEach(() => {
    if (originalEnv) {
      process.env.TELNYX_TELEMETRY_ENDPOINT = originalEnv;
    } else {
      delete process.env.TELNYX_TELEMETRY_ENDPOINT;
    }
  });

  it("is disabled by default", () => {
    const reporter = new TelemetryReporter();
    assert.equal(reporter.enabled, false);
  });

  it("is enabled with explicit endpoint", () => {
    const reporter = new TelemetryReporter("http://localhost:3000/v2/telemetry");
    assert.equal(reporter.enabled, true);
  });

  it("is enabled via env var", () => {
    process.env.TELNYX_TELEMETRY_ENDPOINT = "http://localhost:3000/v2/telemetry";
    const reporter = new TelemetryReporter();
    assert.equal(reporter.enabled, true);
  });

  it("does nothing when disabled", () => {
    const reporter = new TelemetryReporter();
    // Should not throw
    reporter.report({
      tool: "test_tool",
      status: "success",
      duration_ms: 100,
      http_status: 200,
      http_method: "GET",
      api_path: "/v2/test",
    });
  });

  it("fires fetch on success", async () => {
    const calls: { url: string; body: string }[] = [];
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      calls.push({
        url: String(input),
        body: init?.body as string,
      });
      return new Response(JSON.stringify({ data: { status: "accepted" } }), { status: 201 });
    }) as typeof fetch;

    try {
      const reporter = new TelemetryReporter("http://localhost:3000/v2/telemetry");
      reporter.report({
        tool: "buy_phone_number",
        status: "success",
        duration_ms: 1230,
        http_status: 200,
        http_method: "POST",
        api_path: "/v2/number_orders",
      });

      // Give the detached fetch a moment
      await new Promise((r) => setTimeout(r, 100));

      assert.equal(calls.length, 1);
      assert.equal(calls[0].url, "http://localhost:3000/v2/telemetry");

      const payload = JSON.parse(calls[0].body);
      assert.equal(payload.tool, "buy_phone_number");
      assert.equal(payload.status, "success");
      assert.equal(payload.duration_ms, 1230);
      assert.equal(payload.sdk, "typescript");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("fires fetch on error with error_message", async () => {
    const calls: { body: string }[] = [];
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
      calls.push({ body: init?.body as string });
      return new Response("{}", { status: 201 });
    }) as typeof fetch;

    try {
      const reporter = new TelemetryReporter("http://localhost:3000/v2/telemetry");
      reporter.report({
        tool: "send_sms",
        status: "error",
        duration_ms: 500,
        http_status: 422,
        http_method: "POST",
        api_path: "/v2/messages",
        error_message: "Invalid phone number",
      });

      await new Promise((r) => setTimeout(r, 100));

      assert.equal(calls.length, 1);
      const payload = JSON.parse(calls[0].body);
      assert.equal(payload.status, "error");
      assert.equal(payload.error_message, "Invalid phone number");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("does not throw when fetch fails", () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (() => {
      throw new Error("Network error");
    }) as typeof fetch;

    try {
      const reporter = new TelemetryReporter("http://localhost:3000/v2/telemetry");
      // Should not throw
      reporter.report({
        tool: "test_tool",
        status: "success",
        duration_ms: 100,
        http_status: 200,
        http_method: "GET",
        api_path: "/v2/test",
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
