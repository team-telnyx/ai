/**
 * Output formatting utilities — JSON or human-readable.
 */

export interface StepResult {
  step: number;
  name: string;
  status: "completed" | "skipped" | "failed";
  resourceId?: string;
  detail?: string;
  elapsedMs: number;
}

export function printStep(step: StepResult, total: number): void {
  const icon = step.status === "completed" ? "✓" : step.status === "skipped" ? "⊘" : "✗";
  const detail = step.detail ? ` (${step.detail})` : "";
  const rid = step.resourceId ? ` → ${step.resourceId}` : "";
  console.log(`  ${icon} Step ${step.step}/${total}: ${step.name}${detail}${rid}`);
}

export function printSuccess(title: string, details: Record<string, string | number | boolean>): void {
  console.log(`\n🎉 ${title}\n`);
  const maxKey = Math.max(...Object.keys(details).map((k) => k.length));
  for (const [key, value] of Object.entries(details)) {
    console.log(`  ${key.padEnd(maxKey + 2)}${value}`);
  }
  console.log();
}

export function printError(message: string, remediation?: string): void {
  console.error(`\n✗ Error: ${message}`);
  if (remediation) {
    console.error(`  Fix: ${remediation}`);
  }
  console.error();
}

/**
 * Print an error in the correct format based on --json flag, then exit(1).
 * Use this for validation errors in command handlers.
 */
export function failWith(message: string, jsonOutput: boolean): never {
  if (jsonOutput) {
    outputJson({ error: message });
  } else {
    printError(message);
  }
  process.exit(1);
}

export function printWarning(message: string): void {
  console.error(`⚠️  ${message}`);
}

export function outputJson(data: unknown): void {
  console.log(JSON.stringify(redactSensitive(data), null, 2));
}

function redactSensitive<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitive(item)) as T;
  }

  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (isSensitiveKey(key)) {
        out[key] = "[REDACTED]";
      } else {
        out[key] = redactSensitive(nested);
      }
    }
    return out as T;
  }

  return value;
}

function isSensitiveKey(key: string): boolean {
  return /(^|_)(password|passphrase|secret|token|api_key)$/i.test(key) || /^sipPassword$/i.test(key);
}

/**
 * Flags that are inherently boolean — they never consume the next argv token
 * as a value.  This is used by both {@link parseFlags} and the
 * `isHelpRequested` guard in `index.ts` so that a token like `-h` following a
 * boolean flag (e.g. `setup-voice --force -h`) is NOT swallowed as the flag's
 * value and instead reaches the explicit `-h`/`--help` check.
 *
 * Note: fax-specific boolean flags (`monochrome`, `store-media`,
 * `store-preview`, `t38-enabled`) are deliberately excluded because the fax
 * command accepts explicit `--flag=false` values for Go CLI compatibility,
 * which requires parseFlags to treat the next token as a value.
 */
export const BOOLEAN_FLAGS = new Set<string>([
  "json",
  "force",
  "record",
  "cancel",
  "create",
  "stream",
  "submit",
  "disable-cache",
  "deepfake-detection",
  "transcription",
]);

export function parseFlags(args: string[]): {
  command: string;
  flags: Record<string, string | boolean>;
  occurrences: Record<string, Array<string | boolean>>;
  helpRequested: boolean;
} {
  const command = args[0] ?? "help";
  const flags: Record<string, string | boolean> = {};
  const occurrences: Record<string, Array<string | boolean>> = Object.create(null);
  let helpRequested = false;

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h") {
      helpRequested = true;
      continue;
    }
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = args[i + 1];
      // Boolean flags never consume the next token — leave it for the loop
      // to process on its own (it may be another flag like `-h`).
      // Non-boolean flags consume the next token as their value, unless it
      // starts with `--` (another long flag) — same heuristic as before.
      if (!BOOLEAN_FLAGS.has(key) && next !== undefined && next !== null && !next.startsWith("--")) {
        flags[key] = next;
        (occurrences[key] ??= []).push(next);
        i++;
      } else {
        flags[key] = true;
        (occurrences[key] ??= []).push(true);
      }
    }
  }

  return { command, flags, occurrences, helpRequested };
}
