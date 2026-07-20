/**
 * telnyx-agent setup-edge-mcp — Thin executable handoff for MCP-on-Edge.
 */

import { outputJson, printError, printSuccess, printWarning } from "../utils/output.ts";
import {
  getEdgeAuthStatus,
  hasEdgeCli,
  supportsActorInstances,
  supportsApiKeyAuth,
  supportsInspect,
  supportsStatefulActors,
  validateEdgeFunctionName,
} from "../edge-cli.ts";

interface SetupEdgeMcpResult {
  ready: boolean;
  telnyx_edge_installed: boolean;
  authenticated: boolean;
  auth_mode: "api_key" | "oauth" | "none" | "unknown";
  api_key_auth_supported: boolean;
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
  const statefulActorsSupported = hasEdge ? supportsStatefulActors() : false;
  const inspectSupported = hasEdge ? supportsInspect() : false;
  const actorInstancesSupported = hasEdge ? supportsActorInstances() : false;
  const authStatus = hasEdge ? safeAuthStatus() : { authenticated: false, mode: "none" as const };
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
    `telnyx-edge inspect ${name}`,
  ];
  const deployCommand = setupCommands.join(" && ");

  const notes = [
    "The source path is inside a team-telnyx/edge-compute checkout; this flow clones that repository before using --from-dir.",
    "SHARED_SECRET is required inbound bearer authentication. Never expose this MCP endpoint without it.",
    "Keep TELNYX_API_KEY and SHARED_SECRET in environment variables or a secret manager; do not paste their values into source or logs.",
    "The flow installs dependencies, builds TypeScript, adds both runtime secrets, ships, and inspects the deployed function.",
  ];
  if (!inspectSupported && hasEdge) {
    notes.push("This installed CLI did not expose inspect --help; upgrade telnyx-edge before running the final inspect step.");
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
      : [
          "Export TELNYX_API_KEY and a high-entropy SHARED_SECRET (for example, openssl rand -hex 32).",
          "Run deploy_command from the directory where you want the function project created.",
          "Configure the MCP client to send Authorization: Bearer <SHARED_SECRET> to the inspected invoke URL.",
        ];

  const result: SetupEdgeMcpResult = {
    ready: hasEdge && authStatus.authenticated,
    telnyx_edge_installed: hasEdge,
    authenticated: authStatus.authenticated,
    auth_mode: authStatus.mode,
    api_key_auth_supported: apiKeyAuthSupported,
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
    printError(hasEdge ? "telnyx-edge is not positively authenticated." : "telnyx-edge is not installed.");
    printWarning(hasEdge
      ? `Authenticate first with: ${authCommand}`
      : "This command is a handoff helper — it depends on the dedicated Edge Compute CLI.");
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
