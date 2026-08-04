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
  supportsKvKeyManagement,
  supportsKvStorage,
  supportsNewFuncFromDir,
  supportsNonInteractiveConfirmation,
  supportsResetFunc,
  supportsResetFuncNonInteractiveConfirmation,
  supportsSecretsAdd,
  supportsShip,
  supportsSqlDatabases,
  supportsStatefulActors,
  supportsTypes,
} from "../edge-cli.ts";

interface EdgeDoctorResult {
  ready: boolean;
  telnyx_edge_installed: boolean;
  telnyx_edge_version: string | null;
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
  reset_func_supported: boolean;
  reset_func_noninteractive_confirmation_supported: boolean;
  noninteractive_confirmation_supported: boolean;
  types_supported: boolean;
  kv_storage_supported: boolean;
  kv_key_management_supported: boolean;
  sql_databases_supported: boolean;
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
  let newFuncFromDirSupported = false;
  let secretsAddSupported = false;
  let shipSupported = false;
  let statefulActorsSupported = false;
  let inspectSupported = false;
  let actorInstancesSupported = false;
  let resetFuncSupported = false;
  let resetFuncNoninteractiveConfirmationSupported = false;
  let noninteractiveConfirmationSupported = false;
  let typesSupported = false;
  let kvStorageSupported = false;
  let kvKeyManagementSupported = false;
  let sqlDatabasesSupported = false;

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
    newFuncFromDirSupported = supportsNewFuncFromDir();
    secretsAddSupported = supportsSecretsAdd();
    shipSupported = supportsShip();
    statefulActorsSupported = supportsStatefulActors();
    inspectSupported = supportsInspect();
    actorInstancesSupported = supportsActorInstances();
    resetFuncSupported = supportsResetFunc();
    resetFuncNoninteractiveConfirmationSupported = supportsResetFuncNonInteractiveConfirmation();
    noninteractiveConfirmationSupported = supportsNonInteractiveConfirmation();
    typesSupported = supportsTypes();
    kvStorageSupported = supportsKvStorage();
    kvKeyManagementSupported = supportsKvKeyManagement();
    sqlDatabasesSupported = supportsSqlDatabases();

    checks.push({
      name: "API-key auth supported",
      ok: apiKeyAuthSupported,
      detail: apiKeyAuthSupported ? "auth api-key set is available" : "no auth api-key set support detected",
    });
    checks.push({
      name: "Source-directory scaffolding",
      ok: newFuncFromDirSupported,
      detail: newFuncFromDirSupported
        ? "new-func --from-dir is available"
        : "new-func --from-dir was not detected; setup handoffs cannot scaffold their examples",
    });
    checks.push({
      name: "Secret writes",
      ok: secretsAddSupported,
      detail: secretsAddSupported
        ? "secrets add <key> <value> is available"
        : "secrets add <key> <value> was not detected; setup handoffs cannot install runtime secrets",
    });
    checks.push({
      name: "Function shipping",
      ok: shipSupported,
      detail: shipSupported ? "ship is available" : "ship --help capability was not detected",
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
        : "actors instances --help capability not detected",
    });
    checks.push({
      name: "Failed-function reset",
      ok: resetFuncSupported,
      detail: resetFuncSupported ? "reset-func <function-name> is available" : "reset-func --help capability not detected",
    });
    checks.push({
      name: "Non-interactive failed-function reset",
      ok: resetFuncNoninteractiveConfirmationSupported,
      detail: resetFuncNoninteractiveConfirmationSupported
        ? "reset-func --yes is available for scripts and CI"
        : "reset-func --help did not advertise --yes confirmation bypass",
    });
    checks.push({
      name: "Non-interactive destructive confirmation",
      ok: noninteractiveConfirmationSupported,
      detail: noninteractiveConfirmationSupported
        ? "--yes is available for non-interactive destructive commands"
        : "delete-func --help did not advertise --yes confirmation bypass",
    });
    checks.push({
      name: "Binding type generation",
      ok: typesSupported,
      detail: typesSupported ? "types can generate TypeScript binding declarations" : "types --help capability not detected",
    });
    checks.push({
      name: "KV namespace storage",
      ok: kvStorageSupported,
      detail: kvStorageSupported
        ? "storage kv namespace lifecycle commands are available"
        : "storage kv --help did not advertise create/list/get/delete",
    });
    checks.push({
      name: "KV key management",
      ok: kvKeyManagementSupported,
      detail: kvKeyManagementSupported
        ? "storage kv key list/get/put/delete are available"
        : "storage kv key --help did not advertise full key management",
    });
    checks.push({
      name: "Remote SQL databases",
      ok: sqlDatabasesSupported,
      detail: sqlDatabasesSupported
        ? "storage sqldb execute supports --remote, --command, and --file"
        : "storage sqldb execute --help did not advertise --remote, --command, and --file",
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

  const mandatoryHandoffCapabilities = newFuncFromDirSupported && secretsAddSupported && shipSupported;
  const ready = installed && authenticated && rootStatusPassed && mandatoryHandoffCapabilities;
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
  } else if (!mandatoryHandoffCapabilities) {
    const missing = [
      !newFuncFromDirSupported && "new-func --from-dir",
      !secretsAddSupported && "secrets add <key> <value>",
      !shipSupported && "ship",
    ].filter((value): value is string => Boolean(value));
    nextSteps = [
      `Upgrade telnyx-edge: the executable setup handoffs require ${missing.join(", ")}.`,
      "Verify each missing command or flag on its own --help surface, then rerun telnyx-agent edge-doctor.",
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
    if (resetFuncSupported) {
      nextSteps.push(`Recover a failed deployment with: telnyx-edge reset-func <function-name>${resetFuncNoninteractiveConfirmationSupported ? " --yes" : ""}`);
    }
    if (typesSupported) {
      nextSteps.push("Generate TypeScript binding declarations with: telnyx-edge types");
    }
    if (kvStorageSupported && kvKeyManagementSupported) {
      nextSteps.push("Manage KV namespaces and values with: telnyx-edge storage kv --help");
    }
    if (sqlDatabasesSupported) {
      nextSteps.push("Run remote SQL with: telnyx-edge storage sqldb execute <database> --remote --command \"SELECT 1\"");
    }
    const missingOptional = [
      !resetFuncSupported && "reset-func",
      resetFuncSupported && !resetFuncNoninteractiveConfirmationSupported && "reset-func --yes",
      !noninteractiveConfirmationSupported && "destructive-command --yes",
      !typesSupported && "types",
      !kvStorageSupported && "KV namespaces",
      !kvKeyManagementSupported && "KV keys",
      !sqlDatabasesSupported && "remote SQL execution",
    ].filter((value): value is string => Boolean(value));
    if (missingOptional.length > 0) {
      nextSteps.push(`Optional capabilities not detected; upgrade telnyx-edge if needed: ${missingOptional.join(", ")}.`);
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
    new_func_from_dir_supported: newFuncFromDirSupported,
    secrets_add_supported: secretsAddSupported,
    ship_supported: shipSupported,
    stateful_actors_supported: statefulActorsSupported,
    inspect_supported: inspectSupported,
    actor_instances_supported: actorInstancesSupported,
    reset_func_supported: resetFuncSupported,
    reset_func_noninteractive_confirmation_supported: resetFuncNoninteractiveConfirmationSupported,
    noninteractive_confirmation_supported: noninteractiveConfirmationSupported,
    types_supported: typesSupported,
    kv_storage_supported: kvStorageSupported,
    kv_key_management_supported: kvKeyManagementSupported,
    sql_databases_supported: sqlDatabasesSupported,
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
    } else if (!rootStatusPassed) {
      printWarning("Authentication is present, but telnyx-edge status did not pass every config/connectivity/credential check.");
    } else {
      printWarning("telnyx-edge is healthy, but it lacks one or more commands required by the executable setup handoffs.");
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
