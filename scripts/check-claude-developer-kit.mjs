#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pluginRoot = path.join(
  repoRoot,
  "providers",
  "claude",
  "plugins",
  "telnyx-developer-kit",
);
const manifestPath = path.join(pluginRoot, ".claude-plugin", "plugin.json");
const marketplacePath = path.join(repoRoot, ".claude-plugin", "marketplace.json");
const builderPath = path.join(pluginRoot, "agents", "telnyx-builder.md");
const contractPath = path.join(
  repoRoot,
  "submission",
  "telnyx-developer-kit",
  "connector-contract.json",
);

const connectorUrl = "https://api.telnyx.com/v2/ai/mcp";
const contractSha256 = "29c307e0735c462d5cafa7a4d1223fd2e8b57664b013d6fd46289574fb482878";
const expectedSkills = [
  "telnyx-kit-architecture-patterns",
  "telnyx-kit-debugging",
  "telnyx-kit-guardrails",
  "telnyx-kit-product-navigator",
  "telnyx-kit-quickstart",
  "telnyx-kit-twilio-switch",
];
const expectedTools = [
  "list_api_endpoints",
  "get_api_endpoint_schema",
  "lookup_phone_number",
  "get_call_status",
  "list_call_events",
  "search_recordings",
];

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function assertNoSymlinks(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    assert.equal((await lstat(target)).isSymbolicLink(), false, `symlink: ${target}`);
    if (entry.isDirectory()) await assertNoSymlinks(target);
  }
}

async function main() {
  const manifest = await readJson(manifestPath);
  assert.equal(manifest.name, "telnyx-developer-kit");
  assert.deepEqual(Object.keys(manifest.mcpServers ?? {}), ["telnyx"]);
  assert.deepEqual(manifest.mcpServers.telnyx, {
    type: "http",
    url: connectorUrl,
  });
  assert.equal("userConfig" in manifest, false, "manifest must use OAuth, not API-key config");

  const skills = (await readdir(path.join(pluginRoot, "skills"))).sort();
  assert.deepEqual(skills, expectedSkills);
  const agents = (await readdir(path.join(pluginRoot, "agents"))).sort();
  assert.deepEqual(agents, ["telnyx-builder.md"]);

  for (const skill of expectedSkills) {
    const canonical = await readFile(path.join(repoRoot, "skills", skill, "SKILL.md"));
    const packaged = await readFile(path.join(pluginRoot, "skills", skill, "SKILL.md"));
    assert.deepEqual(packaged, canonical, `${skill} differs from its canonical source`);
  }

  const builder = await readFile(builderPath, "utf8");
  for (const tool of expectedTools) {
    assert.match(builder, new RegExp(`\\b${tool}\\b`), `builder omits ${tool}`);
  }
  assert.doesNotMatch(builder, /\binvoke_api_endpoint\b/);
  assert.match(builder, /explicit user approval/i);
  assert.match(builder, /confirm_billable_lookup:\s*true/);

  const contractBytes = await readFile(contractPath);
  assert.equal(createHash("sha256").update(contractBytes).digest("hex"), contractSha256);
  const contract = JSON.parse(contractBytes);
  assert.equal(contract.id, "telnyx-ai-connector");
  assert.equal(contract.version, "1.0.0-preview.5");
  assert.deepEqual(contract.hosts, ["claude", "codex"]);
  assert.deepEqual(contract.tools.map(({ name }) => name).sort(), [...expectedTools].sort());
  const inputSchemaOwners = new Map();
  for (const tool of contract.tools) {
    if (tool.inputSchema) inputSchemaOwners.set(tool.name, "tool");
  }
  for (const endpoint of contract.endpoints) {
    assert.equal(
      inputSchemaOwners.has(endpoint.executionTool),
      false,
      `duplicate input schema for ${endpoint.executionTool}`,
    );
    inputSchemaOwners.set(endpoint.executionTool, "endpoint");
  }
  assert.deepEqual(
    [...inputSchemaOwners.keys()].sort(),
    [...expectedTools].sort(),
    "the frozen contract must pin exactly one input schema for every tool",
  );
  const lookup = contract.endpoints.find(({ name }) => name === "number_lookup");
  assert.deepEqual(lookup.inputSchema.properties.confirm_billable_lookup, { const: true });
  assert.ok(lookup.inputSchema.required.includes("confirm_billable_lookup"));

  const guidanceRoots = new Map([
    ["canonical", path.join(repoRoot, "skills")],
    ["claude", path.join(pluginRoot, "skills")],
    ["cursor", path.join(repoRoot, "providers", "cursor", "plugin", "skills")],
  ]);
  for (const [label, root] of guidanceRoots) {
    const debugging = await readFile(
      path.join(root, "telnyx-kit-debugging", "SKILL.md"),
      "utf8",
    );
    const guardrails = await readFile(
      path.join(root, "telnyx-kit-guardrails", "SKILL.md"),
      "utf8",
    );
    assert.match(
      debugging,
      /\| Messaging SMS\/MMS API request \| 40300 \| Recipient opted out \(STOP\) \|/,
      `${label} debugging guidance lost synchronous STOP handling`,
    );
    assert.match(
      debugging,
      /\| Messaging SMS\/MMS delivery \| 40300 \| Context-dependent delivery error \|/,
      `${label} debugging guidance lost asynchronous 40300 context handling`,
    );
    assert.match(
      debugging,
      /\| Messaging SMS\/MMS delivery \| 40008 \| Undeliverable \|/,
      `${label} debugging guidance lost asynchronous 40008 handling`,
    );
    assert.match(guardrails, /STOP\/40300/);
    assert.match(guardrails, /every asynchronous delivery\n  event with code 40300/);
    assert.match(guardrails, /Error 40008 is a general asynchronous/);
    const combinedGuidance = `${debugging}\n${guardrails}`;
    assert.doesNotMatch(combinedGuidance, /STOP\/40008/);
    assert.doesNotMatch(combinedGuidance, /40008 \| Number opted out/);
    assert.doesNotMatch(combinedGuidance, /40300 \| Carrier rejected/);
  }

  const pluginText = await readFile(manifestPath, "utf8");
  assert.doesNotMatch(pluginText, /telnyx_api_key|user_config|authorization/i);
  assert.doesNotMatch(pluginText, /https:\/\/api\.telnyx\.com\/v2\/mcp(?:["/]|$)/);

  const marketplace = await readJson(marketplacePath);
  const entries = marketplace.plugins.filter(({ name }) => name === manifest.name);
  assert.equal(entries.length, 1, "marketplace must contain exactly one developer-kit entry");
  assert.equal(entries[0].source, "./providers/claude/plugins/telnyx-developer-kit");
  assert.equal(entries[0].version, manifest.version);

  await assertNoSymlinks(pluginRoot);
  console.log("Claude developer-kit connector contract: OK");
}

main().catch((error) => {
  console.error(error.stack ?? error);
  process.exitCode = 1;
});
