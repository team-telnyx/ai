/**
 * Mock-binary coverage for AI collection provisioning and source ingestion.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliRoot = join(__dirname, "..");
const cliBin = join(cliRoot, "bin", "telnyx-agent.ts");

function setupFakeTelnyx(): { logPath: string; env: NodeJS.ProcessEnv } {
  const tempDir = mkdtempSync(join(tmpdir(), "telnyx-agent-ai-collection-lifecycle-"));
  const binDir = join(tempDir, "bin");
  const logPath = join(tempDir, "args.jsonl");
  const fakeTelnyx = join(binDir, "telnyx");
  mkdirSync(binDir, { recursive: true });

  writeFileSync(fakeTelnyx, `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
if (args[0] === "--version") { console.log("telnyx version 0.27.0"); process.exit(0); }
fs.appendFileSync(process.env.TELNYX_FAKE_ARGS_LOG, JSON.stringify(args) + "\\n");
function flag(name) { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : undefined; }
const command = args.slice(0, 2).join(" ");
if (command === "ai:collections create") {
  console.log(JSON.stringify({ data: { id: "collection-uuid", name: flag("--name"), slug: flag("--slug") } }));
} else if (command === "ai:collections retrieve") {
  console.log(JSON.stringify({ data: { id: "collection-uuid", name: "Support", slug: flag("--slug") } }));
} else if (command === "ai:collections list") {
  console.log(JSON.stringify({ data: [{ id: "collection-uuid", name: "Support", slug: "support" }], meta: { page_number: Number(flag("--page-number") || 1) } }));
} else if (command === "ai:collections update") {
  console.log(JSON.stringify({ data: { id: flag("--uuid"), name: flag("--name"), description: flag("--description") } }));
} else if (command === "ai:collections:sources create") {
  console.log(JSON.stringify({ data: { id: "source-uuid", source_type: flag("--source-type"), bucket_id: flag("--bucket-id") } }));
} else if (command === "ai:collections:sources list") {
  console.log(JSON.stringify({ data: [{ id: "source-uuid", source_type: "bucket" }], meta: { status: "ready" } }));
} else if (command === "ai:collections:sources replace") {
  const sources = args.reduce((items, value, index) => value === "--source" ? [...items, JSON.parse(args[index + 1])] : items, []);
  console.log(JSON.stringify({ data: sources.map((source, index) => ({ id: "source-" + index, ...source })), meta: { removed: ["old-source"] } }));
} else if (command === "ai:collections delete" || command === "ai:collections:sources delete") {
  // Generated delete routes intentionally return an empty success body.
} else {
  console.error("unexpected command: " + args.join(" "));
  process.exit(2);
}
`);
  chmodSync(fakeTelnyx, 0o755);
  return {
    logPath,
    env: {
      ...process.env,
      TELNYX_CLI_PATH: fakeTelnyx,
      TELNYX_FAKE_ARGS_LOG: logPath,
      TELNYX_API_KEY: "KEY_fake_test",
    },
  };
}

function runAgent(args: string[], env: NodeJS.ProcessEnv): { stdout: string; stderr: string; status: number } {
  const result = spawnSync(process.execPath, ["--import", "tsx", cliBin, ...args], {
    cwd: cliRoot,
    encoding: "utf8",
    env,
    timeout: 30_000,
  });
  return { stdout: result.stdout ?? "", stderr: result.stderr ?? "", status: result.status ?? 1 };
}

function loggedArgs(logPath: string): string[][] {
  if (!existsSync(logPath)) return [];
  const contents = readFileSync(logPath, "utf8");
  assert.ok(contents.endsWith("\n"), "mock binary must terminate JSONL records with real newlines");
  assert.equal(contents.includes("\\n"), false, "mock binary must not write literal escaped newlines");
  return contents.trimEnd().split("\n").map((line) => JSON.parse(line));
}

function assertFlag(args: string[], name: string, expected: string): void {
  const index = args.indexOf(name);
  assert.notEqual(index, -1, `expected ${name} in ${args.join(" ")}`);
  assert.equal(args[index + 1], expected);
}

describe("AI collection lifecycle and source ingestion", () => {
  it("dispatches collection provisioning, lifecycle, and source ingestion with exact generated CLI args", () => {
    const fake = setupFakeTelnyx();
    const initialSource = '{"source_type":"bucket","bucket_id":"knowledge-base"}';
    const replacementSource = '{"source_type":"voice"}';

    const create = runAgent([
      "create-ai-collection", "--name", "Support", "--description", "RAG knowledge", "--slug", "support",
      "--source", initialSource, "--json",
    ], fake.env);
    assert.equal(create.status, 0, create.stderr);
    assert.equal(JSON.parse(create.stdout).collection_id, "collection-uuid");

    const get = runAgent(["get-ai-collection", "--slug", "support", "--json"], fake.env);
    assert.equal(get.status, 0, get.stderr);
    assert.equal(JSON.parse(get.stdout).collection.slug, "support");

    const list = runAgent(["list-ai-collections", "--page-number", "2", "--page-size", "25", "--json"], fake.env);
    assert.equal(list.status, 0, list.stderr);
    assert.deepEqual(JSON.parse(list.stdout).meta, { page_number: 2 });

    const update = runAgent([
      "update-ai-collection", "--uuid", "collection-uuid", "--name", "Support v2", "--json",
    ], fake.env);
    assert.equal(update.status, 0, update.stderr);
    assert.equal(JSON.parse(update.stdout).collection.name, "Support v2");

    const sourceCreate = runAgent([
      "create-ai-collection-source", "--uuid", "collection-uuid", "--source-type", "bucket",
      "--bucket-id", "knowledge-base", "--json",
    ], fake.env);
    assert.equal(sourceCreate.status, 0, sourceCreate.stderr);
    assert.equal(JSON.parse(sourceCreate.stdout).source.bucket_id, "knowledge-base");

    const sourceList = runAgent(["list-ai-collection-sources", "--uuid", "collection-uuid", "--json"], fake.env);
    assert.equal(sourceList.status, 0, sourceList.stderr);
    assert.equal(JSON.parse(sourceList.stdout).sources[0].id, "source-uuid");

    const replace = runAgent([
      "replace-ai-collection-sources", "--uuid", "collection-uuid", "--source", replacementSource,
      "--confirm", "--json",
    ], fake.env);
    assert.equal(replace.status, 0, replace.stderr);
    assert.equal(JSON.parse(replace.stdout).sources[0].source_type, "voice");

    const sourceDelete = runAgent([
      "delete-ai-collection-source", "--uuid", "collection-uuid", "--source-id", "source-uuid", "--confirm", "--json",
    ], fake.env);
    assert.equal(sourceDelete.status, 0, sourceDelete.stderr);
    assert.deepEqual(JSON.parse(sourceDelete.stdout), { collection_uuid: "collection-uuid", source_id: "source-uuid", deleted: true });

    const collectionDelete = runAgent([
      "delete-ai-collection", "--uuid", "collection-uuid", "--confirm", "--json",
    ], fake.env);
    assert.equal(collectionDelete.status, 0, collectionDelete.stderr);
    assert.deepEqual(JSON.parse(collectionDelete.stdout), { collection_uuid: "collection-uuid", deleted: true });

    const logs = loggedArgs(fake.logPath);
    assert.equal(logs.length, 9);
    assert.deepEqual(logs[0], [
      "ai:collections", "create", "--name", "Support", "--description", "RAG knowledge", "--slug", "support",
      "--source", initialSource, "--format", "json",
    ]);
    assert.deepEqual(logs[1], ["ai:collections", "retrieve", "--slug", "support", "--format", "json"]);
    assert.deepEqual(logs[2], [
      "ai:collections", "list", "--page-number", "2", "--page-size", "25", "--format", "raw",
    ]);
    assert.deepEqual(logs[3], [
      "ai:collections", "update", "--uuid", "collection-uuid", "--name", "Support v2", "--format", "json",
    ]);
    assert.deepEqual(logs[4], [
      "ai:collections:sources", "create", "--uuid", "collection-uuid", "--source-type", "bucket",
      "--bucket-id", "knowledge-base", "--format", "json",
    ]);
    assert.deepEqual(logs[5], [
      "ai:collections:sources", "list", "--uuid", "collection-uuid", "--format", "json",
    ]);
    assert.deepEqual(logs[6], [
      "ai:collections:sources", "replace", "--uuid", "collection-uuid", "--source", replacementSource,
      "--format", "json",
    ]);
    assert.deepEqual(logs[7], [
      "ai:collections:sources", "delete", "--uuid", "collection-uuid", "--source-id", "source-uuid",
      "--format", "json",
    ]);
    assert.deepEqual(logs[8], ["ai:collections", "delete", "--uuid", "collection-uuid", "--format", "json"]);
  });

  it("requires bare confirmation before destructive collection and source actions", () => {
    for (const args of [
      ["delete-ai-collection", "--uuid", "collection-uuid", "--json"],
      ["delete-ai-collection-source", "--uuid", "collection-uuid", "--source-id", "source-uuid", "--confirm", "true", "--json"],
      ["replace-ai-collection-sources", "--uuid", "collection-uuid", "--source", '{"source_type":"voice"}', "--json"],
    ]) {
      const fake = setupFakeTelnyx();
      const result = runAgent(args, fake.env);
      assert.notEqual(result.status, 0, `expected ${args.join(" ")} to fail`);
      assert.match(JSON.parse(result.stdout).error, /bare --confirm/);
      assert.deepEqual(loggedArgs(fake.logPath), []);
    }
  });

  it("rejects incomplete mutations and malformed source objects before dispatch", () => {
    for (const args of [
      ["create-ai-collection", "--json"],
      ["update-ai-collection", "--uuid", "collection-uuid", "--json"],
      ["create-ai-collection-source", "--uuid", "collection-uuid", "--source-type", "bucket", "--json"],
      ["replace-ai-collection-sources", "--uuid", "collection-uuid", "--source", "[]", "--confirm", "--json"],
      ["replace-ai-collection-sources", "--uuid", "collection-uuid", "--source", '{"source_type":"bucket"}', "--confirm", "--json"],
    ]) {
      const fake = setupFakeTelnyx();
      const result = runAgent(args, fake.env);
      assert.notEqual(result.status, 0, `expected ${args.join(" ")} to fail`);
      assert.ok(JSON.parse(result.stdout).error);
      assert.deepEqual(loggedArgs(fake.logPath), []);
    }
  });

  it("registers lifecycle and source commands in help and capabilities", () => {
    const help = runAgent(["help"], process.env);
    assert.equal(help.status, 0, help.stderr);
    for (const command of [
      "create-ai-collection", "get-ai-collection", "list-ai-collections", "update-ai-collection", "delete-ai-collection",
      "create-ai-collection-source", "list-ai-collection-sources", "delete-ai-collection-source", "replace-ai-collection-sources",
    ]) assert.match(help.stdout, new RegExp(command));

    const capabilities = runAgent(["capabilities", "--json"], process.env);
    assert.equal(capabilities.status, 0, capabilities.stderr);
    const collections = JSON.parse(capabilities.stdout).api_capabilities["🤖 AI"].find(
      (capability: { name: string }) => capability.name === "AI Collections",
    );
    assert.deepEqual(collections.actions, [
      "create_ai_collection", "get_ai_collection", "list_ai_collections", "update_ai_collection", "delete_ai_collection",
      "create_ai_collection_source", "list_ai_collection_sources", "delete_ai_collection_source", "replace_ai_collection_sources",
      "search_ai_collection",
    ]);
  });
});
