/**
 * telnyx-agent setup-edge-webhook — Thin executable handoff for webhook-on-Edge.
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

interface SetupEdgeWebhookResult {
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
const WEBHOOK_SOURCE_PATH = "examples/js/webhook-receiver";

export async function setupEdgeWebhookCommand(flags: Record<string, string | boolean>): Promise<void> {
  const jsonOutput = flags.json === true;
  const name = (flags.name as string) || "my-webhook-receiver";
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
    `: "\${WEBHOOK_SECRET:?Export a high-entropy WEBHOOK_SECRET before running this flow}"`,
    `EDGE_COMPUTE_SRC="$(mktemp -d)/edge-compute"`,
    `git clone --depth 1 "${SOURCE_REPO}" "$EDGE_COMPUTE_SRC"`,
    `telnyx-edge new-func --from-dir="$EDGE_COMPUTE_SRC/${WEBHOOK_SOURCE_PATH}" --name=${name}`,
    `cd ${name}`,
    `telnyx-edge secrets add WEBHOOK_SECRET "$WEBHOOK_SECRET"`,
    "telnyx-edge ship",
    `telnyx-edge inspect ${name}`,
  ];
  const deployCommand = setupCommands.join(" && ");

  const notes = [
    "The source path is inside a team-telnyx/edge-compute checkout; this flow clones that repository before using --from-dir.",
    "WEBHOOK_SECRET enables HMAC-SHA256 verification of the x-webhook-signature header; do not deploy production webhook ingress without it.",
    "Keep WEBHOOK_SECRET in an environment variable or secret manager and configure the webhook producer with the same key.",
    "Sign the exact request bytes and send x-webhook-signature as sha256=<hex digest>; reject requests whose HMAC does not verify.",
  ];
  if (!inspectSupported && hasEdge) {
    notes.push("This installed CLI did not expose inspect --help; upgrade telnyx-edge before running the final inspect step.");
  }
  if (statefulActorsSupported) {
    notes.push("For per-entity webhook state, actor scaffolding is available via telnyx-edge new-func --actor --language ts.");
  }
  if (actorInstancesSupported) {
    notes.push("Persisted actor instance metadata can be listed with telnyx-edge actors instances <type>.");
  }

  const nextSteps = !hasEdge
    ? ["Install telnyx-edge from the Edge Compute releases page, then rerun this command."]
    : !authStatus.authenticated
      ? [`Authenticate first: ${authCommand}`, "Run telnyx-edge status, then rerun this handoff."]
      : [
          "Export a high-entropy WEBHOOK_SECRET (for example: export WEBHOOK_SECRET=\"$(openssl rand -hex 32)\").",
          "Run deploy_command from the directory where you want the function project created.",
          "Configure the producer with the same secret and HMAC-sign the exact payload bytes before sending.",
        ];

  const result: SetupEdgeWebhookResult = {
    ready: hasEdge && authStatus.authenticated,
    telnyx_edge_installed: hasEdge,
    authenticated: authStatus.authenticated,
    auth_mode: authStatus.mode,
    api_key_auth_supported: apiKeyAuthSupported,
    stateful_actors_supported: statefulActorsSupported,
    inspect_supported: inspectSupported,
    actor_instances_supported: actorInstancesSupported,
    source_repo: SOURCE_REPO,
    source_path: WEBHOOK_SOURCE_PATH,
    example: WEBHOOK_SOURCE_PATH,
    auth_command: authCommand,
    deploy_command: deployCommand,
    setup_commands: setupCommands,
    prerequisites: [
      "Install telnyx-edge and git",
      `Authenticate with: ${authCommand}`,
      "Export a high-entropy WEBHOOK_SECRET without committing it",
      "Configure the webhook producer to generate HMAC-SHA256 signatures with the same secret",
    ],
    next_steps: nextSteps,
    notes,
  };

  if (jsonOutput) {
    outputJson(result);
    return;
  }

  if (result.ready) {
    printSuccess("Edge webhook handoff is ready", {
      Source: `${SOURCE_REPO}#${WEBHOOK_SOURCE_PATH}`,
      Auth: authStatus.mode,
      HMAC: "WEBHOOK_SECRET required",
      Ready: "✓",
    });
  } else {
    printError(hasEdge ? "telnyx-edge is not positively authenticated." : "telnyx-edge is not installed.");
    printWarning(hasEdge
      ? `Authenticate first with: ${authCommand}`
      : "This command is a handoff helper — it depends on the dedicated Edge Compute CLI.");
  }

  console.log(`  Source repository: ${SOURCE_REPO}`);
  console.log(`  Source path: ${WEBHOOK_SOURCE_PATH}`);
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
