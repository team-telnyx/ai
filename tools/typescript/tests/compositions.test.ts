import assert from "node:assert/strict";
import { TelnyxAPIClient } from "../src/shared/api-client.js";
import { ToolkitCore } from "../src/shared/toolkit-core.js";

class LookupClient extends TelnyxAPIClient {
  calls: Array<[string, unknown]> = [];
  active = 0;
  peak = 0;
  constructor() { super("test-key"); }
  async get(path: string, params?: Record<string, unknown>): Promise<Record<string, unknown>> {
    this.calls.push([path, params]);
    this.active++;
    this.peak = Math.max(this.peak, this.active);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1));
      if (path.endsWith("0002")) throw new Error("lookup unavailable");
      return { data: { phone_number: path.split("/").at(-1) } };
    } finally { this.active--; }
  }
}

const client = new LookupClient();
const core = new ToolkitCore(client);
const numbers = ["+15550000001", "+15550000002", "+15550000001", "+15550000003"];
const args = { phone_numbers: numbers, concurrency: 2, type: "carrier" };
const result = JSON.parse(await core.runTool("bulk_lookup_numbers", args));
assert.ok(!result.error, JSON.stringify(result));
assert.deepEqual(result.results.map((r: {phone_number: string}) => r.phone_number), numbers);
assert.deepEqual(result.results[0].response, { data: { phone_number: numbers[0] } });
assert.equal(result.results[1].error, "lookup unavailable");
assert.deepEqual(result.results[2], result.results[0]);
assert.equal(result.succeeded, 3);
assert.equal(result.failed, 1);
assert.equal(client.calls.length, 4);
assert.equal(client.peak, 2);
assert.ok(client.calls.every(([, params]) => JSON.stringify(params) === '{"type":"carrier"}'));
assert.deepEqual(args, { phone_numbers: numbers, concurrency: 2, type: "carrier" });
console.log("Composition tests passed");

for (const input of [
  {}, { phone_numbers: [] }, { phone_numbers: Array(101).fill("+15550000001") },
  { phone_numbers: "123" }, { phone_numbers: ["../balance"] },
  { phone_numbers: ["+15550000001", "bad"] },
  ...[0, 11, true, 1.5, "2", null].map((concurrency) => ({ phone_numbers: ["+15550000001"], concurrency })),
  { phone_numbers: ["+15550000001"], type: "invalid" },
  { phone_numbers: ["+15550000001"], unexpected: true },
]) {
  const client = new LookupClient();
  const result = JSON.parse(await new ToolkitCore(client).runTool("bulk_lookup_numbers", input));
  assert.match(result.error ?? "", /Invalid bulk_lookup_numbers/);
  assert.deepEqual(client.calls, []);
}

class CloneClient extends TelnyxAPIClient {
  calls: Array<[string, unknown]> = [];
  constructor(private pages: Array<Record<string, unknown> | Error>) { super("test-key"); }
  async get(path: string, params?: Record<string, unknown>): Promise<Record<string, unknown>> {
    this.calls.push([path, params]);
    const page = this.pages[this.calls.length - 1];
    if (page instanceof Error) throw page;
    return page;
  }
}
const wanted = { id: "clone-2", name: "untouched", status: "active" };
const cloneClient = new CloneClient([
  { data: [{ id: "clone-1" }], meta: { page_number: 1, total_pages: 2 } },
  { data: [wanted], meta: { page_number: 2, total_pages: 2 } },
]);
const cloneArgs = { id: "clone-2", page_size: 1, max_pages: 2 };
assert.deepEqual(JSON.parse(await new ToolkitCore(cloneClient).runTool("get_voice_clone", cloneArgs)), { data: wanted });
assert.deepEqual(cloneClient.calls, [1, 2].map((n) => ["/voice_clones", { "page[number]": n, "page[size]": 1 }]));
assert.deepEqual(cloneArgs, { id: "clone-2", page_size: 1, max_pages: 2 });
for (const [pages, args, expected] of [
  [[{ data: [], meta: { page_number: 1, total_pages: 0 } }], {}, "not_found"],
  [[{ data: [{ id: "other" }], meta: { page_number: 1, total_pages: 1 } }], {}, "not_found"],
  [[{ data: [{ id: "other" }], meta: { page_number: 1, total_pages: 2 } }], { max_pages: 1 }, "incomplete"],
  [[{ data: [] }], {}, "pagination"],
  [[{ data: "bad", meta: { page_number: 1, total_pages: 1 } }], {}, "response"],
  [[{ data: [{}], meta: { page_number: 1, total_pages: 1 } }], {}, "response"],
  [[{ data: [], meta: { page_number: 2, total_pages: 2 } }], {}, "pagination"],
  [[new Error("rate limited")], {}, "rate limited"],
] as Array<[Array<Record<string, unknown> | Error>, Record<string, unknown>, string]>) {
  const result = JSON.parse(await new ToolkitCore(new CloneClient(pages)).runTool("get_voice_clone", { id: "wanted", ...args }));
  if (["not_found", "incomplete"].includes(expected)) {
    assert.equal(result.status, expected);
    assert.equal(result.data, null);
  } else assert.ok(result.error?.includes(expected), JSON.stringify(result));
}
for (const input of [
  {}, { id: "" }, { id: 1 }, { id: "x", filter_id: "x" },
  ...[0, 251, true, 1.5, null].map((page_size) => ({ id: "x", page_size })),
  ...[0, 101, true, 1.5, null].map((max_pages) => ({ id: "x", max_pages })),
]) {
  const client = new CloneClient([]);
  const result = JSON.parse(await new ToolkitCore(client).runTool("get_voice_clone", input));
  assert.match(result.error ?? "", /Invalid get_voice_clone/);
  assert.deepEqual(client.calls, []);
}
console.log("Composition validation and pagination tests passed");

const mutableNumbers = ["+15550000001", "+15550000003"];
class MutatingClient extends LookupClient {
  async get(path: string, params?: Record<string, unknown>): Promise<Record<string, unknown>> {
    if (this.calls.length === 0) mutableNumbers.push("../balance");
    return super.get(path, params);
  }
}
const mutatingClient = new MutatingClient();
const snapshot = JSON.parse(await new ToolkitCore(mutatingClient).runTool("bulk_lookup_numbers", { phone_numbers: mutableNumbers, concurrency: 1 }));
assert.ok(!snapshot.error);
assert.equal(mutatingClient.calls.length, 2);
assert.equal(snapshot.succeeded, 2);
assert.equal(snapshot.results.length, 2);


// Real entrypoint/actions/OpenAI adapter + actual native fetch against loopback.
const { createServer } = await import("node:http");
const { TelnyxAgentToolkit, TOOL_DEFINITIONS } = await import("../src/index.js");
const { buildToolParametersZodSchema } = await import("../src/shared/tool-parameters-zod.js");
const { z } = await import("zod");
const requests: Array<[string | undefined, string]> = [];
const server = createServer((req, res) => {
  requests.push([req.method, req.url ?? ""]);
  res.setHeader("Content-Type", "application/json");
  if (req.url?.startsWith("/v2/number_lookup/")) res.end(JSON.stringify({ data: { valid_number: true } }));
  else if (req.url?.startsWith("/v2/voice_clones?")) res.end(JSON.stringify({ data: [{ id: "wanted" }], meta: { page_number: 1, total_pages: 1 } }));
  else { res.statusCode = 500; res.end("{}"); }
});
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
try {
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const toolkit = new TelnyxAgentToolkit("test-key", { baseUrl: `http://127.0.0.1:${address.port}/v2`, frictionEnabled: false, configuration: { actions: {
    lookup: { bulk_lookup_numbers: true }, voice: { get_voice_clone: true }, messaging: { list_messages: true },
  } } });
  assert.deepEqual(toolkit.enabledTools.map((t) => t.name).sort(), ["bulk_lookup_numbers", "get_voice_clone"]);
  assert.equal(toolkit.getOpenAITools().length, 2);
  const executor = toolkit.getOpenAIToolExecutor();
  const bulk = JSON.parse(await executor.execute({ id: "call-1", type: "function", function: { name: "bulk_lookup_numbers", arguments: JSON.stringify({ phone_numbers: ["+15550000001"] }) } }));
  const found = JSON.parse(await executor.execute({ id: "call-2", type: "function", function: { name: "get_voice_clone", arguments: JSON.stringify({ id: "wanted" }) } }));
  assert.deepEqual(bulk.results[0].response, { data: { valid_number: true } });
  assert.deepEqual(found, { data: { id: "wanted" } });
  assert.equal(requests.length, 2);
  assert.ok(requests.every(([method]) => method === "GET"));
  assert.equal(requests[0][1], "/v2/number_lookup/+15550000001");
  const query = new URL(requests[1][1], "http://localhost");
  assert.deepEqual(Object.fromEntries(query.searchParams), { "page[number]": "1", "page[size]": "100" });
} finally {
  await new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
}
for (const [name, dependency, args] of [
  ["bulk_lookup_numbers", "lookup_number", { phone_numbers: ["+15550000001"] }],
  ["get_voice_clone", "list_voice_clones", { id: "wanted" }],
] as const) {
  const composed = TOOL_DEFINITIONS[name];
  assert.equal(composed.execution, name);
  assert.equal(composed.method, TOOL_DEFINITIONS[dependency].method);
  assert.equal(composed.path, TOOL_DEFINITIONS[dependency].path);
  // Both optional TS framework adapters use this real Zod builder.
  assert.ok(buildToolParametersZodSchema(z, composed.parameters).safeParse(args).success);
}
console.log("Composition actions, adapter schemas and real loopback GET transport passed");
