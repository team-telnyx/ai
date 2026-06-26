#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const manifestPath = join(__dirname, "models.example.json");
const live = process.argv.includes("--live");
const apiKey = process.env.TELNYX_API_KEY;
const baseUrl = process.env.TELNYX_OPENROUTER_BASE_URL ?? "https://api.telnyx.com/v2/ai/openai";
const testModel = process.env.TELNYX_OPENROUTER_TEST_MODEL ?? "moonshotai/Kimi-K2.6";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertString(value, field) {
  assert(typeof value === "string" && value.length > 0, `${field} must be a non-empty string`);
}

function assertStringArray(value, field) {
  assert(Array.isArray(value) && value.length > 0, `${field} must be a non-empty array`);
  for (const item of value) assertString(item, field);
}

function assertPricing(pricing, modelId) {
  assert(pricing && typeof pricing === "object", `${modelId}.pricing must be an object`);
  for (const key of ["prompt", "completion", "request", "image", "input_cache_read"]) {
    assertString(pricing[key], `${modelId}.pricing.${key}`);
  }
}

async function loadManifest() {
  const raw = await readFile(manifestPath, "utf8");
  return JSON.parse(raw);
}

async function validateStaticManifest() {
  const manifest = await loadManifest();
  assert(Array.isArray(manifest.data), "models.example.json must contain a data array");
  assert(manifest.data.length >= 4, "models.example.json should include the initial chat model candidates");

  for (const model of manifest.data) {
    assertString(model.id, "model.id");
    assertString(model.name, `${model.id}.name`);
    assertStringArray(model.input_modalities, `${model.id}.input_modalities`);
    assertStringArray(model.output_modalities, `${model.id}.output_modalities`);
    assert(Number.isInteger(model.context_length) && model.context_length > 0, `${model.id}.context_length must be a positive integer`);
    assert("max_output_length" in model, `${model.id}.max_output_length must be present`);
    assertPricing(model.pricing, model.id);
    assertStringArray(model.supported_sampling_parameters, `${model.id}.supported_sampling_parameters`);
    assert(Array.isArray(model.supported_features), `${model.id}.supported_features must be an array`);
    assert(model.is_ready === false, `${model.id}.is_ready must stay false until product fields are confirmed`);
    assert(model.openrouter && typeof model.openrouter.slug === "string", `${model.id}.openrouter.slug is required`);
    assert(Array.isArray(model.datacenters) && model.datacenters.length > 0, `${model.id}.datacenters is required`);
  }

  const todoCount = JSON.stringify(manifest).match(/TODO_/g)?.length ?? 0;
  assert(todoCount > 0, "draft manifest should keep TODO placeholders until product-approved metadata is available");

  console.log(`Static manifest check passed for ${manifest.data.length} model candidates (${todoCount} TODO placeholders remain).`);
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { response, body };
}

async function validateModelsEndpoint() {
  const { response, body } = await fetchJson(`${baseUrl}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  assert(response.ok, `GET /models failed with ${response.status}: ${JSON.stringify(body).slice(0, 500)}`);
  assert(body && Array.isArray(body.data), "GET /models response must include a data array");
  assert(body.data.length > 0, "GET /models returned no models");

  const ids = body.data.map((model) => model.id).filter(Boolean);
  console.log(`Live models check passed. Returned ${ids.length} model IDs.`);
  console.log(`Sample models: ${ids.slice(0, 5).join(", ")}`);
}

async function validateChatCompletion() {
  const { response, body } = await fetchJson(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: testModel,
      messages: [{ role: "user", content: "Reply with the word ready." }],
      max_tokens: 16,
    }),
  });

  assert(response.ok, `chat completion failed with ${response.status}: ${JSON.stringify(body).slice(0, 500)}`);
  assert(body && Array.isArray(body.choices) && body.choices.length > 0, "chat completion response must include choices");
  if (!body.usage) {
    console.warn("Warning: chat completion response did not include usage; OpenRouter may require usage accounting.");
  }
  console.log(`Live chat completion check passed with model ${testModel}.`);
}

async function validateStreamingChatCompletion() {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: testModel,
      messages: [{ role: "user", content: "Reply with a short sentence." }],
      max_tokens: 24,
      stream: true,
    }),
  });

  assert(response.ok, `streaming chat failed with ${response.status}: ${await response.text()}`);
  const text = await response.text();
  assert(text.includes("data:"), "streaming response should contain SSE data lines");
  assert(text.includes("[DONE]") || text.trim().length > 0, "streaming response should include content or a done marker");
  console.log("Live streaming chat check passed.");
}

async function validateInvalidModelError() {
  const { response } = await fetchJson(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "telnyx-openrouter/nonexistent-model",
      messages: [{ role: "user", content: "This should fail." }],
      max_tokens: 8,
    }),
  });

  assert(response.status >= 400 && response.status < 500, `invalid model should return a 4xx user/provider error, got ${response.status}`);
  console.log(`Invalid-model error behavior check passed with HTTP ${response.status}.`);
}

async function main() {
  await validateStaticManifest();

  if (!live) {
    console.log("Live checks skipped. Pass --live with TELNYX_API_KEY to validate Telnyx endpoints.");
    return;
  }

  assert(apiKey, "TELNYX_API_KEY is required for --live checks");
  await validateModelsEndpoint();
  await validateChatCompletion();
  await validateStreamingChatCompletion();
  await validateInvalidModelError();
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
