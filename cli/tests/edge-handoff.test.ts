import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = join(__dirname, "..", "bin", "telnyx-agent.ts");

type AuthMode = "none" | "oauth" | "api_key" | "expired_oauth" | "unknown";
type FakeEdgeOptions = {
  auth?: AuthMode;
  rootStatus?: "pass" | "fail" | "unknown";
  inspect?: boolean;
  actorInstances?: boolean;
  newFuncFromDir?: boolean;
  secretsAdd?: boolean;
  ship?: boolean;
  resetFunc?: boolean;
  resetNoninteractiveConfirmation?: boolean;
  noninteractiveConfirmation?: boolean;
  types?: boolean;
  kvStorage?: boolean;
  kvKeyManagement?: boolean;
  sqlDatabases?: boolean;
  argLog?: boolean;
};

function withFakeEdgeCli(options: FakeEdgeOptions | AuthMode = "api_key") {
  const config: FakeEdgeOptions = typeof options === "string" ? { auth: options } : options;
  const auth = config.auth ?? "api_key";
  const rootStatus = config.rootStatus ?? (auth === "api_key" || auth === "oauth" ? "pass" : "fail");
  const inspect = config.inspect ?? true;
  const actorInstances = config.actorInstances ?? true;
  const newFuncFromDir = config.newFuncFromDir ?? true;
  const secretsAdd = config.secretsAdd ?? true;
  const ship = config.ship ?? true;
  const resetFunc = config.resetFunc ?? true;
  const resetNoninteractiveConfirmation = config.resetNoninteractiveConfirmation ?? false;
  const noninteractiveConfirmation = config.noninteractiveConfirmation ?? true;
  const types = config.types ?? true;
  const kvStorage = config.kvStorage ?? true;
  const kvKeyManagement = config.kvKeyManagement ?? true;
  const sqlDatabases = config.sqlDatabases ?? true;
  const tempDir = mkdtempSync(join(tmpdir(), "telnyx-edge-fake-"));
  const binDir = join(tempDir, "bin");
  const argsLog = join(tempDir, "args.jsonl");
  mkdirSync(binDir, { recursive: true });
  const fakeEdge = join(binDir, "telnyx-edge");
  writeFileSync(
    fakeEdge,
    `#!/usr/bin/env node
const args = process.argv.slice(2);
if (process.env.EDGE_ARGS_LOG) {
  require('node:fs').appendFileSync(process.env.EDGE_ARGS_LOG, JSON.stringify(args) + "\\n");
}
if (args.includes('--version')) {
  console.log('telnyx-edge v0.2.5');
  process.exit(0);
}
if (args[0] === 'new-func' && args.includes('--help')) {
  console.log(['Create a new edge computing function', '', 'Usage: telnyx-edge new-func [flags]', '', 'Flags:', '      --actor             Scaffold a StatefulActor project', ...(${newFuncFromDir} ? ['      --from-dir string   Copy files from existing directory'] : []), '  -h, --help              help for new-func', '  -n, --name string       Name of the function to create'].join('\\n'));
  process.exit(0);
}
if (args[0] === 'auth' && args[1] === 'api-key' && args[2] === 'set' && args.includes('--help')) {
  console.log('Set API key for authentication. The API key must be provided as an argument.');
  process.exit(0);
}
if (args[0] === 'secrets' && args[1] === 'add' && args.includes('--help')) {
  if (${secretsAdd}) {
    console.log('Add or update a secret\\nUsage: telnyx-edge secrets add <key> <value> [flags]');
    process.exit(0);
  }
  process.stderr.write('unknown command "add"\\n');
  process.exit(1);
}
if (args[0] === 'ship' && args.includes('--help')) {
  if (${ship}) {
    console.log('Ship a function to Telnyx edge infrastructure\\nUsage: telnyx-edge ship [flags]');
    process.exit(0);
  }
  process.stderr.write('unknown command "ship"\\n');
  process.exit(1);
}
if (args[0] === 'reset-func' && args.includes('--help')) {
  if (${resetFunc}) {
    console.log(['Reset a failed function back to the created state', 'Usage: telnyx-edge reset-func <function-name> [flags]', ...(${resetNoninteractiveConfirmation} ? ['  -y, --yes  Skip the confirmation prompt (for scripts and CI)'] : [])].join('\\n'));
    process.exit(0);
  }
  process.stderr.write('unknown command "reset-func"\\n');
  process.exit(1);
}
if (args[0] === 'delete-func' && args.includes('--help')) {
  if (${noninteractiveConfirmation}) {
    console.log('Delete an edge function after confirmation\\n  -y, --yes  Skip the confirmation prompt (for scripts and CI)');
    process.exit(0);
  }
  console.log('Delete an edge function');
  process.exit(0);
}
if (args[0] === 'types' && args.includes('--help')) {
  if (${types}) {
    console.log('Generate TypeScript binding types\\nUsage: telnyx-edge types [flags]');
    process.exit(0);
  }
  process.stderr.write('unknown command "types"\\n');
  process.exit(1);
}
if (args[0] === 'storage' && args[1] === 'kv' && args[2] === 'key' && args.includes('--help')) {
  if (${kvKeyManagement}) {
    console.log('Manage keys in a KV namespace\\nUsage: telnyx-edge storage kv key [command]\\nCommands: list get put delete');
    process.exit(0);
  }
  process.stderr.write('unknown command "key"\\n');
  process.exit(1);
}
if (args[0] === 'storage' && args[1] === 'kv' && args.includes('--help')) {
  if (${kvStorage}) {
    console.log('Manage KV storage namespaces\\nUsage: telnyx-edge storage kv [command]\\nCommands: create list get delete key');
    process.exit(0);
  }
  process.stderr.write('unknown command "kv"\\n');
  process.exit(1);
}
if (args[0] === 'storage' && args[1] === 'sqldb' && args[2] === 'execute' && args.includes('--help')) {
  if (${sqlDatabases}) {
    console.log('Run SQL against a SQL database\\nUsage: telnyx-edge storage sqldb execute <database> [flags]\\n--remote  --command string  --file string');
    process.exit(0);
  }
  console.log('Usage: telnyx-edge storage sqldb execute <database> [flags]\\n--remote --command string');
  process.exit(0);
}
if (args[0] === 'inspect' && args.includes('--help')) {
  if (${inspect}) {
    console.log('Usage: telnyx-edge inspect <function>\\nShow a function full details and actor bindings');
    process.exit(0);
  }
  process.stderr.write('unknown command "inspect"\\n');
  process.exit(1);
}
if (args[0] === 'actors' && args[1] === 'instances' && args.includes('--help')) {
  if (${actorInstances}) {
    console.log('Usage: telnyx-edge actors instances <type>\\nList persisted instances of an actor type');
    process.exit(0);
  }
  process.stderr.write('unknown command "instances"\\n');
  process.exit(1);
}
if (args.length === 1 && args[0] === '--help') {
  console.log(['Telnyx Edge CLI v0.2.5', '', 'Available Commands:', '  actors      Manage StatefulActor types', '  inspect     Show function details', '  auth        Authentication commands', '  ship        Ship a function', '  storage     Manage storage'].join('\\n'));
  process.exit(0);
}
if (args[0] === 'auth' && args[1] === 'status') {
  if ('${auth}' === 'none') {
    console.log(['API Endpoint: https://api.telnyx.com', '', 'Authentication Status: None', 'Status: ❌ Not authenticated'].join('\\n'));
    process.exit(0);
  }
  if ('${auth}' === 'unknown') {
    console.log('Authentication cache loaded; contact support for details');
    process.exit(0);
  }
  if ('${auth}' === 'expired_oauth') {
    console.log(['API Endpoint: https://api.telnyx.com', '', 'Authentication Status: OAuth 2.0', 'Status: ⚠️ Token expired - run telnyx-edge auth login to refresh'].join('\\n'));
    process.exit(0);
  }
  if ('${auth}' === 'oauth') {
    console.log(['API Endpoint: https://api.telnyx.com', '', 'Authentication Status: OAuth 2.0', 'Status: ✓ Authenticated'].join('\\n'));
    process.exit(0);
  }
  console.log(['API Endpoint: https://api.telnyx.com', '', 'Authentication Status: API Key', 'Status: ✓ Authenticated'].join('\\n'));
  process.exit(0);
}
if (args.length === 1 && args[0] === 'status') {
  if ('${rootStatus}' === 'pass') {
    console.log(['Telnyx Edge CLI Status Check', '✅ Config file OK', '✅ Reachable: https://api.telnyx.com (HTTP 200)', '✅ API key is valid', '', '✅ All checks passed - CLI is ready to use'].join('\\n'));
    process.exit(0);
  }
  if ('${rootStatus}' === 'unknown') {
    console.log('Status command completed');
    process.exit(0);
  }
  console.log(['Telnyx Edge CLI Status Check', '✅ Config file OK', '❌ Failed: Cannot reach https://api.telnyx.com', '', '❌ Some checks failed - please review the issues above'].join('\\n'));
  process.exit(0);
}
console.log('ok');
`,
  );
  chmodSync(fakeEdge, 0o755);
  return {
    argsLog,
    env: {
      ...process.env,
      PATH: `${binDir}:${process.env.PATH}`,
      TELNYX_EDGE_PATH: fakeEdge,
      ...(config.argLog ? { EDGE_ARGS_LOG: argsLog } : {}),
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

function runError(args: string[], env?: NodeJS.ProcessEnv): string {
  try {
    run(args, env);
    assert.fail("expected command to fail");
  } catch (err: any) {
    return `${err?.stdout?.toString?.() ?? ""}${err?.stderr?.toString?.() ?? ""}`;
  }
}

describe("CLI — Edge Compute handoff", () => {
  it("help lists edge handoff commands", () => {
    const output = run(["help"]);
    assert.ok(output.includes("edge-doctor"));
    assert.ok(output.includes("setup-edge-mcp"));
    assert.ok(output.includes("setup-edge-webhook"));
  });

  it("capabilities JSON includes edge handoff and stateful actor entries", () => {
    const data = JSON.parse(run(["capabilities", "--json"]));
    const category = Object.keys(data.api_capabilities || {}).find((key) => key.includes("Edge Compute"));
    assert.ok(category);
    const commands = data.composite_commands.map((entry: any) => entry.name || entry.command || entry);
    assert.ok(commands.some((command: string) => command.includes("edge-doctor")));
    assert.ok(commands.some((command: string) => command.includes("setup-edge-mcp")));
    assert.ok(commands.some((command: string) => command.includes("setup-edge-webhook")));
    const actor = data.api_capabilities[category as string]
      .find((entry: { name: string }) => entry.name === "Stateful Actors");
    assert.ok(actor?.description.toLowerCase().includes("per-entity"));
  });

  it("edge-doctor requires positive auth and the root connectivity/status check", () => {
    const fake = withFakeEdgeCli({ auth: "api_key", rootStatus: "pass" });
    const data = JSON.parse(run(["edge-doctor", "--json"], fake.env));
    assert.equal(data.ready, true);
    assert.equal(data.telnyx_edge_installed, true);
    assert.equal(data.telnyx_edge_version, "v0.2.5");
    assert.equal(data.authenticated, true);
    assert.equal(data.auth_mode, "api_key");
    assert.equal(data.root_status_passed, true);
    assert.equal(data.api_key_auth_supported, true);
    assert.equal(data.new_func_from_dir_supported, true);
    assert.equal(data.secrets_add_supported, true);
    assert.equal(data.ship_supported, true);
    assert.equal(data.stateful_actors_supported, true);
    assert.equal(data.inspect_supported, true);
    assert.equal(data.actor_instances_supported, true);
    assert.equal(data.reset_func_supported, true);
    assert.equal(data.noninteractive_confirmation_supported, true);
    assert.equal(data.types_supported, true);
    assert.equal(data.kv_storage_supported, true);
    assert.equal(data.kv_key_management_supported, true);
    assert.equal(data.sql_databases_supported, true);
  });

  it("edge-doctor stays unready when root status exits zero but reports a failed check", () => {
    const fake = withFakeEdgeCli({ auth: "api_key", rootStatus: "fail" });
    const data = JSON.parse(run(["edge-doctor", "--json"], fake.env));
    assert.equal(data.authenticated, true);
    assert.equal(data.root_status_passed, false);
    assert.equal(data.ready, false);
    assert.ok(data.next_steps.some((step: string) => step.includes("telnyx-edge status")));
  });

  it("edge-doctor does not treat unknown auth output as authenticated", () => {
    const fake = withFakeEdgeCli({ auth: "unknown", rootStatus: "pass" });
    const data = JSON.parse(run(["edge-doctor", "--json"], fake.env));
    assert.equal(data.auth_mode, "unknown");
    assert.equal(data.authenticated, false);
    assert.equal(data.root_status_passed, true);
    assert.equal(data.ready, false);
  });

  it("edge-doctor rejects none and expired OAuth auth states", () => {
    for (const auth of ["none", "expired_oauth"] as const) {
      const fake = withFakeEdgeCli({ auth });
      const data = JSON.parse(run(["edge-doctor", "--json"], fake.env));
      assert.equal(data.authenticated, false);
      assert.equal(data.ready, false);
    }
  });

  it("edge-doctor probes inspect and actor instances instead of inferring from version", () => {
    const fake = withFakeEdgeCli({ auth: "api_key", inspect: false, actorInstances: false, argLog: true });
    const data = JSON.parse(run(["edge-doctor", "--json"], fake.env));
    assert.equal(data.telnyx_edge_version, "v0.2.5");
    assert.equal(data.inspect_supported, false);
    assert.equal(data.actor_instances_supported, false);
    const calls = readFileSync(fake.argsLog, "utf8").trim().split("\n").map((line) => JSON.parse(line));
    assert.ok(calls.some((args) => JSON.stringify(args) === JSON.stringify(["inspect", "--help"])));
    assert.ok(calls.some((args) => JSON.stringify(args) === JSON.stringify(["actors", "instances", "--help"])));
  });

  it("edge-doctor probes v0.3 capabilities conservatively instead of inferring from version", () => {
    const fake = withFakeEdgeCli({
      auth: "api_key",
      resetFunc: false,
      noninteractiveConfirmation: false,
      types: false,
      kvStorage: false,
      kvKeyManagement: false,
      sqlDatabases: false,
      argLog: true,
    });
    const data = JSON.parse(run(["edge-doctor", "--json"], fake.env));
    assert.equal(data.telnyx_edge_version, "v0.2.5");
    assert.equal(data.ready, true, "optional v0.3 capabilities do not block the core handoff");
    assert.equal(data.reset_func_supported, false);
    assert.equal(data.noninteractive_confirmation_supported, false);
    assert.equal(data.types_supported, false);
    assert.equal(data.kv_storage_supported, false);
    assert.equal(data.kv_key_management_supported, false);
    assert.equal(data.sql_databases_supported, false);
    assert.ok(data.next_steps.some((step: string) => step.includes("Optional capabilities not detected")));
    const calls = readFileSync(fake.argsLog, "utf8").trim().split("\n").map((line) => JSON.parse(line));
    for (const expected of [
      ["reset-func", "--help"],
      ["delete-func", "--help"],
      ["secrets", "add", "--help"],
      ["types", "--help"],
      ["storage", "kv", "--help"],
      ["storage", "kv", "key", "--help"],
      ["storage", "sqldb", "execute", "--help"],
    ]) {
      assert.ok(calls.some((args) => JSON.stringify(args) === JSON.stringify(expected)), `missing probe ${expected.join(" ")}`);
    }
  });

  it("probes reset-func --yes independently from delete-func --yes", () => {
    const deleteOnly = withFakeEdgeCli({
      resetFunc: true,
      resetNoninteractiveConfirmation: false,
      noninteractiveConfirmation: true,
    });
    const withoutResetYes = JSON.parse(run(["edge-doctor", "--json"], deleteOnly.env));
    assert.equal(withoutResetYes.noninteractive_confirmation_supported, true);
    assert.equal(withoutResetYes.reset_func_noninteractive_confirmation_supported, false);
    assert.ok(withoutResetYes.next_steps.some((step: string) => step.includes("reset-func <function-name>")));
    assert.ok(!withoutResetYes.next_steps.some((step: string) => step.includes("reset-func <function-name> --yes")));

    const resetOnly = withFakeEdgeCli({
      resetFunc: true,
      resetNoninteractiveConfirmation: true,
      noninteractiveConfirmation: false,
    });
    const withResetYes = JSON.parse(run(["edge-doctor", "--json"], resetOnly.env));
    assert.equal(withResetYes.noninteractive_confirmation_supported, false);
    assert.equal(withResetYes.reset_func_noninteractive_confirmation_supported, true);
    assert.ok(withResetYes.next_steps.some((step: string) => step.includes("reset-func <function-name> --yes")));
  });

  it("requires every capability emitted by setup handoffs", () => {
    for (const missing of ["newFuncFromDir", "secretsAdd", "ship"] as const) {
      const fake = withFakeEdgeCli({ auth: "api_key", [missing]: false });
      const doctor = JSON.parse(run(["edge-doctor", "--json"], fake.env));
      assert.equal(doctor.authenticated, true);
      assert.equal(doctor.root_status_passed, true);
      assert.equal(doctor.ready, false);
      assert.ok(doctor.next_steps.some((step: string) => step.includes("Upgrade telnyx-edge")));
      for (const command of ["setup-edge-mcp", "setup-edge-webhook"]) {
        const data = JSON.parse(run([command, "--json"], fake.env));
        assert.equal(data.ready, false, `${command} must reject missing ${missing}`);
        assert.equal(data.root_status_passed, true);
        assert.equal(data[missing === "newFuncFromDir" ? "new_func_from_dir_supported" : missing === "secretsAdd" ? "secrets_add_supported" : "ship_supported"], false);
        assert.ok(data.next_steps.some((step: string) => step.includes("Upgrade telnyx-edge")));
      }
    }
  });

  it("setup handoffs require the root status success marker", () => {
    const fake = withFakeEdgeCli({ auth: "api_key", rootStatus: "fail" });
    for (const command of ["setup-edge-mcp", "setup-edge-webhook"]) {
      const data = JSON.parse(run([command, "--json"], fake.env));
      assert.equal(data.authenticated, true);
      assert.equal(data.root_status_passed, false);
      assert.equal(data.ready, false);
      assert.ok(data.next_steps.some((step: string) => step.includes("telnyx-edge status")));
    }
  });

  it("setup-edge-mcp emits a repository-aware secure build/deploy/inspect flow", () => {
    const fake = withFakeEdgeCli("api_key");
    const output = run(["setup-edge-mcp", "--json", "--name", "demo-mcp"], {
      ...fake.env,
      SHARED_SECRET: "must-not-appear-in-output",
    });
    const data = JSON.parse(output);
    assert.equal(data.ready, true);
    assert.equal(data.telnyx_edge_installed, true);
    assert.equal(data.root_status_passed, true);
    assert.equal(data.new_func_from_dir_supported, true);
    assert.equal(data.secrets_add_supported, true);
    assert.equal(data.ship_supported, true);
    assert.equal(data.inspect_supported, true);
    assert.equal(data.actor_instances_supported, true);
    assert.equal(data.source_repo, "https://github.com/team-telnyx/edge-compute.git");
    assert.equal(data.source_path, "examples/ts/mcp-server");
    assert.ok(data.deploy_command.includes("git clone --depth 1"));
    assert.ok(data.deploy_command.includes("npm install"));
    assert.ok(data.deploy_command.includes("npm run build"));
    assert.ok(data.deploy_command.includes('secrets add TELNYX_API_KEY "$TELNYX_API_KEY"'));
    assert.ok(data.deploy_command.includes('secrets add SHARED_SECRET "$SHARED_SECRET"'));
    assert.ok(data.deploy_command.includes("telnyx-edge ship"));
    assert.ok(data.deploy_command.includes("telnyx-edge inspect demo-mcp"));
    assert.ok(!data.deploy_command.includes("<your-api-key>"));
    assert.ok(data.next_steps.some((step: string) => step.includes("Authorization: Bearer $SHARED_SECRET")));
    assert.ok(!data.next_steps.some((step: string) => step.includes("Bearer ***")));
    assert.ok(!output.includes("must-not-appear-in-output"));
  });

  it("setup-edge-webhook emits a repository-aware HMAC-secured deploy/inspect flow", () => {
    const fake = withFakeEdgeCli("api_key");
    const data = JSON.parse(run(["setup-edge-webhook", "--json", "--name", "demo-webhook"], fake.env));
    assert.equal(data.ready, true);
    assert.equal(data.source_path, "examples/js/webhook-receiver");
    assert.ok(data.deploy_command.includes("git clone --depth 1"));
    assert.ok(data.deploy_command.includes('secrets add WEBHOOK_SECRET "$WEBHOOK_SECRET"'));
    assert.ok(data.deploy_command.includes("telnyx-edge ship"));
    assert.ok(data.deploy_command.includes("telnyx-edge inspect demo-webhook"));
    assert.ok(data.notes.some((note: string) => note.includes("HMAC-SHA256")));
    assert.ok(data.next_steps.some((step: string) => step.includes("HMAC-sign")));
  });

  it("setup handoffs omit inspect from executable flows when the authenticated CLI does not support it", () => {
    const fake = withFakeEdgeCli({ auth: "api_key", inspect: false });
    for (const [command, name] of [
      ["setup-edge-mcp", "demo-mcp"],
      ["setup-edge-webhook", "demo-webhook"],
    ]) {
      const data = JSON.parse(run([command, "--json", "--name", name], fake.env));
      assert.equal(data.authenticated, true);
      assert.equal(data.ready, true);
      assert.equal(data.inspect_supported, false);
      assert.ok(data.deploy_command.includes("telnyx-edge ship"));
      assert.ok(!data.deploy_command.includes("telnyx-edge inspect"));
      assert.ok(!data.setup_commands.some((step: string) => step.includes("telnyx-edge inspect")));
    }
  });

  it("setup handoffs conservatively reject unknown auth output", () => {
    const fake = withFakeEdgeCli({ auth: "unknown" });
    for (const command of ["setup-edge-mcp", "setup-edge-webhook"]) {
      const data = JSON.parse(run([command, "--json"], fake.env));
      assert.equal(data.authenticated, false);
      assert.equal(data.auth_mode, "unknown");
      assert.equal(data.ready, false);
    }
  });

  it("validates Edge function names before building shell commands", () => {
    const fake = withFakeEdgeCli("api_key");
    const leadingDash = runError(["setup-edge-mcp", "--json", "--name", "-bad"], fake.env);
    assert.match(leadingDash, /Invalid Edge function name/);
    const injection = runError(["setup-edge-webhook", "--json", "--name", "bad;touch-pwned"], fake.env);
    assert.match(injection, /Invalid Edge function name/);
    const tooLong = runError(["setup-edge-mcp", "--json", "--name", "a".repeat(65)], fake.env);
    assert.match(tooLong, /1–64/);
  });
});
