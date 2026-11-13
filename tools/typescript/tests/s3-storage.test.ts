import assert from "node:assert/strict";
import { TelnyxAgentToolkit } from "../src/index.js";
import { STORAGE_TOOL_DEFINITIONS } from "../src/shared/storage.js";
import { buildToolParametersZodSchema } from "../src/shared/tool-parameters-zod.js";
import { z } from "zod";

for (const definition of Object.values(STORAGE_TOOL_DEFINITIONS)) {
  const schema = buildToolParametersZodSchema(z, definition.parameters);
  if (definition.parameters.required.length) assert.throws(() => schema.parse({}));
  else assert.deepEqual(schema.parse({}), {}); // Omitted defaults are supplied by the executor.
}

const names = ["list_storage_buckets", "create_storage_bucket", "delete_storage_bucket", "upload_storage_object", "get_storage_object"];
assert.ok(new TelnyxAgentToolkit("test-key").enabledTools.every(t => !names.includes(t.name)));
const toolkit = new TelnyxAgentToolkit("test-key", { storage: true, configuration: { actions: { storage: Object.fromEntries(names.map(n => [n, true])) } } });
assert.deepEqual(toolkit.enabledTools.map(t => t.name).sort(), names.sort());
assert.deepEqual(toolkit.getOpenAITools().map((t: any) => t.function.name).sort(), names.sort());
const base = { bucket_name: "my-bucket", key: "key", content: "hello", content_encoding: "utf-8" };
for (const overrides of [{ key: "a/../b" }, { key: "" }, { content_encoding: "gzip" }, { content: "!!!!", content_encoding: "base64" }, { content: "Zh==", content_encoding: "base64" }, { content: "x".repeat(1024 * 1024 + 1) }, { region: "https://example.com" }, { bucket_name: "https://x" }, { extra: "x" }, { content_type: 3 }, { key: "\uD800" }]) {
  const result = JSON.parse(await toolkit.core.runTool("upload_storage_object", { ...base, ...overrides }));
  assert.ok(result.error);
  assert.doesNotMatch(result.error, /Install/);
}
console.log("Storage registration and validation passed (local only)");
