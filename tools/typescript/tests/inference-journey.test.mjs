import { it } from "node:test";
import assert from "node:assert/strict";
import { readCompletion, runInferenceJourney } from "../scripts/inference-journey.mjs";

const chunk = (delta, finish_reason = null) => ({ model: "fixture-model", choices: [{ index: 0, delta, finish_reason }] });
const toolEvents = () => [
  chunk({ role: "assistant", reasoning_content: "Private reasoning." }),
  chunk({ tool_calls: [{ index: 0, id: "call_", type: "function", function: { name: "lookup_", arguments: '{"ref' } }] }),
  chunk({ tool_calls: [{ index: 0, id: "123", function: { name: "verification", arguments: 'erence":"win-the-bot"}' } }] }),
  chunk({}, "tool_calls"),
];

function stream(events, { done = true, fragment = false } = {}) {
  const text = ": keepalive\r\n\r\n" + events.map((event) => `data: ${typeof event === "string" ? event : JSON.stringify(event)}\r\n\r\n`).join("") + (done ? "data: [DONE]\r\n\r\n" : "");
  const bytes = new TextEncoder().encode(text);
  return new Response(new ReadableStream({ start(controller) {
    if (fragment) for (const byte of bytes) controller.enqueue(new Uint8Array([byte]));
    else controller.enqueue(bytes);
    controller.close();
  } }), { headers: { "content-type": "text/event-stream", "x-request-id": "fixture-request" } });
}

it("assembles fragmented SSE, split UTF-8, tool IDs/names/arguments, and usage trailers", async () => {
  const events = toolEvents();
  events[0] = chunk({ content: "café", reasoning_content: "Private reasoning." });
  events.push({ choices: [], usage: { completion_tokens: 25 } });
  const result = await readCompletion(stream(events, { fragment: true }));
  assert.equal(result.content, "café");
  assert.equal(result.tool_calls[0].id, "call_123");
  assert.equal(result.tool_calls[0].function.name, "lookup_verification");
  assert.deepEqual(JSON.parse(result.tool_calls[0].function.arguments), { reference: "win-the-bot" });
  assert.equal(result.usage.completion_tokens, 25);
});

for (const [name, events, options, expected] of [
  ["truncated stream", toolEvents(), { done: false }, /without \[DONE\]/],
  ["missing finish reason", [chunk({ content: "hello" })], {}, /without finish reason/],
  ["invalid JSON", ["{"], {}, /Invalid SSE JSON/],
  ["provider error", [{ error: { message: "failure" } }], {}, /Invalid completion event/],
  ["non-string tool ID", [...toolEvents(), chunk({ tool_calls: [{ index: 0, id: 123 }] })], {}, /Invalid tool ID/],
  ["oversized output", [chunk({ content: "a".repeat(1024 * 1024) })], {}, /byte limit/],
]) {
  it(`rejects ${name}`, async () => {
    await assert.rejects(readCompletion(stream(events, options)), expected);
  });
}

function fixture({ first = toolEvents(), wrongAnswer = false, missingModel = false, httpError = 0 } = {}) {
  const requests = [];
  return { requests, fetchImpl: async (url, init) => {
    const body = init.body ? JSON.parse(init.body) : null;
    requests.push({ url, ...init, body });
    assert.equal(init.redirect, "error");
    assert.ok(init.signal instanceof AbortSignal);
    if (httpError) return new Response("Do not leak secret-key", { status: httpError });
    if (url.endsWith("/models")) return Response.json({ data: missingModel ? [] : [{ id: "fixture-model" }] });
    assert.equal(body.max_tokens, 1024);
    assert.equal(body.stream, true);
    if (requests.length === 2) return stream(first);
    const assistant = body.messages.at(-2);
    const tool = body.messages.at(-1);
    assert.equal(assistant.tool_calls[0].id, "call_123");
    assert.equal(assistant.tool_calls[0].id, tool.tool_call_id);
    assert.equal(assistant.reasoning_content, "Private reasoning.");
    const answer = JSON.parse(tool.content).verification_code;
    return stream([chunk({ content: wrongAnswer ? "invented" : answer }), chunk({}, "stop")]);
  } };
}

const config = { enabled: true, apiKey: "secret-key", model: "fixture-model" };

it("verifies discovery → streamed tool call → correlated tool result → final answer", async () => {
  const api = fixture();
  const report = await runInferenceJourney({ ...config, fetchImpl: api.fetchImpl });
  assert.equal(report.status, "passed", JSON.stringify(report));
  assert.deepEqual(report.checks.map((check) => check.status), ["passed", "passed", "passed"]);
  assert.equal(api.requests.length, 3);
  assert.equal(api.requests[0].url, "https://api.telnyx.com/v2/ai/openai/models");
  assert.equal(api.requests[1].body.tool_choice, "required");
  assert.equal(api.requests[2].body.tool_choice, "none");
  assert.doesNotMatch(JSON.stringify(report), /secret-key|Private reasoning|verification_code/);
});

for (const [name, options, expectedCalls] of [
  ["absent model", { missingModel: true }, 1],
  ["HTTP 401", { httpError: 401 }, 1],
  ["HTTP 429", { httpError: 429 }, 1],
  ["HTTP 500", { httpError: 500 }, 1],
  ["wrong final answer", { wrongAnswer: true }, 3],
  ["token exhaustion", { first: [chunk({ content: "incomplete" }, "length")] }, 2],
  ["unrequested tool", { first: [chunk({ tool_calls: [{ index: 0, id: "call_123", function: { name: "delete_resources", arguments: "{}" } }] }, "tool_calls")] }, 2],
  ["invalid arguments", { first: [chunk({ tool_calls: [{ index: 0, id: "call_123", function: { name: "lookup_verification", arguments: '{"reference":"other"}' } }] }, "tool_calls")] }, 2],
]) {
  it(`fails closed for ${name} without retries or extra requests`, async () => {
    const api = fixture(options);
    const report = await runInferenceJourney({ ...config, fetchImpl: api.fetchImpl });
    assert.equal(report.status, "failed");
    assert.equal(report.checks.at(-1).status, "failed");
    assert.equal(api.requests.length, expectedCalls);
    assert.doesNotMatch(JSON.stringify(report), /secret-key/);
  });
}

it("skips without opt-in and fails missing configuration before network access", async () => {
  const fetchImpl = async () => { throw new Error("Must not call fetch"); };
  assert.equal((await runInferenceJourney({ ...config, enabled: false, fetchImpl })).status, "skipped");
  assert.equal((await runInferenceJourney({ ...config, apiKey: "", fetchImpl })).checks.length, 0);
  assert.equal((await runInferenceJourney({ ...config, model: "", fetchImpl })).status, "failed");
});

it("reports transport/timeout failure without exposing transport messages or retrying", async () => {
  let requests = 0;
  const report = await runInferenceJourney({ ...config, fetchImpl: async () => {
    requests++;
    throw new Error("Connection failed: secret-key");
  } });
  assert.equal(requests, 1);
  assert.equal(report.status, "failed");
  assert.doesNotMatch(JSON.stringify(report), /secret-key/);
});
