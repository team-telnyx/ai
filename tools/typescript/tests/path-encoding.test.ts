/**
 * Path placeholders are percent-encoded so a value containing "?", "#", "%" or
 * whitespace cannot terminate or corrupt the route (Codex review on #590).
 * Run with `tsx tests/path-encoding.test.ts` (no API key).
 */
import assert from "node:assert/strict";

import type { TelnyxAPIClient } from "../src/shared/api-client.js";
import { ToolkitCore, encodePathParam } from "../src/shared/toolkit-core.js";

// unreserved, sub-delims, ":" "@" and "/" pass through unchanged
assert.equal(encodePathParam("+15551234567"), "+15551234567");
assert.equal(encodePathParam("a:b@c!d$e&f'g(h)i*j+k,l;m=n/o-p_q.r~s"), "a:b@c!d$e&f'g(h)i*j+k,l;m=n/o-p_q.r~s");
// path terminators / corrupters are encoded (identical to Python urllib.parse.quote)
assert.equal(encodePathParam("a/b c#d?e%f"), "a/b%20c%23d%3Fe%25f");
assert.equal(encodePathParam("ü[1]"), "%C3%BC%5B1%5D");

class MockClient {
  readonly apiKey = "test-key";
  calls: Array<{ method: string; path: string; body?: Record<string, unknown> }> = [];
  async get(path: string) { this.calls.push({ method: "GET", path }); return {}; }
  async post(path: string, body?: Record<string, unknown>) { this.calls.push({ method: "POST", path, body }); return { data: {} }; }
  async delete(path: string) { this.calls.push({ method: "DELETE", path }); return {}; }
}

const client = new MockClient();
const core = new ToolkitCore(client as unknown as TelnyxAPIClient);
await core.runTool("create_presigned_url", { bucket_name: "my-bucket", key: "reports/2026/why?#1.pdf", ttl: 60 });
assert.deepEqual(client.calls.at(-1), {
  method: "POST",
  path: "/storage/buckets/my-bucket/reports/2026/why%3F%231.pdf/presigned_url",
  body: { ttl: 60 },
});
console.log("Path parameter encoding tests passed");
