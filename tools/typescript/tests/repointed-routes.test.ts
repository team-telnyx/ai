/**
 * AI-3951: re-pointed tool routes and the `query_mode: "flat"` executor path.
 * Run with `tsx tests/repointed-routes.test.ts` (no API key).
 */
import assert from "node:assert/strict";

import type { TelnyxAPIClient } from "../src/shared/api-client.js";
import { TOOL_DEFINITIONS } from "../src/shared/constants.js";
import { ToolkitCore } from "../src/shared/toolkit-core.js";

const REMOVED = ["list_messages", "bulk_lookup_numbers", "update_e911_address", "get_voice_clone", "update_mission_step"];
for (const name of REMOVED) {
  assert.ok(!(name in TOOL_DEFINITIONS), `${name} has no REST route and must stay removed (AI-3974)`);
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

await assertExecutor();
console.log("Re-pointed route and flat query-mode tests passed");
