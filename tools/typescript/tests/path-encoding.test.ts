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
// Exercise the actual API client and fetch URL parser, not just MockClient.
const { createServer } = await import("node:http");
const { TelnyxAPIClient: RealClient } = await import("../src/shared/api-client.js");
const requests: string[] = [];
const server = createServer((req, res) => {
  requests.push(req.url ?? "");
  res.setHeader("Content-Type", "application/json");
  res.end('{"data":{}}');
});
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
try {
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const realCore = new ToolkitCore(new RealClient("test-key", {
    baseUrl: `http://127.0.0.1:${address.port}/v2`,
  }));
  // Positive controls prove this fixture actually sends requests through fetch.
  for (const key of ["reports/2026/a.pdf", ".hidden", "a..b.pdf", "...", "a//b", "reports/%2e%2e/invoice.pdf"]) {
    const before = requests.length;
    const result = JSON.parse(await realCore.runTool("create_presigned_url", {
      bucket_name: "my-bucket", key, ttl: 60,
    }));
    assert.equal(result.error, undefined);
    assert.equal(requests.length, before + 1);
    assert.equal(requests.at(-1), `/v2/storage/buckets/my-bucket/${encodePathParam(key)}/presigned_url`);
  }
  for (const key of [".", "..", "./a", "../a", "a/.", "a/..", "reports/../invoice.pdf", "reports/./invoice.pdf"]) {
    const before = requests.length;
    const result = JSON.parse(await realCore.runTool("create_presigned_url", {
      bucket_name: "my-bucket", key,
    }));
    assert.match(result.error ?? "", /dot-only path segments/);
    assert.equal(requests.length, before, "unsafe key must never reach HTTP");
  }
} finally {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
console.log("Path parameter encoding and real fetch transport tests passed");
