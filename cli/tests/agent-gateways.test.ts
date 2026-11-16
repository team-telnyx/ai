/** Mock-binary coverage for the scoped Agent Gateway lifecycle wrappers. */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliRoot = join(__dirname, "..");
const cliBin = join(cliRoot, "bin", "telnyx-agent.ts");

function setupFakeTelnyx(version = "0.37.0"): { logPath: string; env: NodeJS.ProcessEnv } {
  const tempDir = mkdtempSync(join(tmpdir(), "telnyx-agent-gateways-"));
  const binDir = join(tempDir, "bin");
  const logPath = join(tempDir, "args.jsonl");
  const fakeTelnyx = join(binDir, "telnyx");
  mkdirSync(binDir, { recursive: true });

  writeFileSync(fakeTelnyx, `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
if (args[0] === "--version") { console.log("telnyx version ${version}"); process.exit(0); }
fs.appendFileSync(process.env.TELNYX_FAKE_ARGS_LOG, JSON.stringify(args) + "\\n");
const command = args.filter((arg) => arg !== "--format" && arg !== "json" && arg !== "raw");
const group = command[0];
const action = command[1];
if (group === "agent-gateways" && action === "list") {
  console.log(JSON.stringify({ data: [{ id: "gateway-1", name: "Support Gateway" }], meta: { total_results: 1 } }));
} else if (group === "agent-gateways:apis" && action === "list") {
  console.log(JSON.stringify({ data: [{ id: "api-1", name: "crm" }], meta: { total_results: 1 } }));
} else if (group === "agent-gateways:mcp-servers" && action === "list") {
  console.log(JSON.stringify({ data: [{ id: "server-1", name: "docs" }], meta: { total_results: 1 } }));
} else {
  console.log(JSON.stringify({ data: { group, action, id: "result-1" } }));
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
  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    status: result.status ?? 1,
  };
}

function loggedArgs(logPath: string): string[][] {
  if (!existsSync(logPath)) return [];
  const contents = readFileSync(logPath, "utf8");
  assert.ok(contents.endsWith("\n"), "fake binary must write actual newline-terminated JSONL");
  assert.equal(contents.includes("\\n"), false, "fake binary must not write a literal backslash-n");
  return contents.trimEnd().split("\n").map((line) => JSON.parse(line) as string[]);
}

function assertSuccess(result: { stdout: string; stderr: string; status: number }): unknown {
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(result.stderr, "", "documented Agent Gateway flags must not warn");
  return JSON.parse(result.stdout);
}

describe("Agent Gateway lifecycle commands", () => {
  it("forwards gateway lifecycle and model actions using generated command and flag names", () => {
    const fake = setupFakeTelnyx();
    const create = assertSuccess(runAgent([
      "create-agent-gateway", "--wireguard-interface-id", "wg-1", "--name", "Support Gateway", "--json",
    ], fake.env)) as { data: { group: string; action: string } };
    assert.deepEqual(create.data, { group: "agent-gateways", action: "create", id: "result-1" });
    assertSuccess(runAgent(["get-agent-gateway", "--instance-id", "gateway-1", "--json"], fake.env));
    const listed = assertSuccess(runAgent([
      "list-agent-gateways", "--page-number", "2", "--page-size", "25", "--max-items", "40", "--json",
    ], fake.env)) as { data: Array<{ id: string }> };
    assert.equal(listed.data[0].id, "gateway-1");
    assertSuccess(runAgent([
      "retrieve-agent-gateway-models", "--instance-id", "gateway-1", "--json",
    ], fake.env));
    assertSuccess(runAgent([
      "delete-agent-gateway", "--instance-id", "gateway-1", "--confirm", "--json",
    ], fake.env));

    assert.deepEqual(loggedArgs(fake.logPath), [
      ["agent-gateways", "create", "--wireguard-interface-id", "wg-1", "--name", "Support Gateway", "--format", "json"],
      ["agent-gateways", "retrieve", "--instance-id", "gateway-1", "--format", "json"],
      ["agent-gateways", "list", "--page-number", "2", "--page-size", "25", "--max-items", "40", "--format", "raw"],
      ["agent-gateways", "retrieve-models", "--instance-id", "gateway-1", "--format", "json"],
      ["agent-gateways", "delete", "--instance-id", "gateway-1", "--format", "json"],
    ]);
  });

  it("passes complete API create/update configuration, list, and delete actions", () => {
    const fake = setupFakeTelnyx();
    assertSuccess(runAgent([
      "create-agent-gateway-api", "--instance-id", "gateway-1", "--name", "crm", "--spec-url", "https://example.com/openapi.json",
      "--auth", '{"type":"bearer","token":"secret"}', "--base-url", "https://api.example.com",
      "--forwarded-header", "x-request-id", "--forwarded-header", "x-tenant-id", "--open-to-every-key",
      "--static-headers", '{"x-api-version":"2026-01"}', "--tool", "getCustomer", "--tool", "createCustomer", "--json",
    ], fake.env));
    assertSuccess(runAgent([
      "update-agent-gateway-api", "--instance-id", "gateway-1", "--api-id", "api-1", "--name", "crm-v2",
      "--spec-url", "https://example.com/v2.json", "--open-to-every-key", "false", "--json",
    ], fake.env));
    const listed = assertSuccess(runAgent(["list-agent-gateway-apis", "--instance-id", "gateway-1", "--json"], fake.env)) as { data: Array<{ id: string }> };
    assert.equal(listed.data[0].id, "api-1");
    assertSuccess(runAgent([
      "delete-agent-gateway-api", "--instance-id", "gateway-1", "--api-id", "api-1", "--confirm", "--json",
    ], fake.env));

    assert.deepEqual(loggedArgs(fake.logPath), [
      ["agent-gateways:apis", "create", "--instance-id", "gateway-1", "--name", "crm", "--spec-url", "https://example.com/openapi.json", "--auth", '{"type":"bearer","token":"secret"}', "--base-url", "https://api.example.com", "--forwarded-header", "x-request-id", "--forwarded-header", "x-tenant-id", "--open-to-every-key", "true", "--static-headers", '{"x-api-version":"2026-01"}', "--tool", "getCustomer", "--tool", "createCustomer", "--format", "json"],
      ["agent-gateways:apis", "update", "--instance-id", "gateway-1", "--api-id", "api-1", "--open-to-every-key", "false", "--name", "crm-v2", "--spec-url", "https://example.com/v2.json", "--format", "json"],
      ["agent-gateways:apis", "list", "--instance-id", "gateway-1", "--format", "raw"],
      ["agent-gateways:apis", "delete", "--instance-id", "gateway-1", "--api-id", "api-1", "--format", "json"],
    ]);
  });

  it("passes complete MCP server create/update configuration, list, and delete actions", () => {
    const fake = setupFakeTelnyx();
    assertSuccess(runAgent([
      "create-agent-gateway-mcp-server", "--instance-id", "gateway-1", "--name", "docs", "--url", "https://mcp.example.com",
      "--auth", '{"type":"none"}', "--forwarded-header", "x-request-id", "--open-to-every-key", "false",
      "--static-headers", '{"x-source":"gateway"}', "--tool", "searchDocs", "--transport", "sse", "--json",
    ], fake.env));
    assertSuccess(runAgent([
      "update-agent-gateway-mcp-server", "--instance-id", "gateway-1", "--server-id", "server-1", "--url", "https://mcp-v2.example.com",
      "--transport", "http", "--json",
    ], fake.env));
    const listed = assertSuccess(runAgent(["list-agent-gateway-mcp-servers", "--instance-id", "gateway-1", "--json"], fake.env)) as { data: Array<{ id: string }> };
    assert.equal(listed.data[0].id, "server-1");
    assertSuccess(runAgent([
      "delete-agent-gateway-mcp-server", "--instance-id", "gateway-1", "--server-id", "server-1", "--confirm", "--json",
    ], fake.env));

    assert.deepEqual(loggedArgs(fake.logPath), [
      ["agent-gateways:mcp-servers", "create", "--instance-id", "gateway-1", "--name", "docs", "--url", "https://mcp.example.com", "--auth", '{"type":"none"}', "--forwarded-header", "x-request-id", "--open-to-every-key", "false", "--static-headers", '{"x-source":"gateway"}', "--tool", "searchDocs", "--transport", "sse", "--format", "json"],
      ["agent-gateways:mcp-servers", "update", "--instance-id", "gateway-1", "--server-id", "server-1", "--transport", "http", "--url", "https://mcp-v2.example.com", "--format", "json"],
      ["agent-gateways:mcp-servers", "list", "--instance-id", "gateway-1", "--format", "raw"],
      ["agent-gateways:mcp-servers", "delete", "--instance-id", "gateway-1", "--server-id", "server-1", "--format", "json"],
    ]);
  });

  it("rejects missing IDs, unsafe deletion, and malformed JSON before dispatch", () => {
    for (const args of [
      ["create-agent-gateway", "--json"],
      ["delete-agent-gateway", "--instance-id", "gateway-1", "--json"],
      ["create-agent-gateway-api", "--instance-id", "gateway-1", "--name", "crm", "--spec-url", "https://example.com/openapi.json", "--auth", "[]", "--json"],
      ["create-agent-gateway-mcp-server", "--instance-id", "gateway-1", "--name", "docs", "--url", "https://mcp.example.com", "--open-to-every-key", "yes", "--json"],
    ]) {
      const fake = setupFakeTelnyx();
      const result = runAgent(args, fake.env);
      assert.notEqual(result.status, 0, args.join(" "));
      assert.ok(JSON.parse(result.stdout).error);
      assert.deepEqual(loggedArgs(fake.logPath), []);
    }
  });

  it("requires a v0.37 Go CLI with an actionable upgrade message before dispatch", () => {
    const fake = setupFakeTelnyx("0.32.0");
    const result = runAgent(["list-agent-gateways", "--json"], fake.env);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /requires >= 0\.37\.0/);
    assert.match(result.stdout, /go install|TELNYX_CLI_PATH/);
    assert.deepEqual(loggedArgs(fake.logPath), []);
  });

  it("registers every scoped command, documented flag, and capability metadata", () => {
    const help = runAgent(["help"], process.env);
    assert.equal(help.status, 0, help.stderr);
    for (const command of [
      "create-agent-gateway", "get-agent-gateway", "list-agent-gateways", "delete-agent-gateway", "retrieve-agent-gateway-models",
      "create-agent-gateway-api", "update-agent-gateway-api", "list-agent-gateway-apis", "delete-agent-gateway-api",
      "create-agent-gateway-mcp-server", "update-agent-gateway-mcp-server", "list-agent-gateway-mcp-servers", "delete-agent-gateway-mcp-server",
    ]) assert.match(help.stdout, new RegExp(command));
    for (const flag of ["wireguard-interface-id", "instance-id", "api-id", "server-id", "spec-url", "auth", "static-headers", "forwarded-header", "open-to-every-key", "transport"]) {
      assert.match(help.stdout, new RegExp(`--${flag}`));
    }

    const capabilities = assertSuccess(runAgent(["capabilities", "--json"], process.env)) as {
      api_capabilities: Record<string, Array<{ name: string; actions: string[] }>>;
      composite_commands: Array<{ name: string }>;
    };
    const gateway = capabilities.api_capabilities["🤖 AI"].find((capability) => capability.name === "Agent Gateway");
    if (!gateway) assert.fail("Agent Gateway capability must be present");
    assert.deepEqual(gateway.actions, [
      "create_agent_gateway", "get_agent_gateway", "list_agent_gateways", "delete_agent_gateway", "retrieve_agent_gateway_models",
      "create_agent_gateway_api", "update_agent_gateway_api", "list_agent_gateway_apis", "delete_agent_gateway_api",
      "create_agent_gateway_mcp_server", "update_agent_gateway_mcp_server", "list_agent_gateway_mcp_servers", "delete_agent_gateway_mcp_server",
    ]);
    assert.ok(capabilities.composite_commands.some((entry) => entry.name === "telnyx-agent create-agent-gateway-mcp-server"));
  });
});
