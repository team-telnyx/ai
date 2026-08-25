/**
 * telnyx-agent setup-edge-webhook — Thin executable handoff for webhook-on-Edge.
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

interface SetupEdgeWebhookResult {
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
const WEBHOOK_SOURCE_PATH = "examples/js/webhook-receiver";

export async function setupEdgeWebhookCommand(flags: Record<string, string | boolean>): Promise<void> {
  const jsonOutput = flags.json === true;
  const name = (flags.name as string) || "my-webhook-receiver";
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
    `: "\${WEBHOOK_SECRET:?Export a high-entropy WEBHOOK_SECRET before running this flow}"`,
    `EDGE_COMPUTE_SRC="$(mktemp -d)/edge-compute"`,
    `git clone --depth 1 "${SOURCE_REPO}" "$EDGE_COMPUTE_SRC"`,
    `telnyx-edge new-func --from-dir="$EDGE_COMPUTE_SRC/${WEBHOOK_SOURCE_PATH}" --name=${name}`,
    `cd ${name}`,
    `telnyx-edge secrets add WEBHOOK_SECRET "$WEBHOOK_SECRET"`,
    "telnyx-edge ship",
  ];
  if (inspectSupported) {
    setupCommands.push(`telnyx-edge inspect ${name}`);
  }
  const deployCommand = setupCommands.join(" && ");

  const notes = [
    "The source path is inside a team-telnyx/edge-compute checkout; this flow clones that repository before using --from-dir.",
    "WEBHOOK_SECRET enables HMAC-SHA256 verification of the x-webhook-signature header; do not deploy production webhook ingress without it.",
    "Keep WEBHOOK_SECRET in an environment variable or secret manager and configure the webhook producer with the same key.",
    "Sign the exact request bytes and send x-webhook-signature as sha256=<hex digest>; reject requests whose HMAC does not verify.",
  ];
  if (!inspectSupported && hasEdge) {
    notes.push("This installed CLI did not expose inspect --help; upgrade telnyx-edge to inspect the function after deployment.");
  }
  if (hasEdge && !mandatoryCapabilitiesSupported) {
    notes.push("The suggested flow is shown for handoff purposes, but this CLI did not expose every command it emits; do not run it until the missing capabilities are installed.");
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
              "Export a high-entropy WEBHOOK_SECRET (for example: export WEBHOOK_SECRET=\"$(openssl rand -hex 32)\").",
              "Run deploy_command from the directory where you want the function project created.",
              "Configure the producer with the same secret and HMAC-sign the exact payload bytes before sending.",
            ];

  const result: SetupEdgeWebhookResult = {
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
