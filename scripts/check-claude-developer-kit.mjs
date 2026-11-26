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
const contractSha256 = "f14d578ce1f36f339ee9c506009f678b49dace1fda6dee288f131f91082e2fad";
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
  assert.match(manifest.description, /five/);
  assert.doesNotMatch(manifest.description, /Number Lookup|six-tool/);
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
  assert.match(builder, /Number Lookup is unavailable/i);
  assert.doesNotMatch(builder, /confirm_billable_lookup:\s*true/);

  const contractBytes = await readFile(contractPath);
  assert.equal(createHash("sha256").update(contractBytes).digest("hex"), contractSha256);
  const contract = JSON.parse(contractBytes);
  assert.equal(contract.id, "telnyx-ai-connector");
  assert.equal(contract.version, "1.0.0-preview.7");
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
  assert.equal(contract.endpoints.some(({ path }) => path.includes("number_lookup")), false);

  const guidanceRoots = new Map([
    ["canonical", path.join(repoRoot, "skills")],
    ["claude", path.join(pluginRoot, "skills")],
    ["cursor", path.join(repoRoot, "providers", "cursor", "plugin", "skills")],
  ]);
  for (const [label, root] of guidanceRoots) {
    const architecture = await readFile(path.join(root, "telnyx-kit-architecture-patterns", "SKILL.md"), "utf8");
    assert.match(architecture, /WebSocket state on the received\s+`stream_id`/, `${label} media stream identity`);
    assert.doesNotMatch(architecture, /stream state on `StreamSid`/);
    const quickstart = await readFile(path.join(root, "telnyx-kit-quickstart", "SKILL.md"), "utf8");
    assert.match(quickstart, /authenticated TeXML callbacks as POST/, `${label} authenticated callback method`);
    assert.match(quickstart, /reject GET before trusting callback fields/, `${label} callback signature boundary`);
    const debugging = await readFile(
      path.join(root, "telnyx-kit-debugging", "SKILL.md"),
      "utf8",
    );
    const guardrails = await readFile(
      path.join(root, "telnyx-kit-guardrails", "SKILL.md"),
      "utf8",
    );
    const navigator = await readFile(path.join(root, "telnyx-kit-product-navigator", "SKILL.md"), "utf8");
    assert.doesNotMatch(navigator, /lookup_phone_number/, `${label} removed hosted lookup tool`);
    assert.doesNotMatch(guardrails, /confirm_billable_lookup/, `${label} removed lookup parameter`);
    assert.match(navigator, /Number Lookup is not available through this connector/);
    assert.match(navigator, /catalog covers only three reviewed endpoints/);
    assert.match(navigator, /Messaging, TeXML, Verify and Numbers require separate API documentation/);
    assert.match(guardrails, /even with approval/);
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
  const readme = await readFile(path.join(repoRoot, "README.md"), "utf8");
  const submissionLinks = [...readme.matchAll(/\]\((submission\/[^)#]+)(?:#[^)]*)?\)/g)];
  assert.ok(submissionLinks.length, "README must link to the submission artifact");
  for (const [, target] of submissionLinks) {
    assert.ok((await lstat(path.join(repoRoot, target))).isFile(), `missing submission artifact: ${target}`);
  }
  assert.doesNotMatch(pluginText, /telnyx_api_key|user_config|authorization/i);
  assert.doesNotMatch(pluginText, /https:\/\/api\.telnyx\.com\/v2\/mcp(?:["/]|$)/);

  const marketplace = await readJson(marketplacePath);
  const entries = marketplace.plugins.filter(({ name }) => name === manifest.name);
  assert.equal(entries.length, 1, "marketplace must contain exactly one developer-kit entry");
  assert.equal(entries[0].source, "./providers/claude/plugins/telnyx-developer-kit");
  assert.equal(entries[0].version, manifest.version);
  assert.match(entries[0].description, /five-tool/);
  assert.doesNotMatch(entries[0].description, /Number Lookup|six-tool/);

  await assertNoSymlinks(pluginRoot);
  console.log("Claude developer-kit connector contract: OK");
}

main().catch((error) => {
  console.error(error.stack ?? error);
  process.exitCode = 1;
});
