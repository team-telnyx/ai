/**
 * telnyx-agent setup-edge-webhook — Thin executable handoff for webhook-on-Edge.
 */

import { outputJson, printError, printSuccess, printWarning } from "../utils/output.ts";
import { getEdgeAuthStatus, hasEdgeCli, supportsApiKeyAuth } from "../edge-cli.ts";

interface SetupEdgeWebhookResult {
  ready: boolean;
  authenticated: boolean;
  auth_mode: "api_key" | "oauth" | "none" | "unknown";
  api_key_auth_supported: boolean;
  example: string;
  auth_command: string;
  deploy_command: string;
  prerequisites: string[];
  notes: string[];
}

const WEBHOOK_EXAMPLE = "examples/js/webhook-receiver";

export async function setupEdgeWebhookCommand(flags: Record<string, string | boolean>): Promise<void> {
  const jsonOutput = flags.json === true;
  const name = (flags.name as string) || "my-webhook-receiver";

  const hasEdge = hasEdgeCli();
  const apiKeyAuthSupported = hasEdge ? supportsApiKeyAuth() : false;
  const authStatus = hasEdge ? safeAuthStatus() : { authenticated: false, mode: "none" as const };
  const authCommand = apiKeyAuthSupported
    ? "telnyx-edge auth api-key set <your-api-key>"
    : "telnyx-edge auth login";
  const deployCommand = `telnyx-edge new-func --from-dir=${WEBHOOK_EXAMPLE} --name=${name} && cd ${name} && telnyx-edge ship`;

  const result: SetupEdgeWebhookResult = {
    ready: hasEdge && authStatus.authenticated,
    authenticated: authStatus.authenticated,
    auth_mode: authStatus.mode,
    api_key_auth_supported: apiKeyAuthSupported,
    example: WEBHOOK_EXAMPLE,
    auth_command: authCommand,
    deploy_command: deployCommand,
    prerequisites: [
      "Install telnyx-edge",
      `Authenticate with ${authCommand}`,
      "Start from the webhook receiver example",
    ],
    notes: [
      "Use this when your AI workflow needs an HTTP ingress point at the edge.",
      "The deployed function lifecycle plus actors, inspect, storage sqldb, and generated types are still owned by telnyx-edge.",
      "After deploy, point your webhook-producing system at the Edge endpoint and let team-telnyx/ai handle orchestration guidance.",
    ],
  };

  if (jsonOutput) {
    outputJson(result);
    return;
  }

  if (result.ready) {
    printSuccess("Edge webhook handoff is ready", {
      Example: WEBHOOK_EXAMPLE,
      Auth: authStatus.mode,
      Ready: "✓",
    });
  } else {
    printError(hasEdge ? "telnyx-edge is not authenticated." : "telnyx-edge is not installed.");
    printWarning(hasEdge
      ? `Authenticate first with: ${authCommand}`
      : "This command is a handoff helper — it depends on the dedicated Edge Compute CLI.");
  }

  console.log(`  Example template: ${WEBHOOK_EXAMPLE}`);
  console.log(`  Auth step: ${authCommand}`);
  console.log(`  Suggested flow: ${deployCommand}`);
  console.log("\n  Notes:");
  for (const note of result.notes) {
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
