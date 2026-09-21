/** Mock-binary coverage for direct Telnyx document discovery and upload actions. */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliRoot = join(__dirname, "..");
const cliBin = join(cliRoot, "bin", "telnyx-agent.ts");

function setupFakeTelnyx(failUpload = false): { env: NodeJS.ProcessEnv; logPath: string; tempDir: string } {
  const tempDir = mkdtempSync(join(tmpdir(), "telnyx-agent-documents-"));
  const binDir = join(tempDir, "bin");
  const logPath = join(tempDir, "args.jsonl");
  const fakeTelnyx = join(binDir, "telnyx");
  mkdirSync(binDir, { recursive: true });
  writeFileSync(fakeTelnyx, `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
fs.appendFileSync(process.env.TELNYX_FAKE_ARGS_LOG, JSON.stringify(args) + "\\n");
function flag(name) { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : undefined; }

if (args[0] === "documents" && args[1] === "list") {
  if (process.env.TELNYX_FAKE_SCENARIO === "document-pages") {
    const requestedPage = Number(flag("--page-number") || "1");
    const pages = {
      1: [
        { id: "doc-list-1", filename: "one.pdf" },
        { id: "doc-list-2", filename: "two.pdf" }
      ],
      2: [
        { id: "doc-list-3", filename: "three.pdf" },
        { id: "doc-list-4", filename: "four.pdf" }
      ],
      3: [{ id: "doc-list-5", filename: "five.pdf" }]
    };
    console.log(JSON.stringify({
      data: pages[requestedPage] || [],
      meta: { page_number: requestedPage, page_size: 2, total_pages: 3, total_results: 5 }
    }));
  } else {
    console.log(JSON.stringify({ data: [
      { id: "doc-list-1", filename: "loa.pdf", customer_reference: "migration-2026" },
      { id: "doc-list-2", filename: "invoice.pdf", customer_reference: "migration-2026" }
    ], meta: { page_number: 2, total_results: 2 } }));
  }
} else if (args[0] === "documents" && args[1] === "retrieve") {
  console.log(JSON.stringify({ data: { id: flag("--id"), filename: "invoice.pdf", customer_reference: "migration-2026" } }));
} else if (args[0] === "documents" && args[1] === "upload") {
  const argvDocument = flag("--document");
  const document = JSON.parse(argvDocument === undefined ? fs.readFileSync(0, "utf8") : argvDocument);
  if (${JSON.stringify(failUpload)}) {
    process.stderr.write("upload rejected: " + (document.file || document.url || "no-upload-source"));
    process.exit(9);
  }
  console.log(JSON.stringify({ data: { id: "doc-upload-1", filename: document.filename || "fetched.pdf", customer_reference: document.customer_reference } }));
} else {
  console.error("unexpected fake telnyx invocation: " + args.join(" "));
  process.exit(2);
}
`);
  chmodSync(fakeTelnyx, 0o755);
  return {
    tempDir,
    logPath,
    env: { ...process.env, TELNYX_CLI_PATH: fakeTelnyx, TELNYX_FAKE_ARGS_LOG: logPath },
  };
}

function setupFastPaginationFake(totalPages: number): { env: NodeJS.ProcessEnv; logPath: string } {
  const tempDir = mkdtempSync(join(tmpdir(), "telnyx-agent-document-pages-"));
  const binDir = join(tempDir, "bin");
  const logPath = join(tempDir, "pages.log");
  const fakeTelnyx = join(binDir, "telnyx");
  mkdirSync(binDir, { recursive: true });
  writeFileSync(fakeTelnyx, `#!/bin/sh
page=1
previous=""
for argument in "$@"; do
  if [ "$previous" = "--page-number" ]; then page="$argument"; previous=""; continue; fi
  previous="$argument"
done
printf '%s\\n' "$page" >> "$TELNYX_FAKE_PAGE_LOG"
printf '{"data":[{"id":"doc-list-%s"}],"meta":{"page_number":%s,"page_size":1,"total_pages":${totalPages},"total_results":${totalPages}}}\\n' "$page" "$page"
`);
  chmodSync(fakeTelnyx, 0o755);
  return {
    logPath,
    env: { ...process.env, TELNYX_CLI_PATH: fakeTelnyx, TELNYX_FAKE_PAGE_LOG: logPath },
  };
}

function runAgent(args: string[], env: NodeJS.ProcessEnv, timeout = 30_000): { status: number; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, ["--import", "tsx", cliBin, ...args], {
    cwd: cliRoot,
    encoding: "utf8",
    env,
    timeout,
  });
  return { status: result.status ?? 1, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

function loggedArgs(logPath: string): string[][] {
  if (!existsSync(logPath)) return [];
  const contents = readFileSync(logPath, "utf8");
  assert.ok(contents.endsWith("\n"), "fake binary should terminate each JSON record with an actual newline");
  assert.ok(!contents.endsWith("\n\n"), "fake binary should not write a blank JSONL record");
  return contents.trimEnd().split("\n").map((line) => JSON.parse(line) as string[]);
}

function flagValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function runJson(args: string[], env: NodeJS.ProcessEnv): unknown {
  const result = runAgent([...args, "--json"], env);
  assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
  return JSON.parse(result.stdout);
}

describe("document actions", () => {
  it("lists documents with generated filter, pagination, and raw list output", () => {
    const fake = setupFakeTelnyx();
    const output = runJson([
      "list-documents",
      "--filename-contains", "loa",
      "--customer-reference", "migration-2026",
      "--created-after", "2026-08-01T00:00:00Z",
      "--created-before", "2026-09-01T00:00:00Z",
      "--page-number", "2",
      "--page-size", "25",
      "--max-items", "1",
      "--sort", "-created_at",
    ], fake.env) as { count: number; documents: Array<{ id: string }>; meta: { total_results: number } };

    assert.equal(output.count, 1);
    assert.equal(output.documents[0].id, "doc-list-1");
    assert.equal(output.meta.total_results, 2);
    assert.deepEqual(loggedArgs(fake.logPath), [[
      "documents", "list",
      "--filter", JSON.stringify({
        filename: { contains: "loa" },
        customer_reference: { in: ["migration-2026"] },
        created_at: { gt: "2026-08-01T00:00:00Z", lt: "2026-09-01T00:00:00Z" },
      }),
      "--page-number", "2", "--page-size", "25", "--sort", "-created_at", "--format", "raw",
    ]]);
  });

  it("aggregates raw pages before applying a finite max-items limit", () => {
    const fake = setupFakeTelnyx();
    const output = runJson([
      "list-documents", "--page-size", "2", "--max-items", "3",
    ], { ...fake.env, TELNYX_FAKE_SCENARIO: "document-pages" }) as {
      count: number;
      documents: Array<{ id: string }>;
      meta: Record<string, unknown>;
    };

    assert.equal(output.count, 3);
    assert.deepEqual(output.documents.map((document) => document.id), ["doc-list-1", "doc-list-2", "doc-list-3"]);
    assert.deepEqual(output.meta, {
      page_size: 2,
      total_pages: 3,
      total_results: 5,
      starting_page: 1,
      pages_fetched: 2,
      returned_results: 3,
    });
    assert.deepEqual(loggedArgs(fake.logPath).map((args) => flagValue(args, "--page-number")), [undefined, "2"]);
    for (const args of loggedArgs(fake.logPath)) assert.equal(args.includes("--max-items"), false);
  });

  it("treats omitted max-items and -1 as unlimited across all raw pages", () => {
    for (const limitArgs of [[], ["--max-items", "-1"]]) {
      const fake = setupFakeTelnyx();
      const output = runJson([
        "list-documents", "--page-size", "2", ...limitArgs,
      ], { ...fake.env, TELNYX_FAKE_SCENARIO: "document-pages" }) as {
        count: number;
        documents: Array<{ id: string }>;
        meta: Record<string, unknown>;
      };

      assert.equal(output.count, 5);
      assert.deepEqual(output.documents.map((document) => document.id), [
        "doc-list-1", "doc-list-2", "doc-list-3", "doc-list-4", "doc-list-5",
      ]);
      assert.deepEqual(output.meta, {
        page_size: 2,
        total_pages: 3,
        total_results: 5,
        starting_page: 1,
        pages_fetched: 3,
        returned_results: 5,
      });
      assert.deepEqual(loggedArgs(fake.logPath).map((args) => flagValue(args, "--page-number")), [undefined, "2", "3"]);
      for (const args of loggedArgs(fake.logPath)) assert.equal(args.includes("--max-items"), false);
    }
  });

  it("honors known unlimited pagination beyond the unknown-end safety limit", () => {
    const fake = setupFastPaginationFake(1_001);
    const result = runAgent([
      "list-documents", "--page-size", "1", "--max-items", "-1", "--json",
    ], fake.env, 120_000);

    assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
    const output = JSON.parse(result.stdout) as {
      count: number;
      documents: Array<{ id: string }>;
      meta: { pages_fetched: number };
    };
    assert.equal(output.count, 1_001);
    assert.equal(output.documents[0].id, "doc-list-1");
    assert.equal(output.documents.at(-1)?.id, "doc-list-1001");
    assert.equal(output.meta.pages_fetched, 1_001);
    assert.equal(readFileSync(fake.logPath, "utf8").trimEnd().split("\n").length, 1_001);
  });

  it("retrieves one document with the generated retrieve action", () => {
    const fake = setupFakeTelnyx();
    const output = runJson(["get-document", "--id", "doc-123"], fake.env) as { document_id: string; document: { filename: string } };

    assert.deepEqual(output, {
      document_id: "doc-123",
      document: { id: "doc-123", filename: "invoice.pdf", customer_reference: "migration-2026" },
    });
    assert.deepEqual(loggedArgs(fake.logPath), [["documents", "retrieve", "--id", "doc-123", "--format", "json"]]);
  });

  it("uploads a public URL without echoing its signed URL in output", () => {
    const fake = setupFakeTelnyx();
    const url = "https://files.example.test/loa.pdf?signature=private-url-token";
    const result = runAgent([
      "upload-document", "--url", url, "--filename", "loa.pdf", "--customer-reference", "migration-2026", "--json",
    ], fake.env);

    assert.equal(result.status, 0, result.stderr);
    assert.doesNotMatch(result.stdout, /private-url-token/);
    assert.deepEqual(JSON.parse(result.stdout), {
      document_id: "doc-upload-1",
      document: { id: "doc-upload-1", filename: "loa.pdf", customer_reference: "migration-2026" },
      attachment_window_minutes: 30,
    });
    assert.deepEqual(loggedArgs(fake.logPath), [[
      "documents", "upload",
      "--format", "json",
    ]]);
  });

  it("uploads Base64 content and does not print it", () => {
    const fake = setupFakeTelnyx();
    const contents = Buffer.from("base64-secret-file-content").toString("base64");
    const result = runAgent([
      "upload-document", "--file-base64", contents, "--filename", "invoice.pdf", "--json",
    ], fake.env);

    assert.equal(result.status, 0, result.stderr);
    assert.doesNotMatch(result.stdout, /base64-secret-file-content/);
    assert.doesNotMatch(result.stdout, new RegExp(contents));
    assert.deepEqual(loggedArgs(fake.logPath), [[
      "documents", "upload", "--format", "json",
    ]]);
  });

  it("Base64-encodes a local regular file and does not print its path or bytes", () => {
    const fake = setupFakeTelnyx();
    const filePath = join(fake.tempDir, "private-loa.pdf");
    const source = "local-file-secret-must-not-print";
    const encoded = Buffer.from(source).toString("base64");
    writeFileSync(filePath, source);
    const result = runAgent(["upload-document", "--file", filePath, "--json"], fake.env);

    assert.equal(result.status, 0, result.stderr);
    assert.doesNotMatch(result.stdout, /local-file-secret-must-not-print/);
    assert.doesNotMatch(result.stdout, new RegExp(encoded));
    assert.doesNotMatch(result.stdout, new RegExp(filePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.deepEqual(loggedArgs(fake.logPath), [[
      "documents", "upload", "--format", "json",
    ]]);
  });

  it("redacts local Base64 content if the generated CLI echoes it in an upload failure", () => {
    const fake = setupFakeTelnyx(true);
    const contents = Buffer.from("failure-secret-file-content").toString("base64");
    const result = runAgent([
      "upload-document", "--file-base64", contents, "--filename", "invoice.pdf", "--json",
    ], fake.env);

    assert.equal(result.status, 1);
    assert.doesNotMatch(`${result.stdout}${result.stderr}`, new RegExp(contents));
    assert.match(`${result.stdout}${result.stderr}`, /\[REDACTED\]/);
  });

  it("redacts a signed URL if the generated CLI echoes it in an upload failure", () => {
    const fake = setupFakeTelnyx(true);
    const url = "https://files.example.test/loa.pdf?signature=private-url-token";
    const result = runAgent(["upload-document", "--url", url, "--json"], fake.env);

    assert.equal(result.status, 1);
    assert.doesNotMatch(`${result.stdout}${result.stderr}`, /private-url-token/);
    assert.doesNotMatch(`${result.stdout}${result.stderr}`, new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(`${result.stdout}${result.stderr}`, /\[REDACTED\]/);
  });

  it("validates source selection and document input before dispatch", () => {
    for (const args of [
      ["upload-document", "--json"],
      ["upload-document", "--url", "ftp://files.example.test/a.pdf", "--json"],
      ["upload-document", "--file-base64", "not base64", "--filename", "a.pdf", "--json"],
      ["upload-document", "--file-base64", "YQ==", "--json"],
      ["get-document", "--json"],
      ["list-documents", "--page-size", "0", "--json"],
      ["list-documents", "--page-size", "9007199254740992", "--json"],
      ["list-documents", "--max-items", "--json"],
      ["list-documents", "--max-items", "9007199254740992", "--json"],
      ["list-documents", "--filter", "--json"],
      ["list-documents", "--customer-reference", "", "--json"],
    ]) {
      const fake = setupFakeTelnyx();
      const result = runAgent(args, fake.env);
      assert.equal(result.status, 1, `${result.stdout}${result.stderr}`);
      assert.deepEqual(loggedArgs(fake.logPath), []);
    }
  });

  it("advertises document commands, upload window, and capabilities", () => {
    const help = execFileSync(process.execPath, ["--import", "tsx", cliBin, "help"], { cwd: cliRoot, encoding: "utf8" });
    const capabilities = runJson(["capabilities"], process.env) as {
      composite_commands: Array<{ name: string }>;
      api_capabilities: { "🔄 Porting": Array<{ actions: string[] }> };
    };
    for (const command of ["list-documents", "get-document", "upload-document"]) {
      assert.match(help, new RegExp(command));
      assert.ok(capabilities.composite_commands.some((entry) => entry.name === `telnyx-agent ${command}`));
    }
    assert.match(help, /within 30 minutes/i);
    const actions = capabilities.api_capabilities["🔄 Porting"][0].actions;
    assert.ok(actions.includes("list_documents"));
    assert.ok(actions.includes("get_document"));
    assert.ok(actions.includes("upload_document"));
  });
});
