import { execFileSync } from "node:child_process";

const DEFAULT_TIMEOUT_MS = 15000;
const STATUS_TIMEOUT_MS = 45000;

export function resolveEdgeBinary(): string {
  return process.env.TELNYX_EDGE_PATH || "telnyx-edge";
}

function runEdge(args: string[], timeout = DEFAULT_TIMEOUT_MS): string {
  return execFileSync(resolveEdgeBinary(), args, {
    encoding: "utf8",
    timeout,
    env: { ...process.env },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

export function hasEdgeCli(): boolean {
  try {
    runEdge(["--help"]);
    return true;
  } catch {
    return false;
  }
}

export function getEdgeHelp(): string {
  return runEdge(["--help"]);
}

/**
 * Resolve the installed telnyx-edge version for display only.
 * Capabilities are always detected by invoking their help surfaces instead.
 */
export function getEdgeVersion(): string | null {
  try {
    const version = matchVersion(runEdge(["--version"]));
    if (version) return version;
  } catch {
    // Older CLIs may not have --version. Fall back to the root help banner.
  }
  try {
    return matchVersion(runEdge(["--help"]));
  } catch {
    return null;
  }
}

/** Detect actor scaffolding from the command that supplies it, not a version. */
export function supportsStatefulActors(): boolean {
  try {
    return /--actor\b/i.test(runEdge(["new-func", "--help"]));
  } catch {
    return false;
  }
}

/** Detect the source-directory scaffold used by both setup handoffs. */
export function supportsNewFuncFromDir(): boolean {
  try {
    const out = runEdge(["new-func", "--help"]);
    return /\bnew-func\b/i.test(out) && /--from-dir\b/i.test(out);
  } catch {
    return false;
  }
}

/** Detect the command used by setup handoffs to publish a function. */
export function supportsShip(): boolean {
  try {
    const out = runEdge(["ship", "--help"]);
    return /\bship\b/i.test(out) && /\bfunction\b/i.test(out);
  } catch {
    return false;
  }
}

/** Detect non-interactive confirmation from a destructive command's own help. */
export function supportsNonInteractiveConfirmation(): boolean {
  try {
    const out = runEdge(["delete-func", "--help"]);
    return /--yes\b/i.test(out) && /confirm(?:ation)?|scripts?|\bci\b/i.test(out);
  } catch {
    return false;
  }
}

/** Detect failed-function reset directly, without relying on the CLI version. */
export function supportsResetFunc(): boolean {
  try {
    const out = runEdge(["reset-func", "--help"]);
    return /\breset-func\s+<[^>]+>/i.test(out) && /reset\b[\s\S]*\bfunction\b/i.test(out);
  } catch {
    return false;
  }
}

/** Detect the exact secret write command emitted by the setup handoffs. */
export function supportsSecretsAdd(): boolean {
  try {
    const out = runEdge(["secrets", "add", "--help"]);
    return /\bsecrets\s+add\s+<[^>]+>\s+<[^>]+>/i.test(out) && /\bsecret\b/i.test(out);
  } catch {
    return false;
  }
}

/** Detect TypeScript binding declaration generation directly. */
export function supportsTypes(): boolean {
  try {
    const out = runEdge(["types", "--help"]);
    return /\btypes\b/i.test(out) && /typescript\s+binding\s+types/i.test(out);
  } catch {
    return false;
  }
}

/** Detect KV namespace management, including its basic lifecycle commands. */
export function supportsKvStorage(): boolean {
  try {
    const out = runEdge(["storage", "kv", "--help"]);
    return /\bstorage\s+kv\b/i.test(out) && /\bkv\b[\s\S]*\bnamespace/i.test(out) &&
      ["create", "list", "get", "delete"].every((command) => new RegExp(`\\b${command}\\b`, "i").test(out));
  } catch {
    return false;
  }
}

/** Detect key CRUD beneath a KV namespace rather than inferring it from KV. */
export function supportsKvKeyManagement(): boolean {
  try {
    const out = runEdge(["storage", "kv", "key", "--help"]);
    return /\bstorage\s+kv\s+key\b/i.test(out) && /\bkeys?\b[\s\S]*\bkv\s+namespace/i.test(out) &&
      ["list", "get", "put", "delete"].every((command) => new RegExp(`\\b${command}\\b`, "i").test(out));
  } catch {
    return false;
  }
}

/**
 * Detect usable remote SQL execution. The command alone is insufficient: the
 * v0.3 workflow requires both SQL input forms and the explicit remote switch.
 */
export function supportsSqlDatabases(): boolean {
  try {
    const out = runEdge(["storage", "sqldb", "execute", "--help"]);
    return /\bstorage\s+sqldb\s+execute\s+<[^>]+>/i.test(out) &&
      ["remote", "command", "file"].every((flag) => new RegExp(`--${flag}\\b`, "i").test(out));
  } catch {
    return false;
  }
}

/** Detect the root function-detail command introduced before v0.2.5. */
export function supportsInspect(): boolean {
  try {
    const out = runEdge(["inspect", "--help"]);
    return /\binspect(?:\s+<[^>]+>)?/i.test(out) && /\bfunction\b/i.test(out);
  } catch {
    return false;
  }
}

/** Detect the v0.2.5 persisted actor-instance listing directly. */
export function supportsActorInstances(): boolean {
  try {
    const out = runEdge(["actors", "instances", "--help"]);
    return /\binstances(?:\s+<[^>]+>)?/i.test(out) && /\bactor\b/i.test(out);
  } catch {
    return false;
  }
}

export type EdgeAuthStatus = {
  authenticated: boolean;
  mode: "api_key" | "oauth" | "none" | "unknown";
  raw: string;
};

/**
 * Parse `auth status` conservatively. A zero exit code or unfamiliar text is
 * not evidence of authentication: the CLI must identify a supported auth mode
 * and print its affirmative authenticated marker.
 */
export function getEdgeAuthStatus(): EdgeAuthStatus {
  const raw = runEdge(["auth", "status"]);
  const text = raw.toLowerCase();

  let mode: EdgeAuthStatus["mode"] = "unknown";
  if (/authentication status:\s*api key/i.test(raw)) {
    mode = "api_key";
  } else if (/authentication status:\s*oauth(?:\s*2\.0)?/i.test(raw)) {
    mode = "oauth";
  } else if (/authentication status:\s*none/i.test(raw) || /not authenticated/i.test(raw)) {
    mode = "none";
  }

  const positiveMarker = /status:\s*(?:✅|✓)\s*authenticated\b/i.test(raw);
  const negativeMarker =
    /not authenticated|token expired|status:\s*(?:❌|x)\b|invalid/i.test(text);
  const authenticated =
    (mode === "api_key" || mode === "oauth") && positiveMarker && !negativeMarker;

  return { authenticated, mode, raw };
}

export function supportsApiKeyAuth(): boolean {
  try {
    const out = runEdge(["auth", "api-key", "set", "--help"]);
    return /set api key for authentication/i.test(out);
  } catch {
    return false;
  }
}

export type EdgeRootStatus = {
  passed: boolean;
  raw: string;
};

/**
 * Run the networked root diagnostic. telnyx-edge currently exits successfully
 * even when an individual check fails, so require its affirmative final line.
 * The upstream check can spend 5s on connectivity and 10s validating auth;
 * allow extra process/network startup time beyond the normal help timeout.
 */
export function getEdgeRootStatus(): EdgeRootStatus {
  const raw = runEdge(["status"], STATUS_TIMEOUT_MS);
  const passed = /(?:✅|✓)\s*All checks passed\s*-\s*CLI is ready to use/i.test(raw);
  return { passed, raw };
}

export function validateEdgeFunctionName(name: string): void {
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,62}[A-Za-z0-9])?$/.test(name)) {
    throw new Error(
      "Invalid Edge function name: use 1–64 alphanumeric/dash characters with no leading or trailing dash.",
    );
  }
}

function matchVersion(text: string): string | null {
  const match = text.match(/v?\d+\.\d+\.\d+/);
  return match?.[0] ?? null;
}
