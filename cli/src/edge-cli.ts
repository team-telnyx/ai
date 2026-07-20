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
