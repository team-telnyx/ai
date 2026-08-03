/**
 * telnyx-agent setup-edge-mcp — Thin executable handoff for MCP-on-Edge.
 */

import { outputJson, printError, printSuccess, printWarning } from "../utils/output.ts";
import {
  getEdgeAuthStatus,
  getEdgeRootStatus,
  hasEdgeCli,
  supportsActorInstances,
  supportsApiKeyAuth,
  supportsInspect,
  supportsNewFuncFromDir,
  supportsSecretsAdd,
  supportsShip,
  supportsStatefulActors,
  validateEdgeFunctionName,
} from "../edge-cli.ts";

interface SetupEdgeMcpResult {
  ready: boolean;
  telnyx_edge_installed: boolean;
  authenticated: boolean;
  auth_mode: "api_key" | "oauth" | "none" | "unknown";
  root_status_passed: boolean;
  api_key_auth_supported: boolean;
  new_func_from_dir_supported: boolean;
  secrets_add_supported: boolean;
  ship_supported: boolean;
  stateful_actors_supported: boolean;
  inspect_supported: boolean;
  actor_instances_supported: boolean;
  source_repo: string;
  source_path: string;
  example: string;
  auth_command: string;
  deploy_command: string;
  setup_commands: string[];
  prerequisites: string[];
  next_steps: string[];
  notes: string[];
}

const SOURCE_REPO = "https://github.com/team-telnyx/edge-compute.git";
const MCP_SOURCE_PATH = "examples/ts/mcp-server";

export async function setupEdgeMcpCommand(flags: Record<string, string | boolean>): Promise<void> {
  const jsonOutput = flags.json === true;
  const name = (flags.name as string) || "my-mcp-server";
  validateEdgeFunctionName(name);

  const hasEdge = hasEdgeCli();
  const apiKeyAuthSupported = hasEdge ? supportsApiKeyAuth() : false;
  const newFuncFromDirSupported = hasEdge ? supportsNewFuncFromDir() : false;
  const secretsAddSupported = hasEdge ? supportsSecretsAdd() : false;
  const shipSupported = hasEdge ? supportsShip() : false;
  const statefulActorsSupported = hasEdge ? supportsStatefulActors() : false;
  const inspectSupported = hasEdge ? supportsInspect() : false;
  const actorInstancesSupported = hasEdge ? supportsActorInstances() : false;
  const authStatus = hasEdge ? safeAuthStatus() : { authenticated: false, mode: "none" as const };
  const rootStatusPassed = hasEdge ? safeRootStatus() : false;
  const mandatoryCapabilitiesSupported = newFuncFromDirSupported && secretsAddSupported && shipSupported;
  const authCommand = apiKeyAuthSupported
    ? `: "\${TELNYX_API_KEY:?Export TELNYX_API_KEY first}" && telnyx-edge auth api-key set "$TELNYX_API_KEY"`
    : "telnyx-edge auth login";

  const setupCommands = [
    `: "\${TELNYX_API_KEY:?Export TELNYX_API_KEY before running this flow}"`,
    `: "\${SHARED_SECRET:?Export SHARED_SECRET before running this flow (generate one with openssl rand -hex 32)}"`,
    `EDGE_COMPUTE_SRC="$(mktemp -d)/edge-compute"`,
    `git clone --depth 1 "${SOURCE_REPO}" "$EDGE_COMPUTE_SRC"`,
    `telnyx-edge new-func --from-dir="$EDGE_COMPUTE_SRC/${MCP_SOURCE_PATH}" --name=${name}`,
    `cd ${name}`,
    "npm install",
    "npm run build",
    `telnyx-edge secrets add TELNYX_API_KEY "$TELNYX_API_KEY"`,
    `telnyx-edge secrets add SHARED_SECRET "$SHARED_SECRET"`,
    "telnyx-edge ship",
  ];
  if (inspectSupported) {
    setupCommands.push(`telnyx-edge inspect ${name}`);
  }
  const deployCommand = setupCommands.join(" && ");

  const notes = [
    "The source path is inside a team-telnyx/edge-compute checkout; this flow clones that repository before using --from-dir.",
    "SHARED_SECRET is required inbound bearer authentication. Never expose this MCP endpoint without it.",
    "Keep TELNYX_API_KEY and SHARED_SECRET in environment variables or a secret manager; do not paste their values into source or logs.",
    `The flow installs dependencies, builds TypeScript, adds both runtime secrets, and ships the function${inspectSupported ? ", then inspects the deployment" : ""}.`,
  ];
  if (!inspectSupported && hasEdge) {
    notes.push("This installed CLI did not expose inspect --help; upgrade telnyx-edge to inspect the function after deployment.");
  }
  if (hasEdge && !mandatoryCapabilitiesSupported) {
    notes.push("The suggested flow is shown for handoff purposes, but this CLI did not expose every command it emits; do not run it until the missing capabilities are installed.");
  }
  if (statefulActorsSupported) {
    notes.push("For per-user state, actor scaffolding is available via telnyx-edge new-func --actor --language ts.");
  }
  if (actorInstancesSupported) {
    notes.push("Persisted actor instance metadata can be listed with telnyx-edge actors instances <type>.");
  }

  const nextSteps = !hasEdge
    ? ["Install telnyx-edge from the Edge Compute releases page, then rerun this command."]
    : !authStatus.authenticated
      ? [`Authenticate first: ${authCommand}`, "Run telnyx-edge status, then rerun this handoff."]
      : !rootStatusPassed
        ? [
            "Run telnyx-edge status and resolve every failed config, credential, or connectivity check.",
            "Rerun this handoff only after status prints 'All checks passed - CLI is ready to use'.",
          ]
        : !mandatoryCapabilitiesSupported
          ? [
              `Upgrade telnyx-edge; this flow requires ${missingCapabilities(newFuncFromDirSupported, secretsAddSupported, shipSupported).join(", ")}.`,
              "Verify the missing commands on their own --help surfaces, then rerun this handoff.",
            ]
          : [
              "Export TELNYX_API_KEY and a high-entropy SHARED_SECRET (for example, openssl rand -hex 32).",
              "Run deploy_command from the directory where you want the function project created.",
              `Configure the MCP client to send Authorization: Bearer *** to the ${inspectSupported ? "inspected" : "deployed function's"} invoke URL.`,
            ];

  const result: SetupEdgeMcpResult = {
    ready: hasEdge && authStatus.authenticated && rootStatusPassed && mandatoryCapabilitiesSupported,
    telnyx_edge_installed: hasEdge,
    authenticated: authStatus.authenticated,
    auth_mode: authStatus.mode,
    root_status_passed: rootStatusPassed,
    api_key_auth_supported: apiKeyAuthSupported,
    new_func_from_dir_supported: newFuncFromDirSupported,
    secrets_add_supported: secretsAddSupported,
    ship_supported: shipSupported,
    stateful_actors_supported: statefulActorsSupported,
    inspect_supported: inspectSupported,
    actor_instances_supported: actorInstancesSupported,
    source_repo: SOURCE_REPO,
    source_path: MCP_SOURCE_PATH,
    example: MCP_SOURCE_PATH,
    auth_command: authCommand,
    deploy_command: deployCommand,
    setup_commands: setupCommands,
    prerequisites: [
      "Install telnyx-edge and git",
      `Authenticate with: ${authCommand}`,
      "Have Node.js/npm available for the TypeScript install and build",
      "Export TELNYX_API_KEY and SHARED_SECRET without committing either value",
    ],
    next_steps: nextSteps,
    notes,
  };

  if (jsonOutput) {
    outputJson(result);
    return;
  }

  if (result.ready) {
    printSuccess("Edge MCP handoff is ready", {
      Source: `${SOURCE_REPO}#${MCP_SOURCE_PATH}`,
      Auth: authStatus.mode,
      Ready: "✓",
    });
  } else {
    printError(!hasEdge
      ? "telnyx-edge is not installed."
      : !authStatus.authenticated
        ? "telnyx-edge is not positively authenticated."
        : !rootStatusPassed
          ? "telnyx-edge status did not pass every readiness check."
          : "telnyx-edge lacks commands required by this setup flow.");
    printWarning(!hasEdge
      ? "This command is a handoff helper — it depends on the dedicated Edge Compute CLI."
      : !authStatus.authenticated
        ? `Authenticate first with: ${authCommand}`
        : nextSteps[0]);
  }

  console.log(`  Source repository: ${SOURCE_REPO}`);
  console.log(`  Source path: ${MCP_SOURCE_PATH}`);
  console.log(`  Auth step: ${authCommand}`);
  console.log("  Suggested executable flow:");
  for (const command of setupCommands) {
    console.log(`    ${command}`);
  }
  console.log("\n  Next steps:");
  for (const step of nextSteps) {
    console.log(`    - ${step}`);
  }
  console.log("\n  Notes:");
  for (const note of notes) {
    console.log(`    - ${note}`);
  }
  console.log();
}

function safeAuthStatus(): { authenticated: boolean; mode: "api_key" | "oauth" | "none" | "unknown" } {
  try {
    const status = getEdgeAuthStatus();
    return { authenticated: status.authenticated, mode: status.mode };
  } catch {
    return { authenticated: false, mode: "unknown" };
  }
}

function safeRootStatus(): boolean {
  try {
    return getEdgeRootStatus().passed;
  } catch {
    return false;
  }
}

function missingCapabilities(fromDir: boolean, secretsAdd: boolean, ship: boolean): string[] {
  return [
    !fromDir && "new-func --from-dir",
    !secretsAdd && "secrets add <key> <value>",
    !ship && "ship",
  ].filter((value): value is string => Boolean(value));
}
