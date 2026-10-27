import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";

const BASE = "https://api.telnyx.com/v2/ai/openai";
const MAX_BYTES = 1024 * 1024;
const MAX_TOKENS = 1024;
const TIMEOUT_MS = 60_000;

function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}

/** Assemble SSE deltas across arbitrary network/UTF-8 boundaries. */
export async function readCompletion(response) {
  requireValue(response.headers.get("content-type")?.includes("text/event-stream"), "Expected an SSE response");
  requireValue(response.body, "Missing response stream");
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const calls = new Map();
  const completion = { content: "", reasoning_content: "", tool_calls: [], finish_reason: null, usage: null, model: null };
  let pending = "", data = [], bytes = 0, done = false;

  function event() {
    if (!data.length) return;
    const text = data.join("\n");
    data = [];
    if (text === "[DONE]") { done = true; return; }
    let chunk;
    try { chunk = JSON.parse(text); } catch { throw new Error("Invalid SSE JSON"); }
    requireValue(chunk && !chunk.error && Array.isArray(chunk.choices), "Invalid completion event");
    if (chunk.model) completion.model = chunk.model;
    if (chunk.usage) completion.usage = chunk.usage;
    for (const choice of chunk.choices) {
      requireValue(choice.index === 0, "Unexpected completion choice");
      if (choice.finish_reason) {
        requireValue(!completion.finish_reason, "Duplicate finish reason");
        completion.finish_reason = choice.finish_reason;
      }
      const delta = choice.delta ?? {};
      for (const field of ["content", "reasoning_content"]) {
        if (delta[field] != null) {
          requireValue(typeof delta[field] === "string", "Invalid text delta");
          completion[field] += delta[field];
        }
      }
      for (const part of delta.tool_calls ?? []) {
        requireValue(Number.isInteger(part.index) && part.index >= 0 && part.index < 8, "Invalid tool index");
        const call = calls.get(part.index) ?? { id: "", type: "function", function: { name: "", arguments: "" } };
        if (part.type) requireValue(part.type === "function", "Unexpected tool type");
        if (part.id) {
          requireValue(typeof part.id === "string" && (!call.id || call.id === part.id), "Tool ID changed mid-stream");
          call.id = part.id;
        }
        for (const field of ["name", "arguments"]) {
          if (part.function?.[field] != null) {
            requireValue(typeof part.function[field] === "string", "Invalid tool delta");
            call.function[field] += part.function[field];
          }
        }
        calls.set(part.index, call);
      }
    }
  }

  try {
    while (!done) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      requireValue(bytes <= MAX_BYTES, "Response exceeded byte limit");
      pending += decoder.decode(part.value, { stream: true });
      let newline;
      while (!done && (newline = pending.indexOf("\n")) !== -1) {
        const line = pending.slice(0, newline).replace(/\r$/, "");
        pending = pending.slice(newline + 1);
        if (line === "") event();
        else if (line.startsWith("data:")) data.push(line.slice(5).replace(/^ /, ""));
      }
    }
    requireValue(done, "Stream ended without [DONE]");
    requireValue(completion.finish_reason, "Stream ended without finish reason");
    completion.tool_calls = [...calls.entries()].sort(([a], [b]) => a - b).map(([, call]) => call);
    return completion;
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

async function readModels(response) {
  requireValue(response.body, "Missing model discovery body");
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      requireValue(size <= MAX_BYTES, "Model discovery exceeded byte limit");
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

/** No network access until explicit opt-in, key, and model are all supplied. */
export async function runInferenceJourney({ enabled, apiKey, model, fetchImpl = fetch }) {
  const report = {
    schema_version: 1, journey: "inference-tool-loop", status: "failed",
    started_at: new Date().toISOString(), model: model || null,
    limits: { max_requests: 3, max_completion_requests: 2, max_tokens_per_completion: MAX_TOKENS, timeout_ms_per_request: TIMEOUT_MS, max_response_bytes: MAX_BYTES, retries: 0 },
    checks: [],
  };
  if (!enabled) return { ...report, status: "skipped", reason: "Set RUN_INFERENCE_JOURNEY=true to allow two billable completions" };
  if (!apiKey || !model) return { ...report, reason: "TELNYX_API_KEY and TELNYX_INFERENCE_MODEL are required" };

  async function step(name, path, body, verify) {
    const check = { name, status: "failed", elapsed_ms: 0 };
    report.checks.push(check);
    const start = performance.now();
    try {
      const response = await fetchImpl(`${BASE}${path}`, {
        method: body ? "POST" : "GET", redirect: "error", signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      check.http_status = response.status;
      // Log only metadata, never raw responses, credentials, or reasoning traces.
      check.request_id = response.headers.get("x-request-id") ?? response.headers.get("x-telnyx-request-id");
      if (!response.ok) {
        await response.body?.cancel();
        throw new Error(`HTTP ${response.status}`);
      }
      const value = await verify(response);
      check.status = "passed";
      return value;
    } finally {
      check.elapsed_ms = Math.round(performance.now() - start);
    }
  }

  try {
    await step("model-discovery", "/models", null, async (response) => {
      const catalog = await readModels(response);
      requireValue(Array.isArray(catalog.data) && catalog.data.some((entry) => entry.id === model), "Selected model is absent from discovery");
    });
    const messages = [{ role: "user", content: "Call lookup_verification with reference win-the-bot. When you receive the result, reply with only its verification_code, verbatim, without quotes or other text." }];
    const tools = [{ type: "function", function: {
      name: "lookup_verification", description: "Look up a verification code for a reference.",
      parameters: { type: "object", properties: { reference: { type: "string", enum: ["win-the-bot"] } }, required: ["reference"], additionalProperties: false },
    } }];
    const common = { model, stream: true, max_tokens: MAX_TOKENS };
    const first = await step("streamed-tool-call", "/chat/completions", { ...common, messages, tools, tool_choice: "required" }, async (response) => {
      const completion = await readCompletion(response);
      requireValue(completion.finish_reason === "tool_calls", "Expected tool_calls finish reason");
      requireValue(completion.tool_calls.length === 1, "Expected exactly one tool call");
      const [call] = completion.tool_calls;
      requireValue(call.id && call.function.name === "lookup_verification", "Invalid tool identity");
      let args;
      try { args = JSON.parse(call.function.arguments); } catch { throw new Error("Invalid tool arguments JSON"); }
      requireValue(args?.reference === "win-the-bot" && Object.keys(args).length === 1, "Tool arguments do not match the requested schema");
      return completion;
    });
    // Pure local fixture: never execute arbitrary model-selected functions.
    // The answer is revealed only in the tool result, so a canned reply cannot pass.
    const verificationCode = randomUUID();
    messages.push({ role: "assistant", content: first.content || null, tool_calls: first.tool_calls,
      ...(first.reasoning_content ? { reasoning_content: first.reasoning_content } : {}) });
    messages.push({ role: "tool", tool_call_id: first.tool_calls[0].id, content: JSON.stringify({ verification_code: verificationCode }) });
    const final = await step("tool-result-to-final-answer", "/chat/completions", { ...common, messages, tools, tool_choice: "none" }, async (response) => {
      const completion = await readCompletion(response);
      requireValue(completion.finish_reason === "stop", "Expected stop finish reason");
      requireValue(completion.tool_calls.length === 0, "Unexpected additional tool call");
      requireValue(completion.content.trim() === verificationCode, "Final answer did not preserve the tool result");
      return completion;
    });
    report.completions = [first, final].map(({ model, finish_reason, usage }) => ({ model, finish_reason, usage }));
    report.status = "passed";
  } catch (error) {
    // Avoid including transport messages that could embed response/request data.
    const known = /^(HTTP \d{3}|Expected |Invalid |Unexpected |Selected model |Tool |Final answer |Stream |Response |Model discovery |Missing |Duplicate )/;
    report.reason = error instanceof Error && known.test(error.message) ? error.message : "Transport, timeout, or response parsing failure";
  }
  // Defense in depth against a server echoing the key in allowed metadata fields.
  return JSON.parse(JSON.stringify(report).split(apiKey).join("[REDACTED]"));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = await runInferenceJourney({ enabled: process.env.RUN_INFERENCE_JOURNEY === "true", apiKey: process.env.TELNYX_API_KEY, model: process.env.TELNYX_INFERENCE_MODEL });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  // A skipped live check is not a successful verification.
  process.exitCode = report.status === "passed" ? 0 : report.status === "skipped" ? 2 : 1;
}
