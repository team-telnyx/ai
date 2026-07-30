import { spawnSync } from "node:child_process";

export function resolveEdgeBinary(): string {
  return process.env.TELNYX_EDGE_PATH || "telnyx-edge";
}

function runEdge(args: string[]): string {
  const result = spawnSync(resolveEdgeBinary(), args, {
    encoding: "utf8",
    timeout: 15000,
    env: { ...process.env },
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.error) {
    throw result.error;
  }

  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  const combined = stdout.length > 0 && stderr.length > 0
    ? `${stdout}\n${stderr}`
    : `${stdout}${stderr}`;

  if ((result.status ?? 0) !== 0) {
    const error = new Error(combined || `telnyx-edge exited with status ${result.status ?? "unknown"}`);
    Object.assign(error, {
      status: result.status,
      stdout,
      stderr,
    });
    throw error;
  }

  return combined;
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

export function getEdgeCommandSurface(): string[] {
  return parseEdgeHelpCommands(getEdgeHelp());
}

export type EdgeAuthStatus = {
  authenticated: boolean;
  mode: "api_key" | "oauth" | "none" | "unknown";
  raw: string;
};

export function getEdgeAuthStatus(): EdgeAuthStatus {
  const raw = runEdge(["auth", "status"]);
  return parseEdgeAuthStatus(raw);
}

export function supportsApiKeyAuth(): boolean {
  try {
    const out = runEdge(["auth", "api-key", "set", "--help"]);
    return /Set API key for authentication/i.test(out);
  } catch {
    return false;
  }
}

export function parseEdgeAuthStatus(raw: string): EdgeAuthStatus {
  const text = raw.toLowerCase();
  const mode = detectAuthMode(text);
  const unusable =
    text.includes("token expired") ||
    text.includes("run 'telnyx-edge auth login' to refresh") ||
    text.includes("run \"telnyx-edge auth login\" to refresh");
  const unauthenticated =
    mode === "none" ||
    text.includes("not authenticated") ||
    text.includes("status: ❌") ||
    text.includes("status: x");
  const authenticatedMarker =
    text.includes("status: ✅ authenticated") ||
    text.includes("status: authenticated") ||
    text.includes("logged in");
  const authenticated = !unusable && !unauthenticated && (authenticatedMarker || mode === "api_key" || mode === "oauth");

  return { authenticated, mode, raw };
}

export function parseEdgeHelpCommands(raw: string): string[] {
  const markerMatch = raw.match(/(?:Available Commands|Commands):\s*([\s\S]*?)(?:\n\s*\n|\nFlags:|\nGlobal Flags:|$)/i);
  if (!markerMatch) {
    return [];
  }

  const commands: string[] = [];
  const body = markerMatch[1].trim();
  for (const line of body.split(/\r?\n/)) {
    const match = line.trim().match(/^([a-z0-9-]+)\s{2,}/i);
    if (match) {
      commands.push(match[1]);
    }
  }
  if (commands.length > 0) {
    return commands;
  }

  const seen = new Set<string>();
  for (const part of body.split(",")) {
    const command = part.trim().split(/\s+/)[0];
    if (command && !seen.has(command)) {
      seen.add(command);
      commands.push(command);
    }
  }
  return commands;
}

function detectAuthMode(text: string): EdgeAuthStatus["mode"] {
  if (
    text.includes("authentication status: none") ||
    text.includes("not authenticated") ||
    text.includes("status: ❌") ||
    text.includes("status: x")
  ) {
    return "none";
  }
  if (
    text.includes("authentication status: api key") ||
    text.includes("token type: api key")
  ) {
    return "api_key";
  }
  if (
    text.includes("authentication status: oauth") ||
    text.includes("authentication status: oauth 2.0") ||
    text.includes("token type: bearer") ||
    text.includes("browser") ||
    text.includes("logged in")
  ) {
    return "oauth";
  }
  return "unknown";
}
