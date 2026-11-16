/** Mock-binary coverage for AI tools, assistant membership, and MCP servers. */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliRoot = join(__dirname, "..");
const cliBin = join(cliRoot, "bin", "telnyx-agent.ts");

function setupFakeTelnyx(options: { version?: string } = {}): { logPath: string; env: NodeJS.ProcessEnv } {
  const tempDir = mkdtempSync(join(tmpdir(), "telnyx-agent-ai-tools-"));
  const binDir = join(tempDir, "bin");
  const logPath = join(tempDir, "args.jsonl");
  const fakeTelnyx = join(binDir, "telnyx");
  mkdirSync(binDir, { recursive: true });

  writeFileSync(fakeTelnyx, `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
if (args[0] === "--version") { console.log(${JSON.stringify(`telnyx version ${options.version ?? "0.36.0"}`)}); process.exit(0); }
fs.appendFileSync(process.env.TELNYX_FAKE_ARGS_LOG, JSON.stringify(args) + "\\n");
function flag(name) { const i = args.indexOf(name); return i === -1 ? undefined : args[i + 1]; }
const group = args[0];
const command = args[1];
if (group === "ai:tools" && command === "list") {
  console.log(JSON.stringify({ data: [{ id: "tool-1", display_name: "Order lookup", type: "function" }, { id: "tool-2", display_name: "Transfer", type: "handoff" }], meta: { total_results: 2 } }));
} else if (group === "ai:tools" && command === "create") {
  console.log(JSON.stringify({ data: { id: "tool-created", display_name: flag("--display-name"), type: flag("--type") } }));
} else if (group === "ai:tools" && command === "retrieve") {
  console.log(JSON.stringify({ data: { id: flag("--tool-id"), display_name: "Order lookup", type: "function" } }));
} else if (group === "ai:tools" && command === "update") {
  console.log(JSON.stringify({ data: { id: flag("--tool-id"), display_name: flag("--display-name"), type: flag("--type") } }));
} else if (group === "ai:tools" && command === "delete") {
  console.log(JSON.stringify({ data: { id: flag("--tool-id") } }));
} else if (group === "ai:assistants:tools" && (command === "add" || command === "remove")) {
  console.log(JSON.stringify({ data: { assistant_id: flag("--assistant-id"), tool_id: flag("--tool-id"), action: command } }));
} else if (group === "ai:assistants:tools" && command === "test") {
  console.log(JSON.stringify({ data: { success: true, status_code: 200 } }));
} else if (group === "ai:mcp-servers" && command === "list") {
  console.log(JSON.stringify({ data: [{ id: "mcp-1", name: "Orders", type: "streamable_http", url: "https://mcp.example.com" }, { id: "mcp-2", name: "CRM", type: "sse", url: "https://crm.example.com" }], meta: { total_results: 2 } }));
} else if (group === "ai:mcp-servers" && command === "create") {
  console.log(JSON.stringify({ data: { id: "mcp-created", name: flag("--name"), type: flag("--type"), url: flag("--url") } }));
} else if (group === "ai:mcp-servers" && command === "retrieve") {
  console.log(JSON.stringify({ data: { id: flag("--mcp-server-id"), name: "Orders", type: "streamable_http" } }));
} else if (group === "ai:mcp-servers" && command === "update") {
  console.log(JSON.stringify({ data: { id: flag("--mcp-server-id"), name: flag("--name"), url: flag("--url") } }));
} else if (group === "ai:mcp-servers" && command === "delete") {
  console.log(JSON.stringify({ data: { id: flag("--mcp-server-id") } }));
} else {
  console.error("unexpected fake telnyx invocation: " + args.join(" "));
  process.exit(2);
}
`);
  chmodSync(fakeTelnyx, 0o755);
  return {
    logPath,
    env: { ...process.env, TELNYX_CLI_PATH: fakeTelnyx, TELNYX_FAKE_ARGS_LOG: logPath, TELNYX_API_KEY: "KEY_fake_test" },
  };
}

function runAgent(args: string[], env: NodeJS.ProcessEnv): { stdout: string; stderr: string; status: number } {
  try {
    const stdout = execFileSync(process.execPath, ["--import", "tsx", cliBin, ...args], {
      cwd: cliRoot,
      encoding: "utf8",
      env,
      timeout: 30_000,
    });
    return { stdout, stderr: "", status: 0 };
  } catch (err: any) {
    return { stdout: err.stdout?.toString() ?? "", stderr: err.stderr?.toString() ?? "", status: err.status ?? 1 };
  }
}

function loggedArgs(logPath: string): string[][] {
  if (!existsSync(logPath)) return [];
  const contents = readFileSync(logPath, "utf8");
  assert.ok(contents.endsWith("\n"), "fake binary must write newline-terminated JSONL");
  assert.ok(!contents.endsWith("\n\n"), "fake binary must not write blank JSONL records");
  return contents.trimEnd().split("\n").map((line) => JSON.parse(line) as string[]);
}

describe("AI tool configuration commands", () => {
  it("creates a tool with exact generated CLI args and JSON configuration", () => {
    const fake = setupFakeTelnyx();
    const functionConfig = '{"name":"lookup_order","parameters":{"type":"object"}}';
    const result = runAgent([
      "create-ai-tool", "--display-name", "Order lookup", "--type", "function",
      "--function", functionConfig, "--timeout-ms", "0", "--idempotency-key", "request-1", "--json",
    ], fake.env);

    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), {
      tool_id: "tool-created",
      ai_tool: { id: "tool-created", display_name: "Order lookup", type: "function" },
    });
    assert.deepEqual(loggedArgs(fake.logPath), [[
      "ai:tools", "create", "--display-name", "Order lookup", "--type", "function",
      "--function", functionConfig, "--timeout-ms", "0", "--idempotency-key", "request-1", "--format", "json",
    ]]);
  });

  it("retrieves, updates, lists, and confirms deletion of AI tools", () => {
    const fake = setupFakeTelnyx();
    assert.equal(runAgent(["get-ai-tool", "--tool-id", "tool-1", "--json"], fake.env).status, 0);
    assert.equal(runAgent(["update-ai-tool", "--tool-id", "tool-1", "--display-name", "Order status", "--json"], fake.env).status, 0);
    const listed = runAgent(["list-ai-tools", "--filter-type", "function", "--page-size", "25", "--max-items", "1", "--json"], fake.env);
    assert.deepEqual(JSON.parse(listed.stdout), {
      count: 1,
      ai_tools: [{ id: "tool-1", display_name: "Order lookup", type: "function" }],
      meta: { total_results: 2 },
    });
    assert.equal(runAgent(["delete-ai-tool", "--tool-id", "tool-1", "--confirm", "--json"], fake.env).status, 0);
    assert.deepEqual(loggedArgs(fake.logPath), [
      ["ai:tools", "retrieve", "--tool-id", "tool-1", "--format", "json"],
      ["ai:tools", "update", "--tool-id", "tool-1", "--display-name", "Order status", "--format", "json"],
      ["ai:tools", "list", "--filter-type", "function", "--page-size", "25", "--max-items", "1", "--format", "raw"],
      ["ai:tools", "delete", "--tool-id", "tool-1", "--format", "json"],
    ]);
  });

  it("requires explicit confirmation before deleting an AI tool", () => {
    const fake = setupFakeTelnyx();
    const result = runAgent(["delete-ai-tool", "--tool-id", "tool-1", "--json"], fake.env);
    assert.equal(result.status, 1);
    assert.match(JSON.parse(result.stdout).error, /--confirm is required/);
    assert.deepEqual(loggedArgs(fake.logPath), []);
  });

  it("requires Go CLI v0.36 before dispatching AI tool, assistant-tool, or MCP-server commands", () => {
    const commands = [
      ["get-ai-tool", "--tool-id", "tool-1", "--json"],
      ["add-ai-assistant-tool", "--assistant-id", "assistant-1", "--tool-id", "tool-1", "--json"],
      ["get-ai-mcp-server", "--mcp-server-id", "mcp-1", "--json"],
    ];

    for (const args of commands) {
      const fake = setupFakeTelnyx({ version: "0.35.0" });
      const result = runAgent(args, fake.env);
      assert.equal(result.status, 1);
      assert.match(JSON.parse(result.stdout).error, /requires >= 0\.36\.0/);
      assert.deepEqual(loggedArgs(fake.logPath), []);
    }
  });

  it("attaches and removes assistant tools while reusing the existing test wrapper", () => {
    const fake = setupFakeTelnyx();
    const attached = runAgent(["add-ai-assistant-tool", "--assistant-id", "assistant-1", "--tool-id", "tool-1", "--json"], fake.env);
    const removed = runAgent(["remove-ai-assistant-tool", "--assistant-id", "assistant-1", "--tool-id", "tool-1", "--json"], fake.env);
    const tested = runAgent(["test-ai-assistant-tool", "--id", "assistant-1", "--tool-id", "tool-1", "--json"], fake.env);
    assert.equal(JSON.parse(attached.stdout).attached, true);
    assert.equal(JSON.parse(removed.stdout).removed, true);
    assert.equal(JSON.parse(tested.stdout).tool_test.success, true);
    assert.deepEqual(loggedArgs(fake.logPath), [
      ["ai:assistants:tools", "add", "--assistant-id", "assistant-1", "--tool-id", "tool-1", "--format", "json"],
      ["ai:assistants:tools", "remove", "--assistant-id", "assistant-1", "--tool-id", "tool-1", "--format", "json"],
      ["ai:assistants:tools", "test", "--assistant-id", "assistant-1", "--tool-id", "tool-1", "--format", "json"],
    ]);
  });

  it("creates, retrieves, updates, lists, and deletes MCP server configurations", () => {
    const fake = setupFakeTelnyx();
    const allowedTool = "[lookup_order]";
    assert.equal(runAgent([
      "create-ai-mcp-server", "--name", "Orders", "--type", "streamable_http", "--url", "https://mcp.example.com",
      "--allowed-tool", allowedTool, "--api-key-ref", "secret-1", "--json",
    ], fake.env).status, 0);
    assert.equal(runAgent(["get-ai-mcp-server", "--mcp-server-id", "mcp-1", "--json"], fake.env).status, 0);
    assert.equal(runAgent(["update-ai-mcp-server", "--mcp-server-id", "mcp-1", "--name", "Orders v2", "--url", "https://mcp-v2.example.com", "--json"], fake.env).status, 0);
    const listed = runAgent(["list-ai-mcp-servers", "--type", "streamable_http", "--max-items", "1", "--json"], fake.env);
    assert.deepEqual(JSON.parse(listed.stdout), {
      count: 1,
      ai_mcp_servers: [{ id: "mcp-1", name: "Orders", type: "streamable_http", url: "https://mcp.example.com" }],
      meta: { total_results: 2 },
    });
    assert.equal(runAgent(["delete-ai-mcp-server", "--mcp-server-id", "mcp-1", "--confirm", "--json"], fake.env).status, 0);
    assert.deepEqual(loggedArgs(fake.logPath), [
      ["ai:mcp-servers", "create", "--name", "Orders", "--type", "streamable_http", "--url", "https://mcp.example.com", "--allowed-tool", allowedTool, "--api-key-ref", "secret-1", "--format", "json"],
      ["ai:mcp-servers", "retrieve", "--mcp-server-id", "mcp-1", "--format", "json"],
      ["ai:mcp-servers", "update", "--mcp-server-id", "mcp-1", "--name", "Orders v2", "--url", "https://mcp-v2.example.com", "--format", "json"],
      ["ai:mcp-servers", "list", "--type", "streamable_http", "--max-items", "1", "--format", "raw"],
      ["ai:mcp-servers", "delete", "--mcp-server-id", "mcp-1", "--format", "json"],
    ]);
  });

  it("registers help and capabilities for every new surface", () => {
    const fake = setupFakeTelnyx();
    const help = runAgent(["help"], fake.env);
    const capabilities = runAgent(["capabilities", "--json"], fake.env);
    assert.match(help.stdout, /create-ai-tool/);
    assert.match(help.stdout, /remove-ai-assistant-tool/);
    assert.match(help.stdout, /create-ai-mcp-server/);
    const ai = JSON.parse(capabilities.stdout).api_capabilities["🤖 AI"];
    assert.ok(ai.find((entry: { name: string }) => entry.name === "AI Tools").actions.includes("delete_ai_tool"));
    assert.ok(ai.find((entry: { name: string }) => entry.name === "AI MCP Servers").actions.includes("list_ai_mcp_servers"));
  });
});
