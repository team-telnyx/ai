/** Mock-binary coverage for private-network and WireGuard lifecycle actions. */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliRoot = join(__dirname, "..");
const cliBin = join(cliRoot, "bin", "telnyx-agent.ts");

type Fake = { env: NodeJS.ProcessEnv; logPath: string };

type AgentResult = { status: number; stdout: string; stderr: string };

function setupFakeTelnyx(version = "0.34.0", fail = false): Fake {
  const tempDir = mkdtempSync(join(tmpdir(), "telnyx-agent-networking-"));
  const binDir = join(tempDir, "bin");
  const logPath = join(tempDir, "args.jsonl");
  const fakeTelnyx = join(binDir, "telnyx");
  mkdirSync(binDir, { recursive: true });
  writeFileSync(fakeTelnyx, `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
if (args[0] === "--version") { console.log("telnyx version ${version}"); process.exit(0); }
fs.appendFileSync(process.env.TELNYX_FAKE_ARGS_LOG, JSON.stringify(args) + "\\n");
if (${JSON.stringify(fail)}) {
  process.stderr.write("fake request failed with tskey-dummy-only");
  process.exit(9);
}
const list = args.includes("list") || args.includes("list-interfaces");
const resource = args[0];
const routerAuth = resource === "tailscale-subnet-routers" ? { auth_key: "fake-response-auth-key" } : {};
const data = list
  ? [1, 2, 3].map((number) => ({ id: resource + "-" + number, name: "agent-network-" + number, status: "active", type: "wireguard" }))
  : { id: resource + "-1", name: "agent-network", status: "active", ...routerAuth };
process.stdout.write(JSON.stringify(list ? { data, meta: { total_results: 3 } } : { data }));
`);
  chmodSync(fakeTelnyx, 0o755);
  return { env: { ...process.env, TELNYX_CLI_PATH: fakeTelnyx, TELNYX_FAKE_ARGS_LOG: logPath }, logPath };
}

function runAgent(args: string[], env: NodeJS.ProcessEnv): AgentResult {
  try {
    const stdout = execFileSync(process.execPath, ["--import", "tsx", cliBin, ...args], {
      cwd: cliRoot,
      encoding: "utf8",
      env,
      timeout: 30_000,
    });
    return { status: 0, stdout, stderr: "" };
  } catch (err: any) {
    return { status: err.status ?? 1, stdout: err.stdout?.toString() ?? "", stderr: err.stderr?.toString() ?? "" };
  }
}

function loggedArgs(logPath: string): string[][] {
  if (!existsSync(logPath)) return [];
  const content = readFileSync(logPath, "utf8");
  assert.ok(content.endsWith("\n"), "fake binary JSONL must use a real newline terminator");
  return content.trimEnd().split("\n").map((line) => JSON.parse(line) as string[]);
}

function expectSuccess(args: string[], fake: Fake): unknown {
  const result = runAgent(args, fake.env);
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

function expectFailure(args: string[], fake: Fake): string {
  const result = runAgent(args, fake.env);
  assert.notEqual(result.status, 0, result.stdout);
  return `${result.stdout}${result.stderr}`;
}

function assertCalls(args: string[][], expected: string[][]): void {
  assert.deepEqual(args, expected);
}

describe("network lifecycle", () => {
  it("routes create, retrieve, update, list, delete, and list-interfaces through their exact generated flags", () => {
    const fake = setupFakeTelnyx();

    assert.deepEqual(expectSuccess(["network", "--action", "create", "--name", "agent-network", "--json"], fake), {
      data: { id: "networks-1", name: "agent-network", status: "active" },
    });
    expectSuccess(["network", "--action", "retrieve", "--id", "net-1", "--json"], fake);
    expectSuccess(["network", "--action", "update", "--id", "net-1", "--name", "renamed-network", "--json"], fake);
    assert.deepEqual(expectSuccess([
      "network", "--action", "list", "--name", "agent-network", "--page-number", "2", "--page-size", "10", "--max-items", "10", "--json",
    ], fake), {
      data: [
        { id: "networks-1", name: "agent-network-1", status: "active", type: "wireguard" },
        { id: "networks-2", name: "agent-network-2", status: "active", type: "wireguard" },
        { id: "networks-3", name: "agent-network-3", status: "active", type: "wireguard" },
      ],
      meta: { total_results: 3 },
    });
    expectSuccess(["network", "--action", "delete", "--id", "net-1", "--confirm", "--json"], fake);
    expectSuccess([
      "network", "--action", "list-interfaces", "--id", "net-1", "--name", "gateway", "--status", "active", "--type", "wireguard", "--json",
    ], fake);

    assert.deepEqual(loggedArgs(fake.logPath), [
      ["networks", "create", "--network-create", '{"name":"agent-network"}', "--format", "json"],
      ["networks", "retrieve", "--id", "net-1", "--format", "json"],
      ["networks", "update", "--network-id", "net-1", "--network-create", '{"name":"renamed-network"}', "--format", "json"],
      ["networks", "list", "--filter.name", "agent-network", "--page-number", "2", "--page-size", "10", "--max-items", "10", "--format", "raw"],
      ["networks", "delete", "--id", "net-1", "--format", "json"],
      ["networks", "list-interfaces", "--id", "net-1", "--filter.name", "gateway", "--filter.status", "active", "--filter.type", "wireguard", "--format", "raw"],
    ]);
  });

  it("requires local names and IDs and accepts only bare confirmation for destructive actions", () => {
    for (const args of [
      ["network", "--action", "create", "--json"],
      ["network", "--action", "retrieve", "--json"],
      ["network", "--action", "update", "--id", "net-1", "--json"],
      ["network", "--action", "delete", "--id", "net-1", "--json"],
      ["network", "--action", "delete", "--id", "net-1", "--confirm", "true", "--json"],
    ]) {
      const fake = setupFakeTelnyx();
      assert.match(expectFailure(args, fake), /required|bare --confirm/);
      assert.deepEqual(loggedArgs(fake.logPath), []);
    }
  });
});

describe("Tailscale subnet router lifecycle", () => {
  it("routes create, retrieve, update, empty-body retry, list, and delete through v0.34 generated actions without emitting auth keys", () => {
    const fake = setupFakeTelnyx("0.34.0");
    const create = expectSuccess([
      "tailscale-subnet-router", "--action", "create",
      "--advertised-route", "10.10.0.0/24", "--advertised-route", "10.11.0.0/24",
      "--auth-key", "tskey-dummy-only", "--name", "branch-router", "--network-id", "net-1", "--region-code", "ashburn-va", "--json",
    ], fake) as { data: Record<string, string> };
    assert.equal(create.data.auth_key, "[REDACTED]");
    expectSuccess(["tailscale-subnet-router", "--action", "retrieve", "--id", "tsr-1", "--json"], fake);
    expectSuccess([
      "tailscale-subnet-router", "--action", "update", "--id", "tsr-1",
      "--advertised-route", "10.12.0.0/24", "--advertised-route", "10.13.0.0/24",
      "--auth-key", "tskey-dummy-only", "--name", "renamed-router", "--json",
    ], fake);
    expectSuccess(["tailscale-subnet-router", "--action", "update", "--id", "tsr-1", "--json"], fake);
    expectSuccess([
      "tailscale-subnet-router", "--action", "list", "--network-id", "net-1",
      "--page-number", "2", "--page-size", "10", "--max-items", "2", "--json",
    ], fake);
    expectSuccess(["tailscale-subnet-router", "--action", "delete", "--id", "tsr-1", "--confirm", "--json"], fake);

    assert.deepEqual(loggedArgs(fake.logPath), [
      ["tailscale-subnet-routers", "create", "--advertised-route", "10.10.0.0/24", "--advertised-route", "10.11.0.0/24", "--auth-key", "tskey-dummy-only", "--name", "branch-router", "--network-id", "net-1", "--region-code", "ashburn-va", "--format", "json"],
      ["tailscale-subnet-routers", "retrieve", "--id", "tsr-1", "--format", "json"],
      ["tailscale-subnet-routers", "update", "--id", "tsr-1", "--advertised-route", "10.12.0.0/24", "--advertised-route", "10.13.0.0/24", "--auth-key", "tskey-dummy-only", "--name", "renamed-router", "--format", "json"],
      ["tailscale-subnet-routers", "update", "--id", "tsr-1", "--format", "json"],
      ["tailscale-subnet-routers", "list", "--filter.network-id", "net-1", "--page-number", "2", "--page-size", "10", "--max-items", "2", "--format", "raw"],
      ["tailscale-subnet-routers", "delete", "--id", "tsr-1", "--format", "json"],
    ]);
  });

  it("requires v0.34 before dispatching and does not leak auth keys in failures", () => {
    const oldCli = setupFakeTelnyx("0.33.9");
    const oldResult = runAgent([
      "tailscale-subnet-router", "--action", "create", "--advertised-route", "10.10.0.0/24",
      "--auth-key", "tskey-dummy-only", "--name", "branch-router", "--network-id", "net-1", "--region-code", "ashburn-va", "--json",
    ], oldCli.env);
    assert.equal(oldResult.status, 1);
    assert.match(oldResult.stdout, /requires >= 0\.34\.0/);
    assert.doesNotMatch(`${oldResult.stdout}${oldResult.stderr}`, /tskey-dummy-only/);
    assert.deepEqual(loggedArgs(oldCli.logPath), []);

    const failing = setupFakeTelnyx("0.34.0", true);
    const failed = runAgent([
      "tailscale-subnet-router", "--action", "update", "--id", "tsr-1", "--auth-key", "tskey-dummy-only", "--json",
    ], failing.env);
    assert.equal(failed.status, 1);
    assert.match(`${failed.stdout}${failed.stderr}`, /\[REDACTED\]/);
    assert.doesNotMatch(`${failed.stdout}${failed.stderr}`, /tskey-dummy-only/);
  });

  it("requires routes and bare confirmation before dispatch", () => {
    for (const args of [
      ["tailscale-subnet-router", "--action", "create", "--auth-key", "tskey-dummy-only", "--name", "branch-router", "--network-id", "net-1", "--region-code", "ashburn-va", "--json"],
      ["tailscale-subnet-router", "--action", "delete", "--id", "tsr-1", "--json"],
      ["tailscale-subnet-router", "--action", "delete", "--id", "tsr-1", "--confirm", "true", "--json"],
    ]) {
      const fake = setupFakeTelnyx();
      assert.match(expectFailure(args, fake), /required|bare --confirm/);
      assert.deepEqual(loggedArgs(fake.logPath), []);
    }
  });
});

describe("WireGuard interface and peer lifecycle", () => {
  it("uses generated body, path, filter, and update flags without a version gate", () => {
    const fake = setupFakeTelnyx();

    expectSuccess(["wireguard-interface", "--action", "create", "--network-id", "net-1", "--region-code", "ashburn-va", "--name", "gateway", "--json"], fake);
    expectSuccess(["wireguard-interface", "--action", "retrieve", "--id", "wgi-1", "--json"], fake);
    expectSuccess(["wireguard-interface", "--action", "list", "--network-id", "net-1", "--page-size", "5", "--json"], fake);
    expectSuccess(["wireguard-interface", "--action", "delete", "--id", "wgi-1", "--confirm", "--json"], fake);
    expectSuccess(["wireguard-peer", "--action", "create", "--wireguard-interface-id", "wgi-1", "--public-key", "public-1", "--json"], fake);
    expectSuccess(["wireguard-peer", "--action", "retrieve", "--id", "wgp-1", "--json"], fake);
    expectSuccess(["wireguard-peer", "--action", "update", "--id", "wgp-1", "--public-key", "public-2", "--json"], fake);
    expectSuccess(["wireguard-peer", "--action", "list", "--wireguard-interface-id", "wgi-1", "--max-items", "2", "--json"], fake);
    expectSuccess(["wireguard-peer", "--action", "delete", "--id", "wgp-1", "--confirm", "--json"], fake);

    assertCalls(loggedArgs(fake.logPath), [
      ["wireguard-interfaces", "create", "--body", '{"network_id":"net-1","region_code":"ashburn-va","name":"gateway"}', "--format", "json"],
      ["wireguard-interfaces", "retrieve", "--id", "wgi-1", "--format", "json"],
      ["wireguard-interfaces", "list", "--filter.network-id", "net-1", "--page-size", "5", "--format", "raw"],
      ["wireguard-interfaces", "delete", "--id", "wgi-1", "--format", "json"],
      ["wireguard-peers", "create", "--body", '{"wireguard_interface_id":"wgi-1","public_key":"public-1"}', "--format", "json"],
      ["wireguard-peers", "retrieve", "--id", "wgp-1", "--format", "json"],
      ["wireguard-peers", "update", "--id", "wgp-1", "--public-key", "public-2", "--format", "json"],
      ["wireguard-peers", "list", "--filter.wireguard-interface-id", "wgi-1", "--max-items", "2", "--format", "raw"],
      ["wireguard-peers", "delete", "--id", "wgp-1", "--format", "json"],
    ]);
  });

  it("validates required WireGuard IDs and rejects valued delete confirmation before dispatch", () => {
    for (const args of [
      ["wireguard-interface", "--action", "create", "--network-id", "net-1", "--json"],
      ["wireguard-interface", "--action", "create", "--region-code", "ashburn-va", "--name", "gateway", "--json"],
      ["wireguard-peer", "--action", "create", "--json"],
      ["wireguard-peer", "--action", "retrieve", "--id", "--json"],
      ["wireguard-interface", "--action", "delete", "--id", "wgi-1", "--confirm", "false", "--json"],
      ["wireguard-peer", "--action", "delete", "--id", "wgp-1", "--confirm", "true", "--json"],
    ]) {
      const fake = setupFakeTelnyx();
      assert.match(expectFailure(args, fake), /requires a non-empty value|required|bare --confirm/);
      assert.deepEqual(loggedArgs(fake.logPath), []);
    }
  });

  it("enforces bounded list output locally and treats -1 as unlimited", () => {
    for (const [command, action, filter] of [
      ["network", "list", []],
      ["network", "list-interfaces", ["--id", "net-1"]],
      ["wireguard-interface", "list", []],
      ["wireguard-peer", "list", []],
    ] as const) {
      const fake = setupFakeTelnyx();
      const bounded = expectSuccess([command, "--action", action, ...filter, "--max-items", "2", "--json"], fake) as { data: unknown[] };
      assert.equal(bounded.data.length, 2, `${command} ${action} must locally cap raw data`);

      const human = runAgent([command, "--action", action, ...filter, "--max-items", "2"], fake.env);
      assert.equal(human.status, 0, human.stderr);
      assert.match(human.stdout, /Count\s+2/);
      assert.doesNotMatch(human.stdout, new RegExp(`${command === "network" && action === "list-interfaces" ? "networks" : command === "network" ? "networks" : `${command}s`}-3`));

      const zero = expectSuccess([command, "--action", action, ...filter, "--max-items", "0", "--json"], fake) as { data: unknown[] };
      assert.deepEqual(zero.data, [], `${command} ${action} must permit zero items`);

      const unlimited = expectSuccess([command, "--action", action, ...filter, "--max-items", "-1", "--json"], fake) as { data: unknown[] };
      assert.equal(unlimited.data.length, 3, `${command} ${action} must retain all items for -1`);
    }
  });

  it("rejects invalid max-items before dispatching a list", () => {
    for (const args of [
      ["network", "--action", "list", "--max-items", "-2", "--json"],
      ["wireguard-interface", "--action", "list", "--max-items", "1.5", "--json"],
      ["wireguard-peer", "--action", "list", "--max-items", "9007199254740992", "--json"],
    ]) {
      const fake = setupFakeTelnyx();
      assert.match(expectFailure(args, fake), /--max-items must be -1 or a non-negative safe integer/);
      assert.deepEqual(loggedArgs(fake.logPath), []);
    }
  });
});

describe("networking registration", () => {
  it("shows the generic action commands in help and advertises networking capabilities without dispatching", () => {
    const fake = setupFakeTelnyx();
    const help = runAgent(["network", "--help"], fake.env);
    assert.equal(help.status, 0, help.stderr);
    assert.match(help.stdout, /network\s+Manage private networks/);
    assert.match(help.stdout, /wireguard-interface/);
    assert.match(help.stdout, /wireguard-peer/);
    assert.match(help.stdout, /tailscale-subnet-router/);
    assert.match(help.stdout, /Go CLI v0\.34\+/);
    assert.match(help.stdout, /--advertised-route <cidr>/);
    assert.deepEqual(loggedArgs(fake.logPath), []);

    const capabilities = expectSuccess(["capabilities", "--json"], fake) as {
      api_capabilities: Record<string, Array<{ actions: string[] }>>;
    };
    const networking = capabilities.api_capabilities["🔐 Networking"];
    assert.ok(networking.some((capability) => capability.actions.includes("list_network_interfaces")));
    assert.ok(networking.some((capability) => capability.actions.includes("delete_wireguard_peer")));
    assert.ok(networking.some((capability) => capability.actions.includes("create_tailscale_subnet_router")));
    assert.ok(networking.some((capability) => capability.actions.includes("delete_tailscale_subnet_router")));
    assert.deepEqual(loggedArgs(fake.logPath), []);
  });
});
