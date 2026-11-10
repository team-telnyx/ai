import assert from "node:assert/strict";
import { test } from "node:test";
import { z } from "zod";
import { OpenAIToolkit } from "../src/openai/toolkit.js";
import { TelnyxAPIClient } from "../src/shared/api-client.js";
import { TOOL_DEFINITIONS } from "../src/shared/constants.js";
import { ToolkitCore } from "../src/shared/toolkit-core.js";
import { buildToolParametersZodSchema } from "../src/shared/tool-parameters-zod.js";

const cases = [
  { name: "update_mission_run", field: "result_payload", args: { mission_id: "mission", run_id: "run" }, value: { nested: { count: 2 }, list: [true, null, "ok"] } },
  { name: "log_mission_event", field: "payload", args: { mission_id: "mission", run_id: "run", type: "status_change", summary: "Done" }, value: { nested: { count: 2 }, list: [true, null, "ok"] } },
  { name: "create_insight", field: "json_schema", args: { name: "Outcome", instructions: "Extract outcome" }, value: { type: "object", properties: { outcome: { type: "string" } } } },
  { name: "schedule_call", field: "dynamic_variables", args: { assistant_id: "assistant", to: "+15555550100", from_: "+15555550101", scheduled_at_fixed_datetime: "2030-01-01T00:00:00Z" }, value: { customer: "Ada", reference: "123" } },
];

for (const { name, field, args, value } of cases) {
  test(`${name} exposes an object and preserves it through adapters and HTTP`, async () => {
    const definition = TOOL_DEFINITIONS[name];
    assert.equal(definition.parameters.properties[field].type, "object");
    const input = { ...args, [field]: value };
    // Both Vercel AI and LangChain use this exact shared conversion entrypoint.
    const schema = buildToolParametersZodSchema(z, definition.parameters);
    assert.deepEqual(schema.parse(input)[field], value);
    assert.equal(schema.safeParse({ ...input, [field]: JSON.stringify(value) }).success, false);
    assert.equal(schema.safeParse({ ...input, [field]: [value] }).success, false);
    assert.equal(schema.safeParse({ ...input, [field]: null }).success, false);
    if (!definition.parameters.required.includes(field)) {
      assert.equal(schema.safeParse(args).success, true);
    }

    const client = new TelnyxAPIClient("test-key", { baseUrl: "https://toolkit.invalid/v2" });
    const core = new ToolkitCore(client);
    const adapter = new OpenAIToolkit(core, [definition]);
    const exported = adapter.getTools()[0].function as { parameters: typeof definition.parameters; strict?: boolean };
    assert.equal(exported.parameters.properties[field].type, "object");
    // Free-form objects require ordinary function calling, not strict outputs.
    assert.notEqual(exported.strict, true);
    const originalFetch = globalThis.fetch;
    const calls: { url: string; method: string; body: Record<string, unknown> }[] = [];
    globalThis.fetch = async (url, init) => {
      calls.push({ url: String(url), method: String(init?.method), body: JSON.parse(String(init?.body)) });
      return new Response(JSON.stringify({ data: { id: "accepted" } }), { status: 200 });
    };
    try {
      const result = await adapter.execute({ function: { name, arguments: JSON.stringify(input) } });
      assert.deepEqual(JSON.parse(result), { data: { id: "accepted" } });
      assert.equal(calls.length, 1);
      assert.equal(calls[0].method, definition.method);
      const expectedPath = definition.path.replace(/\{([^}]+)\}/g, (_, key) => String(input[key as keyof typeof input]));
      assert.equal(calls[0].url, `https://toolkit.invalid/v2${expectedPath}`);
      const expectedBody: Record<string, unknown> = { ...input };
      for (const match of definition.path.matchAll(/\{([^}]+)\}/g)) delete expectedBody[match[1]];
      if ("from_" in expectedBody) { expectedBody.from = expectedBody.from_; delete expectedBody.from_; }
      assert.deepEqual(calls[0].body, expectedBody);
      assert.deepEqual(calls[0].body[field], value);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
}
