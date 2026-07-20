/**
 * telnyx-agent edge-doctor — Validate local Edge Compute prerequisites.
 *
 * Thin handoff only: this does not deploy or manage Edge Compute directly.
 */

import { outputJson, printError, printSuccess, printWarning } from "../utils/output.ts";
import {
  getEdgeAuthStatus,
  getEdgeHelp,
  getEdgeRootStatus,
  getEdgeVersion,
  supportsActorInstances,
  supportsApiKeyAuth,
  supportsInspect,
  supportsStatefulActors,
} from "../edge-cli.ts";

interface EdgeDoctorResult {
  ready: boolean;
  telnyx_edge_installed: boolean;
  telnyx_edge_version: string | null;
  authenticated: boolean;
  auth_mode: "api_key" | "oauth" | "none" | "unknown";
  root_status_passed: boolean;
  api_key_auth_supported: boolean;
  stateful_actors_supported: boolean;
  inspect_supported: boolean;
  actor_instances_supported: boolean;
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
  let rootStatusPassed = false;
  let apiKeyAuthSupported = false;
  let statefulActorsSupported = false;
  let inspectSupported = false;
  let actorInstancesSupported = false;

  try {
    getEdgeHelp();
    installed = true;
    version = getEdgeVersion();
    checks.push({
      name: "telnyx-edge installed",
      ok: true,
      detail: version ?? "installed (version unavailable)",
    });
  } catch (err: any) {
    const detail = err?.code === "ENOENT"
      ? "telnyx-edge not found on PATH"
      : (err?.stderr?.toString?.() || err?.message || "failed to execute telnyx-edge");
    checks.push({ name: "telnyx-edge installed", ok: false, detail });
  }

  if (installed) {
    apiKeyAuthSupported = supportsApiKeyAuth();
    statefulActorsSupported = supportsStatefulActors();
    inspectSupported = supportsInspect();
    actorInstancesSupported = supportsActorInstances();

    checks.push({
      name: "API-key auth supported",
      ok: apiKeyAuthSupported,
      detail: apiKeyAuthSupported ? "auth api-key set is available" : "no auth api-key set support detected",
    });
    checks.push({
      name: "Stateful actors supported",
      ok: statefulActorsSupported,
      detail: statefulActorsSupported
        ? "new-func --actor is available"
        : "new-func --actor was not detected",
    });
    checks.push({
      name: "Function inspect supported",
      ok: inspectSupported,
      detail: inspectSupported ? "inspect <function> is available" : "inspect --help capability not detected",
    });
    checks.push({
      name: "Actor instances supported",
      ok: actorInstancesSupported,
      detail: actorInstancesSupported
        ? "actors instances <type> is available"
        : "actors instances --help capability not detected (added in telnyx-edge v0.2.5)",
    });

    try {
      const status = getEdgeAuthStatus();
      authenticated = status.authenticated;
      authMode = status.mode;
      checks.push({
        name: "Positively authenticated",
        ok: authenticated,
        detail: authenticated
          ? `mode: ${authMode}`
          : authMode === "unknown"
            ? "auth status output was not recognized as an authenticated state"
            : `not authenticated (mode: ${authMode})`,
      });
    } catch (err: any) {
      authMode = "unknown";
      checks.push({
        name: "Positively authenticated",
        ok: false,
        detail: err?.stderr?.toString?.() || err?.message || "failed to read auth status",
      });
    }

    try {
      const status = getEdgeRootStatus();
      rootStatusPassed = status.passed;
      checks.push({
        name: "CLI config, credentials, and connectivity",
        ok: rootStatusPassed,
        detail: rootStatusPassed
          ? "telnyx-edge status: all checks passed"
          : "telnyx-edge status did not report that all checks passed",
      });
    } catch (err: any) {
      checks.push({
        name: "CLI config, credentials, and connectivity",
        ok: false,
        detail: err?.stderr?.toString?.() || err?.message || "telnyx-edge status failed",
      });
    }
  }

  const ready = installed && authenticated && rootStatusPassed;
  let nextSteps: string[];
  if (!installed) {
    nextSteps = [
      "Install telnyx-edge from https://github.com/team-telnyx/edge-compute/releases.",
      "Authenticate: telnyx-edge auth api-key set <your-api-key> (non-interactive) or telnyx-edge auth login.",
      "Run telnyx-agent edge-doctor again.",
    ];
  } else if (!authenticated) {
    nextSteps = apiKeyAuthSupported
      ? [
          "Authenticate non-interactively: telnyx-edge auth api-key set <your-api-key>",
          "Confirm the positive marker with: telnyx-edge auth status",
          "Validate credentials and connectivity with: telnyx-edge status",
        ]
      : [
          "Authenticate with: telnyx-edge auth login",
          "Confirm the positive marker with: telnyx-edge auth status",
          "Validate credentials and connectivity with: telnyx-edge status",
        ];
  } else if (!rootStatusPassed) {
    nextSteps = [
      "Run telnyx-edge status and resolve every failed config, credential, or connectivity check.",
      "If credentials are invalid, authenticate again and rerun telnyx-edge status.",
      "Run telnyx-agent edge-doctor again; readiness requires the final 'All checks passed' marker.",
    ];
  } else {
    nextSteps = [
      "Create an executable MCP handoff: telnyx-agent setup-edge-mcp --name my-mcp-server",
      "Or create a signed webhook handoff: telnyx-agent setup-edge-webhook --name my-webhook",
    ];
    if (inspectSupported) {
      nextSteps.push("After shipping, verify deploy details with: telnyx-edge inspect <function-name>");
    }
    if (actorInstancesSupported) {
      nextSteps.push("For actors, inspect persisted instance metadata with: telnyx-edge actors instances <type>");
    } else if (statefulActorsSupported) {
      nextSteps.push("Actor scaffolding is available, but this CLI does not expose actors instances; upgrade telnyx-edge for that view.");
    }
  }

  const result: EdgeDoctorResult = {
    ready,
    telnyx_edge_installed: installed,
    telnyx_edge_version: version,
    authenticated,
    auth_mode: authMode,
    root_status_passed: rootStatusPassed,
    api_key_auth_supported: apiKeyAuthSupported,
    stateful_actors_supported: statefulActorsSupported,
    inspect_supported: inspectSupported,
    actor_instances_supported: actorInstancesSupported,
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
      "Root status": "all checks passed",
      Ready: "✓",
    });
  } else {
    printError("Edge Compute handoff is not ready yet.");
    if (!installed) {
      printWarning("Install telnyx-edge first — team-telnyx/ai does not own Edge lifecycle directly.");
    } else if (!authenticated) {
      printWarning(apiKeyAuthSupported
        ? "telnyx-edge is installed but not positively authenticated. Prefer API-key auth for agents."
        : "telnyx-edge is installed but not positively authenticated.");
    } else {
      printWarning("Authentication is present, but telnyx-edge status did not pass every config/connectivity/credential check.");
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
