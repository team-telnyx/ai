/**
 * Mock-binary coverage for AI collection RAG document retrieval.
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

function setupFakeTelnyx(version = "0.27.0"): { logPath: string; env: NodeJS.ProcessEnv } {
  const tempDir = mkdtempSync(join(tmpdir(), "telnyx-agent-ai-collections-"));
  const binDir = join(tempDir, "bin");
  const logPath = join(tempDir, "args.jsonl");
  const fakeTelnyx = join(binDir, "telnyx");
  mkdirSync(binDir, { recursive: true });

  writeFileSync(fakeTelnyx, `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
if (args[0] === "--version") { console.log("telnyx version ${version}"); process.exit(0); }
fs.appendFileSync(process.env.TELNYX_FAKE_ARGS_LOG, JSON.stringify(args) + "\\n");
function flag(name) { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : undefined; }
if (args[0] !== "ai:collections" || args[1] !== "retrieve-documents") {
  console.error("unexpected command: " + args.join(" "));
  process.exit(2);
}
const collection = flag("--slug");
const query = flag("--query");
console.log(JSON.stringify({
  data: [
    {
      id: "chunk-1",
      record_id: "call-123",
      record_type: "voice",
      chunk_index: 0,
      chunk_total: 2,
      score: query ? 0.94 : 0,
      text: "The customer called about a billing issue.",
      metadata: { disposition: "resolved" }
    },
    {
      id: "chunk-2",
      record_id: "message-456",
      record_type: "message",
      chunk_index: 1,
      chunk_total: 2,
      score: query ? 0.82 : 0,
      text: "A refund was issued.",
      metadata: { disposition: "refunded" }
    }
  ],
  meta: {
    collection_slug: collection,
    page_number: Number(flag("--page-number") || 1),
    page_size: Number(flag("--page-size") || 20),
    retrieval_type: flag("--retrieval-type") || "vector",
    searched_sources: (flag("--sources") || "voice,message").split(","),
    top_k: Number(flag("--top-k") || 5),
    total_pages: 1,
    total_results: 2
  }
}));
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

function runAgent(
  args: string[],
  env: NodeJS.ProcessEnv = process.env,
): { stdout: string; stderr: string; status: number } {
  const result = spawnSync(process.execPath, ["--import", "tsx", cliBin, ...args], {
    cwd: cliRoot,
    encoding: "utf8",
    env,
    timeout: 30_000,
  });
  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    status: result.status ?? 1,
  };
}

function loggedArgs(logPath: string): string[][] {
  if (!existsSync(logPath)) return [];
  const contents = readFileSync(logPath, "utf8");
  assert.ok(contents.endsWith("\n"), "mock binary must terminate its JSONL record with a real newline");
  assert.equal(contents.includes("\\n"), false, "mock binary must not log a literal escaped newline");
  return contents.trimEnd().split("\n").map((line) => JSON.parse(line));
}

function assertFlag(args: string[], name: string, expected: string): void {
  const index = args.indexOf(name);
  assert.notEqual(index, -1, `expected ${name} in ${args.join(" ")}`);
  assert.equal(args[index + 1], expected);
}

describe("AI collection document retrieval", () => {
  it("maps the complete v0.27 retrieval surface and preserves ranked document data", () => {
    const fake = setupFakeTelnyx();
    const filter = '{"record_id":{"eq":"call-123"},"priority":{"gte":2}}';
    const result = runAgent([
      "search-ai-collection",
      "--collection-id", "support-transcripts",
      "--query", "customer billing problem",
      "--retrieval-type", "hybrid",
      "--top-k", "10",
      "--page-number", "2",
      "--page-size", "25",
      "--sources", "voice, message",
      "--filter", filter,
      "--json",
    ], fake.env);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, "", "documented flags must not trigger unknown-flag warnings");
    const output = JSON.parse(result.stdout);
    assert.equal(output.collection_id, "support-transcripts");
    assert.equal(output.query, "customer billing problem");
    assert.equal(output.count, 2);
    assert.equal(output.documents[0].id, "chunk-1");
    assert.equal(output.documents[0].score, 0.94);
    assert.equal(output.documents[0].text, "The customer called about a billing issue.");
    assert.deepEqual(output.documents[0].metadata, { disposition: "resolved" });
    assert.deepEqual(output.meta, {
      collection_slug: "support-transcripts",
      page_number: 2,
      page_size: 25,
      retrieval_type: "hybrid",
      searched_sources: ["voice", "message"],
      top_k: 10,
      total_pages: 1,
      total_results: 2,
    });

    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args.slice(0, 4), [
      "ai:collections", "retrieve-documents", "--slug", "support-transcripts",
    ]);
    assertFlag(args, "--query", "customer billing problem");
    assertFlag(args, "--retrieval-type", "hybrid");
    assertFlag(args, "--top-k", "10");
    assertFlag(args, "--page-number", "2");
    assertFlag(args, "--page-size", "25");
    assertFlag(args, "--sources", "voice,message");
    assertFlag(args, "--filter", filter);
    assert.deepEqual(args.slice(-2), ["--format", "json"]);
  });

  it("accepts the generated --slug spelling and omits optional flags for catalog listing", () => {
    const fake = setupFakeTelnyx();
    const result = runAgent([
      "search-ai-collection", "--slug", "support-transcripts", "--json",
    ], fake.env);

    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.equal(output.query, null);
    assert.equal(output.documents[0].score, 0);
    const [args] = loggedArgs(fake.logPath);
    assert.deepEqual(args, [
      "ai:collections", "retrieve-documents", "--slug", "support-transcripts", "--format", "json",
    ]);
  });

  it("enforces the command-scoped v0.27 minimum without changing the platform pin", () => {
    const fake = setupFakeTelnyx("0.26.9");
    const result = runAgent([
      "search-ai-collection", "--collection-id", "support-transcripts", "--json",
    ], fake.env);

    assert.notEqual(result.status, 0);
    const error = JSON.parse(result.stdout).error;
    assert.match(error, /0\.26\.9/);
    assert.match(error, /requires >= 0\.27\.0/);
    assert.deepEqual(loggedArgs(fake.logPath), []);
  });

  it("rejects invalid IDs, retrieval methods, limits, sources, and filters before dispatch", () => {
    const invalidCases = [
      ["search-ai-collection", "--json"],
      ["search-ai-collection", "--collection-id", "one", "--slug", "two", "--json"],
      ["search-ai-collection", "--collection-id", "one", "--retrieval-type", "semantic", "--json"],
      ["search-ai-collection", "--collection-id", "one", "--top-k", "0", "--json"],
      ["search-ai-collection", "--collection-id", "one", "--page-size", "2.5", "--json"],
      ["search-ai-collection", "--collection-id", "one", "--sources", " , ", "--json"],
      ["search-ai-collection", "--collection-id", "one", "--filter", "[]", "--json"],
    ];

    for (const args of invalidCases) {
      const fake = setupFakeTelnyx();
      const result = runAgent(args, fake.env);
      assert.notEqual(result.status, 0, `expected ${args.join(" ")} to fail`);
      assert.ok(JSON.parse(result.stdout).error);
      assert.deepEqual(loggedArgs(fake.logPath), []);
    }
  });

  it("registers the command and complete flags in help and capabilities", () => {
    const help = runAgent(["help"]);
    assert.equal(help.status, 0, help.stderr);
    assert.match(help.stdout, /search-ai-collection\s+Search or list RAG documents/);
    for (const flag of [
      "collection-id", "slug", "query", "retrieval-type", "top-k",
      "page-number", "page-size", "sources", "filter",
    ]) {
      assert.match(help.stdout, new RegExp(`--${flag}`));
    }

    const capabilitiesResult = runAgent(["capabilities", "--json"]);
    assert.equal(capabilitiesResult.status, 0, capabilitiesResult.stderr);
    const capabilities = JSON.parse(capabilitiesResult.stdout);
    assert.ok(capabilities.composite_commands.some(
      (entry: { name: string }) => entry.name === "telnyx-agent search-ai-collection",
    ));
    const collections = capabilities.api_capabilities["🤖 AI"].find(
      (capability: { name: string }) => capability.name === "AI Collections",
    );
    assert.deepEqual(collections.actions, ["search_ai_collection"]);
  });
});
