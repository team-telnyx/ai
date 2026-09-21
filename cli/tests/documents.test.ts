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
  console.log(JSON.stringify({ data: [{ id: "doc-list-1", filename: "loa.pdf", customer_reference: "migration-2026" }], meta: { page_number: 2, total_results: 1 } }));
} else if (args[0] === "documents" && args[1] === "retrieve") {
  console.log(JSON.stringify({ data: { id: flag("--id"), filename: "invoice.pdf", customer_reference: "migration-2026" } }));
} else if (args[0] === "documents" && args[1] === "upload") {
  const document = JSON.parse(flag("--document"));
  if (${JSON.stringify(failUpload)}) {
    process.stderr.write("upload rejected: " + (document.file || "no-local-file"));
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

function runAgent(args: string[], env: NodeJS.ProcessEnv): { status: number; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, ["--import", "tsx", cliBin, ...args], {
    cwd: cliRoot,
    encoding: "utf8",
    env,
    timeout: 30_000,
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
      "--max-items", "10",
      "--sort", "-created_at",
    ], fake.env) as { count: number; documents: Array<{ id: string }>; meta: { total_results: number } };

    assert.equal(output.count, 1);
    assert.equal(output.documents[0].id, "doc-list-1");
    assert.equal(output.meta.total_results, 1);
    assert.deepEqual(loggedArgs(fake.logPath), [[
      "documents", "list",
      "--filter", JSON.stringify({
        filename: { contains: "loa" },
        customer_reference: { eq: "migration-2026" },
        created_at: { gt: "2026-08-01T00:00:00Z", lt: "2026-09-01T00:00:00Z" },
      }),
      "--page-number", "2", "--page-size", "25", "--max-items", "10", "--sort", "-created_at", "--format", "raw",
    ]]);
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
      "--document", JSON.stringify({ customer_reference: "migration-2026", filename: "loa.pdf", url }),
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
      "documents", "upload", "--document", JSON.stringify({ filename: "invoice.pdf", file: contents }), "--format", "json",
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
      "documents", "upload", "--document", JSON.stringify({ filename: "private-loa.pdf", file: encoded }), "--format", "json",
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

  it("validates source selection and document input before dispatch", () => {
    for (const args of [
      ["upload-document", "--json"],
      ["upload-document", "--url", "ftp://files.example.test/a.pdf", "--json"],
      ["upload-document", "--file-base64", "not base64", "--filename", "a.pdf", "--json"],
      ["upload-document", "--file-base64", "YQ==", "--json"],
      ["get-document", "--json"],
      ["list-documents", "--page-size", "0", "--json"],
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
