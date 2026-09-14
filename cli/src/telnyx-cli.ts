/**
 * Telnyx CLI wrapper — shells out to `telnyx` (Go CLI) with `--format json` for structured output.
 *
 * The telnyx CLI (Stainless-generated Go binary from telnyx-cli) outputs:
 * - JSON to stdout (when --format json is passed)
 * - Info/progress messages to stderr
 * - Non-zero exit code on API errors
 *
 * Auth: Reads TELNYX_API_KEY env var or ~/.config/telnyx/config.json profiles.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join, dirname } from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { compareSemanticVersions, parseTelnyxGoCliVersion } from "./semantic-version.ts";
import { vendoredTelnyxCliPath } from "./platform-release.ts";

const execFileAsync = promisify(execFile);

const INSTALL_HINT =
  "Reinstall the package (npm install) so postinstall vendors the correct Telnyx Go CLI, " +
  "or install it manually: go install github.com/team-telnyx/telnyx-cli/cmd/telnyx@latest " +
  "(or set TELNYX_CLI_PATH to a compatible telnyx binary).";

function minimumVersionInstallHint(minimumVersion: string): string {
  return `Install Telnyx Go CLI >= ${minimumVersion}: go install github.com/team-telnyx/telnyx-cli/cmd/telnyx@latest ` +
    "or set TELNYX_CLI_PATH to a compatible telnyx binary.";
}

/**
 * Thrown when the resolved `telnyx` binary is missing or is an incompatible CLI
 * (e.g. the npm `@telnyx/api-cli`, which uses different, singular command names
 * and silently breaks send-sms / phone-numbers / number-order flows).
 */
export class IncompatibleTelnyxCLIError extends Error {
  constructor(binaryPath: string, versionOutput: string | null, minimumVersion?: string) {
    const reportedVersion = versionOutput ? parseTelnyxGoCliVersion(versionOutput) : null;
    const detail =
      versionOutput === null
        ? `Telnyx Go CLI not found (tried "${binaryPath}").`
        : minimumVersion && reportedVersion
          ? `Resolved "${binaryPath}" is Telnyx Go CLI ${reportedVersion}, but this command requires >= ${minimumVersion}.`
        : `Resolved "${binaryPath}" is not the Telnyx Go CLI (reported: ${versionOutput.split("\n")[0]}).`;
    super(`${detail} ${minimumVersion ? minimumVersionInstallHint(minimumVersion) : INSTALL_HINT}`);
    this.name = "IncompatibleTelnyxCLIError";
  }
}

/**
 * Resolve the telnyx binary path without verifying it.
 * Explicit env override first, then vendor/ (installed by postinstall), then PATH.
 *
 * `trusted` is true for the env override (tests + the E2E shim rely on it) and
 * for the vendored binary (postinstall pins a known-good version). A bare PATH
 * fallback is NOT trusted and must be version-verified before use.
 */
function resolveTelnyxBinary(): { path: string; trusted: boolean } {
  if (process.env.TELNYX_CLI_PATH) return { path: process.env.TELNYX_CLI_PATH, trusted: true };
  const vendorPath = vendoredTelnyxCliPath(
    join(dirname(fileURLToPath(import.meta.url)), "..", "vendor"),
    process.platform,
  );
  if (existsSync(vendorPath)) return { path: vendorPath, trusted: true };
  return { path: "telnyx", trusted: false };
}

/**
 * Verify that `binaryPath` is the compatible Telnyx Go CLI by running
 * `--version` and matching its signature. Throws IncompatibleTelnyxCLIError if
 * the binary is missing or is a different CLI (e.g. @telnyx/api-cli). Exported
 * for direct unit testing of the PATH-fallback safeguard.
 */
export async function verifyTelnyxGoCli(binaryPath: string, minimumVersion?: string): Promise<void> {
  let out: string;
  try {
    const res = await execFileAsync(binaryPath, ["--version"], { timeout: 10000 });
    out = `${res.stdout ?? ""}${res.stderr ?? ""}`.trim();
  } catch (err: any) {
    // ENOENT (not on PATH) or non-zero/failed --version → treat as unusable,
    // unless the failing process still emitted a Go-CLI version signature.
    const combined = `${err?.stdout ?? ""}${err?.stderr ?? ""}`.trim();
    if (err?.code === "ENOENT" || !parseTelnyxGoCliVersion(combined)) {
      throw new IncompatibleTelnyxCLIError(
        binaryPath,
        err?.code === "ENOENT" ? null : combined || null,
        minimumVersion,
      );
    }
    out = combined;
  }
  const version = parseTelnyxGoCliVersion(out);
  if (!version) {
    throw new IncompatibleTelnyxCLIError(binaryPath, out || null, minimumVersion);
  }
  if (minimumVersion) {
    const comparison = compareSemanticVersions(version, minimumVersion);
    if (comparison === null || comparison < 0) {
      throw new IncompatibleTelnyxCLIError(binaryPath, out, minimumVersion);
    }
  }
}

// Memoize only the expensive PATH-fallback verification (keyed on the resolved
// path). Trusted overrides (TELNYX_CLI_PATH / vendor) are re-resolved fresh each
// call so in-process callers can point at different binaries between calls.
let verifiedPathBinary: Promise<string> | null = null;
let verifiedPathFor: string | null = null;

/**
 * Resolve AND verify the telnyx binary.
 *
 * When falling back to a bare `telnyx` on PATH we run `telnyx --version` and
 * require the Go-CLI signature. This turns the old silent "command … not found"
 * crash (from an incompatible CLI on PATH) into a single, actionable error.
 */
function getTelnyxBinary(minimumVersion?: string): Promise<string> {
  const { path, trusted } = resolveTelnyxBinary();
  if (minimumVersion) {
    return verifyTelnyxGoCli(path, minimumVersion)
      .then(() => path)
      .catch((vendorError) => {
        // An explicit override is authoritative. Only an implicitly preferred
        // vendor may fall back to PATH for a command-scoped minimum.
        if (process.env.TELNYX_CLI_PATH || !trusted) throw vendorError;
        return verifyTelnyxGoCli("telnyx", minimumVersion)
          .then(() => "telnyx")
          .catch(() => { throw vendorError; });
      });
  }
  if (trusted) return Promise.resolve(path);
  // Untrusted PATH fallback — verify it is the compatible Telnyx Go CLI (cached).
  if (verifiedPathBinary && verifiedPathFor === path) return verifiedPathBinary;
  verifiedPathFor = path;
  verifiedPathBinary = verifyTelnyxGoCli(path).then(() => path);
  return verifiedPathBinary;
}

/**
 * Resolve the WhatsApp message subcommand exposed by the locally selected Go
 * CLI. Legacy releases such as v0.21 used `messages send-whatsapp`; v0.27 uses
 * `messages whatsapp` (v0.24 did not expose either spelling).
 *
 * Command help is authoritative because it describes the binary we are about
 * to execute (including custom/dev builds). If help is unavailable or does not
 * enumerate either command, fall back to the local binary's semantic version.
 * The final fallback preserves the command bundled with this package.
 */
export async function resolveMessagesWhatsappSubcommand(): Promise<"send-whatsapp" | "whatsapp"> {
  const binary = await getTelnyxBinary();

  try {
    const { stdout, stderr } = await execFileAsync(binary, ["messages", "--help"], { timeout: 10000 });
    const help = `${stdout ?? ""}\n${stderr ?? ""}`;
    if (/^\s*whatsapp(?:\s|$)/m.test(help)) return "whatsapp";
    if (/^\s*send-whatsapp(?:\s|$)/m.test(help)) return "send-whatsapp";
  } catch {
    // Some older/custom builds do not provide parent-command help. Version
    // detection below remains a side-effect-free compatibility probe.
  }

  try {
    const { stdout, stderr } = await execFileAsync(binary, ["--version"], { timeout: 10000 });
    const version = parseTelnyxGoCliVersion(`${stdout ?? ""}${stderr ?? ""}`);
    if (version && (compareSemanticVersions(version, "0.27.0") ?? -1) >= 0) return "whatsapp";
  } catch (err: any) {
    // A few releases print their version to stderr and exit non-zero.
    const version = parseTelnyxGoCliVersion(`${err?.stdout ?? ""}${err?.stderr ?? ""}`);
    if (version && (compareSemanticVersions(version, "0.27.0") ?? -1) >= 0) return "whatsapp";
  }

  // The package bundles v0.27, so prefer its spelling if an unusual binary
  // exposes neither usable help nor a parseable version.
  return "whatsapp";
}

/**
 * Resolve the collection retrieval resource exposed by the locally selected Go
 * CLI. v0.27-v0.30 used `ai:collections`; v0.31 moved retrieval into
 * `ai:knowledge:collections` while leaving other collection commands in the
 * old namespace.
 *
 * As with WhatsApp compatibility, command help is authoritative for the binary
 * that will run the request, including custom builds. These are read-only help
 * probes. If neither resource advertises the action, use the reported semantic
 * version when available; an unknown binary conservatively keeps the v0.27
 * spelling bundled by this package.
 */
export async function resolveAiCollectionRetrieveDocumentsResource(): Promise<
  "ai:collections" | "ai:knowledge:collections"
> {
  const binary = await getTelnyxBinary();
  const newResource = "ai:knowledge:collections";
  const oldResource = "ai:collections";

  if (await collectionResourceHasRetrieveDocuments(binary, newResource)) return newResource;
  if (await collectionResourceHasRetrieveDocuments(binary, oldResource)) return oldResource;

  const version = await telnyxGoCliVersion(binary);
  if (version && (compareSemanticVersions(version, "0.31.0") ?? -1) >= 0) return newResource;
  return oldResource;
}

async function collectionResourceHasRetrieveDocuments(binary: string, resource: string): Promise<boolean> {
  try {
    const { stdout, stderr } = await execFileAsync(binary, [resource, "--help"], { timeout: 10000 });
    return /(?:^|\n)\s*retrieve-documents(?:\s|$)/m.test(`${stdout ?? ""}\n${stderr ?? ""}`);
  } catch {
    return false;
  }
}

async function telnyxGoCliVersion(binary: string): Promise<string | null> {
  try {
    const { stdout, stderr } = await execFileAsync(binary, ["--version"], { timeout: 10000 });
    return parseTelnyxGoCliVersion(`${stdout ?? ""}${stderr ?? ""}`);
  } catch (err: any) {
    return parseTelnyxGoCliVersion(`${err?.stdout ?? ""}${err?.stderr ?? ""}`);
  }
}

/**
 * Find the start of JSON in CLI output that may have info messages before it.
 * Looks for the first `{` or `[` that starts valid JSON.
 *
 * Note: The Go CLI outputs clean JSON with --format json, so this is kept as a
 * safety net but shouldn't normally be needed.
 */
function findJsonStart(text: string): number {
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "{" || ch === "[") {
      // Quick validation: try to parse from this point
      try {
        JSON.parse(text.slice(i));
        return i;
      } catch {
        // Not valid JSON from here, keep looking
      }
    }
  }
  return -1;
}

export class TelnyxCLIError extends Error {
  readonly exitCode: number;
  readonly stderr: string;
  constructor(exitCode: number, stderr: string) {
    super(`telnyx CLI exited with code ${exitCode}: ${stderr}`);
    this.name = "TelnyxCLIError";
    this.exitCode = exitCode;
    this.stderr = stderr;
  }
}

/**
 * Run a telnyx CLI command and return parsed JSON output.
 * Automatically appends `--format json` (or the format given in opts) to all commands.
 *
 * IMPORTANT — list commands: with `--format json` the Go CLI routes list
 * output through ShowJSONIterator, which prints each item as a separate
 * pretty-printed JSON document (concatenated, NOT a JSON array and NOT the
 * `{ data: [...] }` envelope). That output is not parseable as a single JSON
 * value. For list commands, pass `{ format: "raw" }` — the raw format prints
 * the actual REST response body, i.e. `{ data: [...], meta: {...} }`.
 * Single-object commands (retrieve/create/update) print the full envelope
 * with `--format json`, so the default is fine for those.
 *
 * @param args - CLI arguments (e.g., ['available-phone-numbers', 'list', '--filter.country-code', 'US'])
 * @param opts - Optional overrides for timeout, env, output format, and stdin request body.
 *   Set formatPosition to "root" when a subcommand defines its own --format
 *   request flag; this places the output flag before the command hierarchy so
 *   urfave does not bind it to the subcommand flag.
 * @returns Parsed JSON response from the CLI (typically { data: ... } or { data: [...], meta: ... }).
 *   Set rawResponse to preserve the complete stdout body without JSON parsing.
 *   The body is still buffered by child_process and therefore remains bounded by maxBuffer.
 */
export async function telnyxCli(
  args: string[],
  opts?: {
    timeout?: number;
    env?: Record<string, string | undefined>;
    format?: "json" | "raw";
    formatPosition?: "command" | "root";
    stdin?: string;
    minimumVersion?: string;
    rawResponse?: boolean;
  },
): Promise<any> {
  const timeout = opts?.timeout ?? 60000;
  const binary = await getTelnyxBinary(opts?.minimumVersion);
  try {
    const outputFormatArgs = ["--format", opts?.format ?? "json"];
    const executionArgs = opts?.formatPosition === "root"
      ? [...outputFormatArgs, ...args]
      : [...args, ...outputFormatArgs];
    const execution = execFileAsync(binary, executionArgs, {
      env: { ...process.env, ...opts?.env } as NodeJS.ProcessEnv,
      timeout,
      maxBuffer: 10 * 1024 * 1024, // 10MB — some list responses can be large
    });
    if (opts?.stdin !== undefined) execution.child.stdin?.end(opts.stdin);
    const { stdout } = await execution;
    if (opts?.rawResponse) return stdout;
    const trimmed = stdout.trim();
    if (!trimmed) return {};
    // The Go CLI should output clean JSON with --format json, but keep the
    // findJsonStart safety net in case of unexpected prefix output.
    const jsonStart = findJsonStart(trimmed);
    if (jsonStart < 0) {
      throw new Error(`No JSON found in telnyx CLI output: ${trimmed.slice(0, 200)}`);
    }
    return JSON.parse(trimmed.slice(jsonStart));
  } catch (err: any) {
    // execFile error with exit code
    if (err instanceof IncompatibleTelnyxCLIError) throw err;
    if (err.code === "ENOENT") {
      throw new IncompatibleTelnyxCLIError(binary, null);
    }
    if (err.killed) {
      throw new Error(`telnyx CLI timed out after ${timeout}ms`);
    }
    if (err.status !== undefined || err.code !== undefined) {
      const exitCode = err.status ?? err.code ?? 1;
      if (opts?.rawResponse) {
        throw new TelnyxCLIError(
          typeof exitCode === "number" ? exitCode : 1,
          "telnyx CLI failed while producing a raw response",
        );
      }
      const rawStdout = err.stdout?.toString() || "";
      const rawStderr = err.stderr?.toString() || "";
      // Combine both streams — the CLI may write errors to either
      const errorText = rawStdout + rawStderr;
      // Try to find and parse JSON in the error output
      const jsonStart = findJsonStart(errorText);
      if (jsonStart >= 0) {
        try {
          const errorJson = JSON.parse(errorText.slice(jsonStart));
          throw new TelnyxCLIError(
            typeof exitCode === "number" ? exitCode : 1,
            JSON.stringify(errorJson),
          );
        } catch (parseErr) {
          if (parseErr instanceof TelnyxCLIError) throw parseErr;
        }
      }
      // No JSON — extract the human-readable error message
      const cleanError = errorText
        .split("\n")
        .map((line: string) => line.trim())
        .filter((line: string) => line && !line.startsWith("ℹ"))
        .join(" ");
      throw new TelnyxCLIError(
        typeof exitCode === "number" ? exitCode : 1,
        cleanError || errorText.trim(),
      );
    }
    throw err;
  }
}

/**
 * Run a generated CLI action whose successful response is opaque text rather
 * than JSON (for example a JWT or a WireGuard configuration). The returned
 * string is deliberately not trimmed or parsed: callers that explicitly opt
 * into sensitive JSON output receive the exact stdout payload.
 *
 * On failure stdout is intentionally discarded. These actions can return
 * credentials, so a partial response must never be echoed in an error message.
 */
export async function telnyxCliRaw(
  args: string[],
  opts?: {
    timeout?: number;
    env?: Record<string, string | undefined>;
    formatPosition?: "command" | "root";
    stdin?: string;
    minimumVersion?: string;
  },
): Promise<string> {
  const timeout = opts?.timeout ?? 60000;
  const binary = await getTelnyxBinary(opts?.minimumVersion);
  try {
    const outputFormatArgs = ["--format", "raw"];
    const executionArgs = opts?.formatPosition === "root"
      ? [...outputFormatArgs, ...args]
      : [...args, ...outputFormatArgs];
    const execution = execFileAsync(binary, executionArgs, {
      env: { ...process.env, ...opts?.env } as NodeJS.ProcessEnv,
      timeout,
      maxBuffer: 10 * 1024 * 1024,
    });
    if (opts?.stdin !== undefined) execution.child.stdin?.end(opts.stdin);
    const { stdout } = await execution;
    return stdout;
  } catch (err: any) {
    if (err instanceof IncompatibleTelnyxCLIError) throw err;
    if (err.code === "ENOENT") throw new IncompatibleTelnyxCLIError(binary, null);
    if (err.killed) throw new Error(`telnyx CLI timed out after ${timeout}ms`);
    if (err.status !== undefined || err.code !== undefined) {
      // Do not include stdout: a failed request may still have emitted a
      // credential/config payload before exiting non-zero.
      throw new TelnyxCLIError(
        typeof (err.status ?? err.code) === "number" ? (err.status ?? err.code) : 1,
        "Telnyx CLI request failed; sensitive response output was suppressed.",
      );
    }
    throw err;
  }
}
