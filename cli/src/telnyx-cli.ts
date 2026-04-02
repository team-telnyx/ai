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

const execFileAsync = promisify(execFile);

/**
 * Resolve the telnyx binary path.
 * Checks the vendor/ directory first (installed by postinstall), then falls back to PATH.
 */
function findTelnyxBinary(): string {
  // Check vendor directory first (installed by postinstall)
  const vendorPath = join(dirname(fileURLToPath(import.meta.url)), "..", "vendor", "telnyx");
  if (existsSync(vendorPath)) return vendorPath;
  // Fall back to PATH
  return "telnyx";
}

const TELNYX_BINARY = findTelnyxBinary();

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
 * Automatically appends `--format json` to all commands.
 *
 * @param args - CLI arguments (e.g., ['available-phone-numbers', 'list', '--filter.country-code', 'US'])
 * @param opts - Optional overrides for timeout and env
 * @returns Parsed JSON response from the CLI (typically { data: ... } or { data: [...], meta: ... })
 */
export async function telnyxCli(
  args: string[],
  opts?: { timeout?: number; env?: Record<string, string | undefined> },
): Promise<any> {
  const timeout = opts?.timeout ?? 60000;
  try {
    const { stdout } = await execFileAsync(TELNYX_BINARY, [...args, "--format", "json"], {
      env: { ...process.env, ...opts?.env } as NodeJS.ProcessEnv,
      timeout,
      maxBuffer: 10 * 1024 * 1024, // 10MB — some list responses can be large
    });
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
    if (err.code === "ENOENT") {
      throw new Error(
        "telnyx CLI not found. Install it with: go install github.com/team-telnyx/telnyx-cli/cmd/telnyx@latest",
      );
    }
    if (err.killed) {
      throw new Error(`telnyx CLI timed out after ${timeout}ms`);
    }
    if (err.status !== undefined || err.code !== undefined) {
      const exitCode = err.status ?? err.code ?? 1;
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
