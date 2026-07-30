/**
 * telnyx-agent edge-doctor — Validate local Edge Compute prerequisites.
 *
 * Thin handoff only: this does not deploy or manage Edge Compute directly.
 * It checks that the dedicated `telnyx-edge` CLI is available and whether
 * it is authenticated, preferring API-key auth for agent use.
 */

import { outputJson, printError, printSuccess, printWarning } from "../utils/output.ts";
import { getEdgeAuthStatus, getEdgeCommandSurface, getEdgeHelp, hasEdgeCli, supportsApiKeyAuth } from "../edge-cli.ts";

interface EdgeDoctorResult {
  ready: boolean;
  telnyx_edge_installed: boolean;
  telnyx_edge_version: string | null;
  authenticated: boolean;
  auth_mode: "api_key" | "oauth" | "none" | "unknown";
  api_key_auth_supported: boolean;
  edge_command_surface: string[];
  checks: Array<{ name: string; ok: boolean; detail: string }>;
  next_steps: string[];
}

export async function edgeDoctorCommand(flags: Record<string, string | boolean>): Promise<void> {
  const jsonOutput = flags.json === true;

  const checks: EdgeDoctorResult["checks"] = [];
  let installed = false;
  let version: string | null = null;
  let authenticated = false;
  let authMode: EdgeDoctorResult["auth_mode"] = "none";
  let apiKeyAuthSupported = false;
  let edgeCommandSurface: string[] = [];

  try {
    const out = getEdgeHelp();
    installed = hasEdgeCli();
    version = extractVersion(out) ?? "installed";
    checks.push({ name: "telnyx-edge installed", ok: true, detail: version });
  } catch (err: any) {
    const detail = err?.code === "ENOENT"
      ? "telnyx-edge not found on PATH"
      : (err?.stderr?.toString?.() || err?.message || "failed to execute telnyx-edge");
    checks.push({ name: "telnyx-edge installed", ok: false, detail });
  }

  if (installed) {
    edgeCommandSurface = getEdgeCommandSurface();
    apiKeyAuthSupported = supportsApiKeyAuth();
    checks.push({
      name: "API-key auth supported",
      ok: apiKeyAuthSupported,
      detail: apiKeyAuthSupported ? "auth api-key set is available" : "no auth api-key set support detected",
    });
    checks.push({
      name: "Detected Edge command surface",
      ok: edgeCommandSurface.length > 0,
      detail: edgeCommandSurface.length > 0 ? edgeCommandSurface.join(", ") : "no commands parsed from --help output",
    });

    try {
      const status = getEdgeAuthStatus();
      authenticated = status.authenticated;
      authMode = status.mode;
      checks.push({
        name: "Authenticated",
        ok: authenticated,
        detail: authenticated ? `mode: ${authMode}` : "not authenticated",
      });
    } catch (err: any) {
      checks.push({
        name: "Authenticated",
        ok: false,
        detail: err?.stderr?.toString?.() || err?.message || "failed to read auth status",
      });
    }
  }

  const ready = installed && authenticated;

  let nextSteps: string[];
  if (!installed) {
    nextSteps = [
      "Install the dedicated Edge Compute CLI from team-telnyx/edge-compute releases.",
      "Then authenticate: telnyx-edge auth api-key set <your-api-key> (preferred) or telnyx-edge auth login",
      "Then start from a real example such as examples/ts/mcp-server or examples/js/webhook-receiver.",
    ];
  } else if (!authenticated) {
    nextSteps = apiKeyAuthSupported
      ? [
          "Authenticate non-interactively: telnyx-edge auth api-key set <your-api-key>",
          "Verify with: telnyx-edge auth status",
          "Then start from a real example and deploy with telnyx-edge ship.",
        ]
      : [
          "Authenticate with: telnyx-edge auth login",
          "Verify with: telnyx-edge auth status",
          "Then start from a real example and deploy with telnyx-edge ship.",
        ];
  } else {
    nextSteps = [
      "Start from a real example: telnyx-edge new-func --from-dir=examples/ts/mcp-server --name=my-mcp-server",
      "Deploy with: telnyx-edge ship",
      "Then connect the exposed HTTP or MCP boundary back into your AI workflow.",
    ];
  }

  const result: EdgeDoctorResult = {
    ready,
    telnyx_edge_installed: installed,
    telnyx_edge_version: version,
    authenticated,
    auth_mode: authMode,
    api_key_auth_supported: apiKeyAuthSupported,
    edge_command_surface: edgeCommandSurface,
    checks,
    next_steps: nextSteps,
  };

  if (jsonOutput) {
    outputJson(result);
    return;
  }

  if (ready) {
    printSuccess("Edge Compute handoff is ready", {
      "telnyx-edge": version ?? "installed",
      Auth: authMode,
      Ready: "✓",
    });
  } else {
    printError("Edge Compute handoff is not ready yet.");
    if (!installed) {
      printWarning("Install telnyx-edge first — team-telnyx/ai does not own Edge lifecycle directly.");
    } else if (!authenticated) {
      printWarning(apiKeyAuthSupported
        ? "telnyx-edge is installed but not authenticated. Prefer API-key auth for agents."
        : "telnyx-edge is installed but not authenticated.");
    }
  }

  console.log("  Checks:");
  for (const check of checks) {
    console.log(`    ${check.ok ? "✓" : "✗"} ${check.name}: ${check.detail}`);
  }
  console.log("\n  Next steps:");
  for (const step of nextSteps) {
    console.log(`    - ${step}`);
  }
  console.log();
}

function extractVersion(text: string): string | null {
  const match = text.match(/v?\d+\.\d+\.\d+/);
  return match?.[0] ?? null;
}
