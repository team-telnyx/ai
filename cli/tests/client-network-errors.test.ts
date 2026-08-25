/**
 * Regression tests for TelnyxClient network-error normalization.
 *
 * Node's fetch throws a bare `TypeError: fetch failed` with the real reason in
 * `.cause`. A newcomer just saw "fetch failed" and had no idea the API was
 * simply unreachable. The client now unwraps the cause into an actionable
 * message. These tests hit unroutable/dead endpoints and assert the message is
 * clear (and never the raw "fetch failed").
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { TelnyxClient } from "../src/client.ts";

describe("TelnyxClient network-error normalization", () => {
  it("turns a connection-refused into an actionable message (not 'fetch failed')", async () => {
    // Port 1 is not listenable → ECONNREFUSED / bad port.
    const client = new TelnyxClient("test-key", "http://127.0.0.1:1/v2");
    await assert.rejects(
      () => client.get("/messaging_profiles"),
      (err: any) => {
        assert.notEqual(err.message, "fetch failed", "must not leak the bare 'fetch failed'");
        assert.match(err.message, /Network error calling GET/);
        assert.match(err.message, /127\.0\.0\.1:1/); // shows which URL failed
        return true;
      },
    );
  });

  it("turns a DNS failure into a clear message", async () => {
    const client = new TelnyxClient("test-key", "http://this-host-does-not-exist.invalid/v2");
    await assert.rejects(
      () => client.post("/messages", { to: "+1", from: "+1", text: "x" }),
      (err: any) => {
        assert.notEqual(err.message, "fetch failed");
        assert.match(err.message, /Network error calling POST/);
        // ENOTFOUND on most systems; accept any non-empty hint.
        assert.match(err.message, /DNS|ENOTFOUND|could not reach|reach the API/i);
        return true;
      },
    );
  });

  it("reports a timeout distinctly when the request is aborted", async () => {
    // 1ms timeout against a routable-but-slow host forces an AbortError.
    const client = new TelnyxClient("test-key", "http://10.255.255.1/v2", 1);
    await assert.rejects(
      () => client.get("/messaging_profiles"),
      (err: any) => {
        assert.notEqual(err.message, "fetch failed");
        assert.match(err.message, /timed out|Network error/i);
        return true;
      },
    );
  });
});
