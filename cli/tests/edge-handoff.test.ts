import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEdgeAuthStatus, parseEdgeHelpCommands } from "../src/edge-cli.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = join(__dirname, "..", "bin", "telnyx-agent.ts");

function withFakeEdgeCli(mode: "none" | "oauth" | "api_key" = "api_key") {
  const tempDir = mkdtempSync(join(tmpdir(), "telnyx-edge-fake-"));
  const binDir = join(tempDir, "bin");
  mkdirSync(binDir, { recursive: true });
  const fakeEdge = join(binDir, "telnyx-edge");
  writeFileSync(
    fakeEdge,
    `#!/usr/bin/env node
const args = process.argv.slice(2);
if (args[0] === 'auth' && args[1] === 'api-key' && args[2] === 'set' && args.includes('--help')) {
  console.log('Set API key for authentication. The API key must be provided as an argument.');
  process.exit(0);
}
if (args.includes('--help')) {
  console.log(['telnyx-edge v0.1.0', 'Commands: auth login, auth api-key set, ship, list, secrets, bindings, storage'].join('\\n'));
  process.exit(0);
}
if (args[0] === 'auth' && args[1] === 'status') {
  if ('${mode}' === 'none') {
    console.log(['API Endpoint: https://api.telnyx.com', '', 'Authentication Status: None', 'Status: ❌ Not authenticated', "Run 'telnyx-edge auth login' or 'telnyx-edge auth api-key set <api_key>' to authenticate"].join('\\n'));
    process.exit(0);
  }
  if ('${mode}' === 'oauth') {
    console.log(['API Endpoint: https://api.telnyx.com', '', 'Authentication Status: OAuth', 'Status: ✅ Authenticated'].join('\\n'));
    process.exit(0);
  }
  console.log(['API Endpoint: https://api.telnyx.com', '', 'Authentication Status: API Key', 'Status: ✅ Authenticated'].join('\\n'));
  process.exit(0);
}
if (args[0] === 'auth' && args[1] === 'api-key' && args[2] === 'clear' && args.includes('--help')) {
  console.log('Remove the stored API key from the configuration');
  process.exit(0);
}
console.log('ok');
`,
  );
  chmodSync(fakeEdge, 0o755);
  return {
    env: {
      ...process.env,
      PATH: `${binDir}:${process.env.PATH}`,
      TELNYX_EDGE_PATH: fakeEdge,
    },
  };
}

function run(args: string[], env?: NodeJS.ProcessEnv): string {
  return execFileSync("npx", ["tsx", CLI, ...args], {
    encoding: "utf8",
    timeout: 30000,
    env: env ?? { ...process.env },
  });
}

describe("CLI — Edge Compute handoff", () => {
  it("parses OAuth, API-key, none, and expired auth states correctly", () => {
    const oauth = parseEdgeAuthStatus([
      "API Endpoint: https://api.telnyx.com",
      "Authentication Status: OAuth 2.0",
      "Token Type: Bearer",
      "Status: ✅ Authenticated",
    ].join("\n"));
    assert.equal(oauth.authenticated, true);
    assert.equal(oauth.mode, "oauth");

    const apiKey = parseEdgeAuthStatus([
      "API Endpoint: https://api.telnyx.com",
      "Authentication Status: API Key",
      "Status: ✅ Authenticated",
    ].join("\n"));
    assert.equal(apiKey.authenticated, true);
    assert.equal(apiKey.mode, "api_key");

    const none = parseEdgeAuthStatus([
      "API Endpoint: https://api.telnyx.com",
      "Authentication Status: None",
      "Status: ❌ Not authenticated",
    ].join("\n"));
    assert.equal(none.authenticated, false);
    assert.equal(none.mode, "none");

    const expired = parseEdgeAuthStatus([
      "⚠️  A new version of the Telnyx Edge CLI is available: 0.2.5 (you have 0.2.3)",
      "Authentication Status: OAuth 2.0",
      "Token Type: Bearer",
      "Status: ⚠️ Token expired - run 'telnyx-edge auth login' to refresh",
    ].join("\n"));
    assert.equal(expired.authenticated, false);
    assert.equal(expired.mode, "oauth");
  });

  it("parses the live Edge command surface from help output", () => {
    const commands = parseEdgeHelpCommands([
      "Available Commands:",
      "  actors      Manage account-scoped StatefulActor types",
      "  auth        Authentication commands",
      "  inspect     Show a function's full details and its actor bindings",
      "  list        List all edge computing functions",
      "  storage     Manage Edge storage resources including sqldb",
      "  types       Generate TypeScript binding types for a telnyx.toml or func.toml project",
      "",
      "Flags:",
    ].join("\n"));
    assert.deepEqual(commands, ["actors", "auth", "inspect", "list", "storage", "types"]);
  });

  it("help lists edge handoff commands", () => {
    const output = run(["help"]);
    assert.ok(output.includes("edge-doctor"));
    assert.ok(output.includes("setup-edge-mcp"));
    assert.ok(output.includes("setup-edge-webhook"));
  });

  it("capabilities JSON includes edge handoff entries", () => {
    const output = run(["capabilities", "--json"]);
    const data = JSON.parse(output);
    const category = Object.keys(data.api_capabilities || {}).find((k) => k.includes("Edge Compute"));
    assert.ok(category);
    const handoff = data.api_capabilities[category].find((cap: { name?: string }) => cap.name === "Deployment Handoff");
    assert.ok(handoff);
    assert.ok(handoff.description.includes("storage sqldb"));
    const edgeActions = data.api_capabilities[category].flatMap((cap: { actions?: string[] }) => cap.actions || []);
    assert.ok(edgeActions.includes("telnyx_edge_storage_sqldb"));
    const commands = data.composite_commands.map((c: any) => c.name || c.command || c);
    assert.ok(commands.some((c: string) => c.includes("edge-doctor")));
    assert.ok(commands.some((c: string) => c.includes("setup-edge-mcp")));
    assert.ok(commands.some((c: string) => c.includes("setup-edge-webhook")));
  });

  it("edge-doctor reports API-key auth support and readiness", () => {
    const fake = withFakeEdgeCli("api_key");
    const output = run(["edge-doctor", "--json"], fake.env);
    const data = JSON.parse(output);
    assert.equal(data.ready, true);
    assert.equal(data.telnyx_edge_installed, true);
    assert.equal(data.authenticated, true);
    assert.equal(data.auth_mode, "api_key");
    assert.equal(data.api_key_auth_supported, true);
    assert.ok(data.edge_command_surface.includes("bindings"));
    assert.ok(data.edge_command_surface.includes("storage"));
    assert.ok(Array.isArray(data.next_steps));
  });

  it("edge-doctor shows unauthenticated but installable state", () => {
    const fake = withFakeEdgeCli("none");
    const output = run(["edge-doctor", "--json"], fake.env);
    const data = JSON.parse(output);
    assert.equal(data.ready, false);
    assert.equal(data.telnyx_edge_installed, true);
    assert.equal(data.authenticated, false);
    assert.equal(data.api_key_auth_supported, true);
    assert.ok(data.edge_command_surface.includes("bindings"));
    assert.ok(data.edge_command_surface.includes("storage"));
    assert.ok(data.next_steps.some((s: string) => s.includes("auth api-key set")));
  });

  it("edge-doctor treats expired OAuth as not ready", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "telnyx-edge-expired-"));
    const binDir = join(tempDir, "bin");
    mkdirSync(binDir, { recursive: true });
    const fakeEdge = join(binDir, "telnyx-edge");
    writeFileSync(
      fakeEdge,
      `#!/usr/bin/env node
const args = process.argv.slice(2);
if (args[0] === 'auth' && args[1] === 'api-key' && args[2] === 'set' && args.includes('--help')) {
  console.log('Set API key for authentication. The API key must be provided as an argument.');
  process.exit(0);
}
if (args.includes('--help')) {
  console.log(['telnyx-edge v0.2.3', 'Available Commands:', '  actors      Manage account-scoped StatefulActor types', '  auth        Authentication commands', '  bindings    Manage Telnyx API key bindings for edge computing functions', '  inspect     Show a function\\'s full details and its actor bindings', '  storage     Manage Edge storage resources including sqldb', '  types       Generate TypeScript binding types for a telnyx.toml or func.toml project', '', 'Flags:'].join('\\n'));
  process.exit(0);
}
if (args[0] === 'auth' && args[1] === 'status') {
  console.log(['Authentication Status: OAuth 2.0', 'Token Type: Bearer', \"Status: ⚠️ Token expired - run 'telnyx-edge auth login' to refresh\"].join('\\n'));
  process.exit(0);
}
console.log('ok');
`,
    );
    chmodSync(fakeEdge, 0o755);

    const output = run(["edge-doctor", "--json"], {
      ...process.env,
      PATH: `${binDir}:${process.env.PATH}`,
      TELNYX_EDGE_PATH: fakeEdge,
    });
    const data = JSON.parse(output);
    assert.equal(data.ready, false);
    assert.equal(data.authenticated, false);
    assert.equal(data.auth_mode, "oauth");
    assert.ok(data.edge_command_surface.includes("actors"));
    assert.ok(data.edge_command_surface.includes("storage"));
  });

  it("setup-edge-mcp returns API-key auth handoff when unauthenticated", () => {
    const fake = withFakeEdgeCli("none");
    const output = run(["setup-edge-mcp", "--json", "--name", "demo-mcp"], fake.env);
    const data = JSON.parse(output);
    assert.equal(data.ready, false);
    assert.equal(data.api_key_auth_supported, true);
    assert.equal(data.auth_command, "telnyx-edge auth api-key set <your-api-key>");
    assert.equal(data.example, "examples/ts/mcp-server");
    assert.ok(data.deploy_command.includes("demo-mcp"));
  });

  it("setup-edge-webhook returns concrete deploy handoff", () => {
    const fake = withFakeEdgeCli("api_key");
    const output = run(["setup-edge-webhook", "--json", "--name", "demo-webhook"], fake.env);
    const data = JSON.parse(output);
    assert.equal(data.ready, true);
    assert.equal(data.auth_mode, "api_key");
    assert.equal(data.example, "examples/js/webhook-receiver");
    assert.ok(data.deploy_command.includes("demo-webhook"));
  });
});
