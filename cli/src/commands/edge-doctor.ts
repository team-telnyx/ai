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
  supportsActorLiveLogTail,
  supportsActorLogs,
  supportsActorMetrics,
  supportsActorStorageMetrics,
  supportsActorInstances,
  supportsApiKeyAuth,
  supportsCustomDomains,
  supportsDeployments,
  supportsFunctionMetrics,
  supportsInspect,
  supportsInvocationLogs,
  supportsKvKeyManagement,
  supportsKvStorage,
  supportsNewFuncFromDir,
  supportsNonInteractiveConfirmation,
  supportsResetFunc,
  supportsResetFuncNonInteractiveConfirmation,
  supportsRuntimeLogs,
  supportsLiveLogTail,
  supportsLogExport,
  supportsLocalDev,
  supportsLocalSqlWorkflow,
  supportsSecretsAdd,
  supportsShip,
  supportsShipStatus,
  supportsSqlBoundParameters,
  supportsSqlDatabaseExport,
  supportsSqlDatabases,
  supportsSqlStdinImport,
  supportsStatefulActors,
  supportsSelfUpdate,
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
  ship_status_supported: boolean;
  runtime_logs_supported: boolean;
  invocation_logs_supported: boolean;
  live_log_tail_supported: boolean;
  log_export_supported: boolean;
  function_metrics_supported: boolean;
  deployments_supported: boolean;
  stateful_actors_supported: boolean;
  inspect_supported: boolean;
  actor_instances_supported: boolean;
  actor_metrics_supported: boolean;
  actor_logs_supported: boolean;
  actor_live_log_tail_supported: boolean;
  actor_storage_metrics_supported: boolean;
  local_dev_supported: boolean;
  reset_func_supported: boolean;
  reset_func_noninteractive_confirmation_supported: boolean;
  noninteractive_confirmation_supported: boolean;
  types_supported: boolean;
  kv_storage_supported: boolean;
  kv_key_management_supported: boolean;
  sql_databases_supported: boolean;
  sql_bound_parameters_supported: boolean;
  sql_database_export_supported: boolean;
  sql_stdin_import_supported: boolean;
  local_sql_workflow_supported: boolean;
  custom_domains_supported: boolean;
  self_update_supported: boolean;
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
  let shipStatusSupported = false;
  let runtimeLogsSupported = false;
  let invocationLogsSupported = false;
  let liveLogTailSupported = false;
  let logExportSupported = false;
  let functionMetricsSupported = false;
  let deploymentsSupported = false;
  let statefulActorsSupported = false;
  let inspectSupported = false;
  let actorInstancesSupported = false;
  let actorMetricsSupported = false;
  let actorLogsSupported = false;
  let actorLiveLogTailSupported = false;
  let actorStorageMetricsSupported = false;
  let localDevSupported = false;
  let resetFuncSupported = false;
  let resetFuncNoninteractiveConfirmationSupported = false;
  let noninteractiveConfirmationSupported = false;
  let typesSupported = false;
  let kvStorageSupported = false;
  let kvKeyManagementSupported = false;
  let sqlDatabasesSupported = false;
  let sqlBoundParametersSupported = false;
  let sqlDatabaseExportSupported = false;
  let sqlStdinImportSupported = false;
  let localSqlWorkflowSupported = false;
  let customDomainsSupported = false;
  let selfUpdateSupported = false;

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
    shipStatusSupported = supportsShipStatus();
    runtimeLogsSupported = supportsRuntimeLogs();
    invocationLogsSupported = supportsInvocationLogs();
    liveLogTailSupported = supportsLiveLogTail();
    logExportSupported = supportsLogExport();
    functionMetricsSupported = supportsFunctionMetrics();
    deploymentsSupported = supportsDeployments();
    statefulActorsSupported = supportsStatefulActors();
    inspectSupported = supportsInspect();
    actorInstancesSupported = supportsActorInstances();
    actorMetricsSupported = supportsActorMetrics();
    actorLogsSupported = supportsActorLogs();
    actorLiveLogTailSupported = supportsActorLiveLogTail();
    actorStorageMetricsSupported = supportsActorStorageMetrics();
    localDevSupported = supportsLocalDev();
    resetFuncSupported = supportsResetFunc();
    resetFuncNoninteractiveConfirmationSupported = supportsResetFuncNonInteractiveConfirmation();
    noninteractiveConfirmationSupported = supportsNonInteractiveConfirmation();
    typesSupported = supportsTypes();
    kvStorageSupported = supportsKvStorage();
    kvKeyManagementSupported = supportsKvKeyManagement();
    sqlDatabasesSupported = supportsSqlDatabases();
    sqlBoundParametersSupported = supportsSqlBoundParameters();
    sqlDatabaseExportSupported = supportsSqlDatabaseExport();
    sqlStdinImportSupported = supportsSqlStdinImport();
    localSqlWorkflowSupported = supportsLocalSqlWorkflow();
    customDomainsSupported = supportsCustomDomains();
    selfUpdateSupported = supportsSelfUpdate();

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
      name: "Ship failure diagnostics",
      ok: shipStatusSupported,
      detail: shipStatusSupported
        ? "ship status <function> --logs is available"
        : "ship status --help did not advertise both <function> usage and --logs",
    });
    checks.push({
      name: "Function runtime logs",
      ok: runtimeLogsSupported,
      detail: runtimeLogsSupported
        ? "logs <function> supports --since, --last, and --json"
        : "logs --help did not advertise <function> usage with --since, --last, and --json",
    });
    checks.push({
      name: "Function invocation logs",
      ok: invocationLogsSupported,
      detail: invocationLogsSupported
        ? "logs <function> supports --type runtime and invocations"
        : "logs --help did not advertise both runtime and invocations log streams",
    });
    checks.push({
      name: "Live log tail",
      ok: liveLogTailSupported,
      detail: liveLogTailSupported
        ? "logs <function> --tail is available"
        : "logs --help did not advertise <function> usage with --tail",
    });
    checks.push({
      name: "OTLP log export",
      ok: logExportSupported,
      detail: logExportSupported
        ? "log-export set/get/delete supports endpoint, headers, log types, JSON reads, and non-interactive deletion"
        : "log-export help did not advertise the complete set/get/delete OTLP configuration lifecycle",
    });
    checks.push({
      name: "Function metrics",
      ok: functionMetricsSupported,
      detail: functionMetricsSupported
        ? "metrics <function> supports --since, --errors, and --json"
        : "metrics --help did not advertise <function> usage with --since, --errors, and --json",
    });
    checks.push({
      name: "Deployment history",
      ok: deploymentsSupported,
      detail: deploymentsSupported
        ? "deployments <function> reports failure reasons and supports --json"
        : "deployments --help did not advertise <function> usage, failure reasons, and --json",
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
      name: "Actor metrics supported",
      ok: actorMetricsSupported,
      detail: actorMetricsSupported
        ? "actors metrics <type> supports --since and --json"
        : "actors metrics --help did not advertise <type> usage with --since and --json",
    });
    checks.push({
      name: "Actor historical logs",
      ok: actorLogsSupported,
      detail: actorLogsSupported
        ? "actors logs <type> supports runtime/invocation filters, instances, history windows, and JSON"
        : "actors logs --help did not advertise <type> usage with --type, --instance, --since, --last, and --json",
    });
    checks.push({
      name: "Live actor-log tail",
      ok: actorLiveLogTailSupported,
      detail: actorLiveLogTailSupported
        ? "actors logs <type> --tail is available"
        : "actors logs --help did not advertise <type> usage with --tail",
    });
    checks.push({
      name: "Actor stored-state metrics",
      ok: actorStorageMetricsSupported,
      detail: actorStorageMetricsSupported
        ? "actors metrics <type> identifies stored state and its 90h maximum window"
        : "actors metrics --help did not identify stored state and a 90h maximum window",
    });
    checks.push({
      name: "Local actor development",
      ok: localDevSupported,
      detail: localDevSupported
        ? "dev supports --from-dir, --port, --no-watch, and --generate-only"
        : "dev --help did not advertise its usage with --from-dir, --port, --no-watch, and --generate-only",
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
    checks.push({
      name: "Bound SQL parameters",
      ok: sqlBoundParametersSupported,
      detail: sqlBoundParametersSupported
        ? "storage sqldb execute supports --param and --param-json"
        : "storage sqldb execute --help did not advertise both --param and --param-json",
    });
    checks.push({
      name: "SQL database export",
      ok: sqlDatabaseExportSupported,
      detail: sqlDatabaseExportSupported
        ? "storage sqldb export supports --remote, --output, --table, --no-data, and --no-schema"
        : "storage sqldb export --help did not advertise the complete export surface",
    });
    checks.push({
      name: "SQL standard-input import",
      ok: sqlStdinImportSupported,
      detail: sqlStdinImportSupported
        ? "storage sqldb execute accepts --file - from standard input"
        : "storage sqldb execute --help did not advertise --file - standard-input input",
    });
    checks.push({
      name: "Local SQL workflow",
      ok: localSqlWorkflowSupported,
      detail: localSqlWorkflowSupported
        ? "execute supports --local/--persist-to and migrations list/apply support --local"
        : "SQL help did not advertise execute --local/--persist-to and migrations list/apply --local",
    });
    checks.push({
      name: "Custom domains",
      ok: customDomainsSupported,
      detail: customDomainsSupported
        ? "domains add/verify/list/delete and cert upload are available with non-interactive deletion"
        : "custom-domain help surfaces did not advertise the complete lifecycle, certificate paths, and delete --yes",
    });
    checks.push({
      name: "Verified self-update",
      ok: selfUpdateSupported,
      detail: selfUpdateSupported
        ? "update --yes is available from the released telnyx-edge binary"
        : "update --yes was not detected, or this is not a released binary named telnyx-edge",
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
      selfUpdateSupported
        ? `Upgrade telnyx-edge with verified self-update: telnyx-edge update --yes. The executable setup handoffs require ${missing.join(", ")}.`
        : `Upgrade telnyx-edge from https://github.com/team-telnyx/edge-compute/releases: the executable setup handoffs require ${missing.join(", ")}.`,
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
    if (actorMetricsSupported) {
      nextSteps.push("Summarize actor traffic and resources with: telnyx-edge actors metrics <type> --since 24h");
    }
    if (actorStorageMetricsSupported) {
      nextSteps.push("Review actor stored-state aggregates (90h maximum) with: telnyx-edge actors metrics <type> --since 24h");
    }
    if (actorLogsSupported) {
      nextSteps.push("Read actor history with: telnyx-edge actors logs <type> --since 10m --last 200");
    }
    if (actorLiveLogTailSupported) {
      nextSteps.push("Tail live actor logs with: telnyx-edge actors logs <type> --tail");
    }
    if (localDevSupported) {
      nextSteps.push("Run an umbrella project locally with: telnyx-edge dev --from-dir ./<project-dir>");
    }
    if (shipStatusSupported) {
      nextSteps.push("Diagnose the latest ship before resetting it: telnyx-edge ship status <function-name> --logs");
    }
    if (runtimeLogsSupported) {
      nextSteps.push("Read deployed-function runtime logs with: telnyx-edge logs <function-name> --since 10m --last 200");
    }
    if (invocationLogsSupported) {
      nextSteps.push("Read HTTP invocation records with: telnyx-edge logs <function-name> --type invocations --since 10m --last 200");
    }
    if (liveLogTailSupported) {
      nextSteps.push("Tail live function logs with: telnyx-edge logs <function-name> --tail");
    }
    if (logExportSupported) {
      nextSteps.push("Export runtime and invocation logs over OTLP with: telnyx-edge log-export set <function-name> --endpoint https://<otlp-endpoint>");
    }
    if (functionMetricsSupported) {
      nextSteps.push("Summarize function traffic and resources with: telnyx-edge metrics <function-name> --since 24h");
    }
    if (deploymentsSupported) {
      nextSteps.push("Review per-ship outcomes with: telnyx-edge deployments <function-name>");
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
    if (sqlBoundParametersSupported) {
      nextSteps.push("Bind SQL inputs safely with repeatable --param (strings) and --param-json (numbers, booleans, or null).");
    }
    if (sqlDatabaseExportSupported) {
      nextSteps.push("Export a remote SQL database with: telnyx-edge storage sqldb export <database> --remote --output ./database.sql");
    }
    if (sqlDatabaseExportSupported && sqlStdinImportSupported) {
      nextSteps.push("Copy SQL data only to an empty/disposable destination (imports can partially modify it on failure): telnyx-edge storage sqldb export <source-database> --remote --output - | telnyx-edge storage sqldb execute <destination-database> --remote --file -");
    }
    if (localSqlWorkflowSupported) {
      nextSteps.push("Run local SQL with Docker (separate from deployed data): telnyx-edge storage sqldb execute <database> --local --command \"SELECT 1\"");
    }
    if (customDomainsSupported) {
      nextSteps.push("Route a hostname with: telnyx-edge domains add <hostname> <function-id>, then follow the DNS verification and TLS certificate workflow.");
    }
    const missingOptional = [
      !shipStatusSupported && "ship status <function> --logs diagnostics",
      !runtimeLogsSupported && "runtime logs",
      !invocationLogsSupported && "invocation logs",
      !liveLogTailSupported && "live log tail",
      !logExportSupported && "OTLP log export",
      !functionMetricsSupported && "function metrics",
      !deploymentsSupported && "deployment history",
      !resetFuncSupported && "reset-func",
      resetFuncSupported && !resetFuncNoninteractiveConfirmationSupported && "reset-func --yes",
      !noninteractiveConfirmationSupported && "destructive-command --yes",
      !typesSupported && "types",
      !kvStorageSupported && "KV namespaces",
      !kvKeyManagementSupported && "KV keys",
      !sqlDatabasesSupported && "remote SQL execution",
      !sqlBoundParametersSupported && "SQL --param/--param-json bindings",
      !sqlDatabaseExportSupported && "SQL database export",
      !sqlStdinImportSupported && "SQL standard-input import",
      !localSqlWorkflowSupported && "local SQL workflow",
      !customDomainsSupported && "custom domains",
      !actorMetricsSupported && "actor metrics",
      !actorStorageMetricsSupported && "actor stored-state metrics (90h maximum)",
      !actorLogsSupported && "actor historical logs",
      !actorLiveLogTailSupported && "live actor-log tail",
      !localDevSupported && "local dev",
    ].filter((value): value is string => Boolean(value));
    if (missingOptional.length > 0) {
      nextSteps.push(selfUpdateSupported
        ? "Upgrade the released CLI with verified self-update: telnyx-edge update --yes"
        : "Download the latest telnyx-edge release from https://github.com/team-telnyx/edge-compute/releases (self-update requires a released binary named telnyx-edge).");
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
    ship_status_supported: shipStatusSupported,
    runtime_logs_supported: runtimeLogsSupported,
    invocation_logs_supported: invocationLogsSupported,
    live_log_tail_supported: liveLogTailSupported,
    log_export_supported: logExportSupported,
    function_metrics_supported: functionMetricsSupported,
    deployments_supported: deploymentsSupported,
    stateful_actors_supported: statefulActorsSupported,
    inspect_supported: inspectSupported,
    actor_instances_supported: actorInstancesSupported,
    actor_metrics_supported: actorMetricsSupported,
    actor_logs_supported: actorLogsSupported,
    actor_live_log_tail_supported: actorLiveLogTailSupported,
    actor_storage_metrics_supported: actorStorageMetricsSupported,
    local_dev_supported: localDevSupported,
    reset_func_supported: resetFuncSupported,
    reset_func_noninteractive_confirmation_supported: resetFuncNoninteractiveConfirmationSupported,
    noninteractive_confirmation_supported: noninteractiveConfirmationSupported,
    types_supported: typesSupported,
    kv_storage_supported: kvStorageSupported,
    kv_key_management_supported: kvKeyManagementSupported,
    sql_databases_supported: sqlDatabasesSupported,
    sql_bound_parameters_supported: sqlBoundParametersSupported,
    sql_database_export_supported: sqlDatabaseExportSupported,
    sql_stdin_import_supported: sqlStdinImportSupported,
    local_sql_workflow_supported: localSqlWorkflowSupported,
    custom_domains_supported: customDomainsSupported,
    self_update_supported: selfUpdateSupported,
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
