/**
 * AI-3951: re-pointed tool routes and the `query_mode: "flat"` executor path.
 * Run with `tsx tests/repointed-routes.test.ts` (no API key).
 */
import assert from "node:assert/strict";

import { TelnyxAPIClient } from "../src/shared/api-client.js";
import { TOOL_DEFINITIONS } from "../src/shared/constants.js";
import { ToolkitCore } from "../src/shared/toolkit-core.js";

const REMOVED = ["list_messages", "update_e911_address", "update_mission_step"];
for (const name of REMOVED) {
  assert.ok(!(name in TOOL_DEFINITIONS), `${name} is not restored by the AI-3974 read-only subset`);
}

const REPOINTED: Record<string, [string, string]> = {
  list_10dlc_brands: ["GET", "/10dlc/brand"],
  create_10dlc_brand: ["POST", "/10dlc/brand"],
  get_10dlc_brand: ["GET", "/10dlc/brand/{brand_id}"],
  list_10dlc_campaigns: ["GET", "/10dlc/campaign"],
  get_10dlc_campaign: ["GET", "/10dlc/campaign/{campaign_id}"],
  assign_10dlc_campaign: ["POST", "/10dlc/phone_number_campaigns"],
  list_verify_profiles: ["GET", "/verify_profiles"],
  create_verify_profile: ["POST", "/verify_profiles"],
  get_verify_profile: ["GET", "/verify_profiles/{verify_profile_id}"],
  list_e911_addresses: ["GET", "/dynamic_emergency_addresses"],
  create_e911_address: ["POST", "/dynamic_emergency_addresses"],
  delete_e911_address: ["DELETE", "/dynamic_emergency_addresses/{id}"],
  list_portout_orders: ["GET", "/portouts"],
  get_portout_order: ["GET", "/portouts/{id}"],
  list_portout_comments: ["GET", "/portouts/{id}/comments"],
  create_portout_comment: ["POST", "/portouts/{id}/comments"],
  list_portout_documents: ["GET", "/portouts/{id}/supporting_documents"],
  upload_portout_document: ["POST", "/portouts/{id}/supporting_documents"],
  list_portout_rejection_codes: ["GET", "/portouts/rejections/{portout_id}"],
  list_network_interfaces: ["GET", "/networks/{network_id}/network_interfaces"],
  list_voice_clones: ["GET", "/voice_clones"],
  create_voice_clone: ["POST", "/voice_clones"],
  list_voice_designs: ["GET", "/voice_designs"],
  create_voice_design: ["POST", "/voice_designs"],
  get_voice_design: ["GET", "/voice_designs/{id}"],
  list_toll_free_verifications: ["GET", "/messaging_tollfree/verification/requests"],
  create_toll_free_verification: ["POST", "/messaging_tollfree/verification/requests"],
  text_to_speech: ["POST", "/text-to-speech/speech"],
  list_detail_records: ["GET", "/detail_records"],
  get_whatsapp_template: ["GET", "/whatsapp/message_templates/{id}"],
};
for (const [name, [method, path]] of Object.entries(REPOINTED)) {
  const tool = TOOL_DEFINITIONS[name];
  assert.ok(tool, `missing tool ${name}`);
  assert.equal(tool.method, method, name);
  assert.equal(tool.path, path, name);
  for (const m of path.matchAll(/\{([a-z_]+)\}/g)) {
    assert.ok(m[1] in tool.parameters.properties, `${name}: placeholder ${m[1]} not a parameter`);
    assert.ok(tool.parameters.required.includes(m[1]), `${name}: placeholder ${m[1]} not required`);
  }
}

const flat = Object.values(TOOL_DEFINITIONS).filter((t) => t.query_mode === "flat").map((t) => t.name).sort();
assert.deepEqual(flat, ["list_10dlc_brands", "list_10dlc_campaigns", "list_toll_free_verifications"]);

interface Req { method: string; path: string; value?: Record<string, unknown> }
class MockClient {
  readonly apiKey = "test-key";
  readonly requests: Req[] = [];
  async get(path: string, params?: Record<string, unknown>) { this.requests.push({ method: "GET", path, value: params }); return { data: [] }; }
  async post(path: string, body?: Record<string, unknown>) { this.requests.push({ method: "POST", path, value: body }); return { data: {} }; }
  async delete(path: string) { this.requests.push({ method: "DELETE", path }); return {}; }
}

async function assertExecutor(): Promise<void> {
  const client = new MockClient();
  const core = new ToolkitCore(client as unknown as TelnyxAPIClient);

  await core.runTool("list_toll_free_verifications", { page: 1, page_size: 5, status: "Verified" });
  assert.deepEqual(client.requests.at(-1), {
    method: "GET", path: "/messaging_tollfree/verification/requests", value: { page: 1, page_size: 5, status: "Verified" },
  });

  await core.runTool("list_10dlc_campaigns", { brandId: "b1", recordsPerPage: 2 });
  assert.deepEqual(client.requests.at(-1)?.value, { brandId: "b1", recordsPerPage: 2 });

  // default mode still rewrites page_/filter_
  await core.runTool("list_voice_clones", { page_size: 5, filter_name: "x" });
  assert.deepEqual(client.requests.at(-1)?.value, { "page[size]": 5, "filter[name]": "x" });

  // snake_case placeholders are interpolated and removed from the query
  await core.runTool("list_network_interfaces", { network_id: "net-1", page_size: 1 });
  assert.equal(client.requests.at(-1)?.path, "/networks/net-1/network_interfaces");
  assert.deepEqual(client.requests.at(-1)?.value, { "page[size]": 1 });
}

// AI-4013: the wireless service scopes usage through filter.sim_card_id.
{
  const tool = TOOL_DEFINITIONS.get_sim_card_data_usage;
  assert.ok(tool.parameters.required.includes("filter_sim_card_id"));
  assert.equal(tool.parameters.properties.sim_card_id, undefined);
  const client = new MockClient();
  await new ToolkitCore(client as unknown as TelnyxAPIClient).runTool(
    "get_sim_card_data_usage", { filter_sim_card_id: "sim-1" },
  );
  assert.deepEqual(client.requests.at(-1), {
    method: "GET", path: "/network_daily_data_usage", value: { "filter[sim_card_id]": "sim-1" },
  });
}

// AI-4013: MDR report filter collections must remain JSON arrays.
{
  const props = TOOL_DEFINITIONS.create_usage_report.parameters.properties;
  for (const name of ["directions", "record_types"]) {
    assert.equal(props[name].type, "array");
    assert.equal(props[name].items?.type, "string");
    assert.equal(props[name].enum, undefined);
  }
  const client = new MockClient();
  const args = { start_date: "2026-11-01T00:00:00Z", end_date: "2026-11-02T00:00:00Z",
    directions: ["inbound", "outbound"], record_types: ["completed"] };
  await new ToolkitCore(client as unknown as TelnyxAPIClient).runTool("create_usage_report", args);
  assert.deepEqual(client.requests.at(-1), {
    method: "POST", path: "/reports/batch_mdr_reports", value: args,
  });
}

// AI-4013: route selection must reach the real client's serialized HTTP body.
// Source: messaging-monorepo 35a466e6 public/verifications.py:68-97,161-165;
// schemas/verifications.py:34-51 (type is not a request-body field).
{
  const tool = TOOL_DEFINITIONS.verify_phone;
  assert.equal(tool.method, "POST");
  assert.equal(tool.path, "/verifications/{type}");
  assert.deepEqual(tool.parameters.required, ["phone_number", "verify_profile_id"]);
  assert.deepEqual(Object.keys(tool.parameters.properties).sort(),
    ["phone_number", "verify_profile_id", "type", "timeout_secs"].sort());
  assert.equal(tool.parameters.properties.type.type, "string");
  assert.deepEqual(tool.parameters.properties.type.enum, ["sms", "call", "whatsapp"]);
  assert.equal(tool.parameters.properties.type.default, "sms");

  const originalFetch = globalThis.fetch;
  const requests: { url: string; method?: string; body: unknown }[] = [];
  globalThis.fetch = async (input, init) => {
    requests.push({ url: String(input), method: init?.method, body: JSON.parse(String(init?.body)) });
    return new Response(JSON.stringify({ data: { id: "verification-1" } }), { status: 200 });
  };
  try {
    const core = new ToolkitCore(new TelnyxAPIClient("test-key"));
    const body = { phone_number: "+15555550123", verify_profile_id: "profile-1", timeout_secs: 120 };
    for (const channel of ["sms", "call", "whatsapp", undefined]) {
      const args = { ...body, ...(channel === undefined ? {} : { type: channel }) };
      const original = { ...args };
      const count = requests.length;
      assert.deepEqual(JSON.parse(await core.runTool("verify_phone", args)), { data: { id: "verification-1" } });
      assert.equal(requests.length, count + 1);
      assert.deepEqual(requests.at(-1), {
        url: `https://api.telnyx.com/v2/verifications/${channel ?? "sms"}`, method: "POST", body,
      });
      assert.deepEqual(args, original);
    }
    let reportingCalls = 0;
    const reporting = core as unknown as { reportTelemetry: () => void; reportFriction: () => void };
    reporting.reportTelemetry = reporting.reportFriction = () => { reportingCalls += 1; };
    for (const type of ["flashcall", "email", "SMS", "", "../sms", "sms?x=1", null, undefined, 1, false, [], {}]) {
      const count = requests.length;
      const result = JSON.parse(await core.runTool("verify_phone", { ...body, type }));
      assert.match(result.error, /type must be one of: sms, call, whatsapp/);
      assert.equal(requests.length, count, "invalid type must have zero HTTP requests");
      assert.equal(reportingCalls, 0, "invalid type must return before telemetry/friction");
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
}

await assertExecutor();
console.log("Re-pointed route and flat query-mode tests passed");

// text_to_speech: the API defaults to binary audio and the client parses JSON,
// so output_type must be required and limited to base64_output.
{
  const tts = TOOL_DEFINITIONS.text_to_speech;
  assert.ok(tts.parameters.required.includes("output_type"));
  assert.deepEqual(tts.parameters.properties.output_type.enum, ["base64_output"]);
  assert.equal(tts.parameters.properties.provider.enum, undefined);
}
