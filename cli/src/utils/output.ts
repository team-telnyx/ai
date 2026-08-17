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
  return /(^|_)(password|passphrase|secret|token|api_key)$/i.test(key)
    || /^(sipPassword|pin_?passcode)$/i.test(key);
}

/**
 * Flags that are inherently boolean. They normally do not consume the next
 * argv token as a value. Presence-only safety/action flags are the exception:
 * parseFlags captures an adjacent explicit value so the command can reject it,
 * while still leaving `-h`/`--help` available for help interception.
 *
 * This set is also used by the `isHelpRequested` guard in `index.ts`, together
 * with command-scoped boolean flags, ensuring a help token following any boolean
 * flag is never swallowed as its value.
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
  "confirm",
  "create",
  "clear-tags",
  "clear-tool-ids",
  "stream",
  "submit",
  "disable-cache",
  "deepfake-detection",
]);

const COMMAND_BOOLEAN_FLAGS = new Map<string, Set<string>>([
  ["call-dial", new Set(["retry-on-timeout", "transcription"])],
  ["create-conference", new Set(["comfort-noise", "start-conference-on-create"])],
  ["conference-control", new Set([
    "end-conference-on-exit", "hold", "mute", "play-beep",
    "soft-end-conference-on-exit", "start-conference-on-enter", "stop-playback-on-dtmf",
  ])],
  ["list-conference-participants", new Set(["muted", "on-hold", "whispering"])],
  ["list-room-sessions", new Set(["active", "include-participants"])],
  ["get-room-session", new Set(["include-participants"])],
  ["email-send", new Set([
    "ignore-suppression", "inline-css", "reply-to-all", "sandbox-mode",
  ])],
  ["web-search", new Set(["livecrawl"])],
  ["web-research", new Set(["background"])],
  ["create-messaging-profile", new Set([
    "daily-spend-limit-enabled", "enabled", "mms-fall-back-to-sms",
    "mms-transcoding", "mobile-only", "smart-encoding",
  ])],
  ["update-messaging-profile", new Set([
    "daily-spend-limit-enabled", "enabled", "mms-fall-back-to-sms",
    "mms-transcoding", "mobile-only", "smart-encoding",
  ])],
]);

export function isBooleanFlag(command: string, key: string): boolean {
  return BOOLEAN_FLAGS.has(key) || COMMAND_BOOLEAN_FLAGS.get(command)?.has(key) === true;
}

// These safety/consent flags are presence-only. Capture any adjacent value as
// a string so strict handlers can reject valued forms, including true/false.
const VALUE_REJECTING_BOOLEAN_FLAGS = new Set<string>([
  "confirm",
  "clear-tags",
  "clear-tool-ids",
  "submit",
]);

// These action booleans support agent-friendly `--flag true|false` syntax.
// Unknown adjacent values are still captured as strings, which fails safe for
// handlers that enable behavior only when the normalized value is true.
const BOOLEAN_VALUE_FLAGS = new Set<string>([
  "force",
  "record",
  "cancel",
  "create",
  "stream",
  "disable-cache",
  "deepfake-detection",
]);

function isBooleanValueFlag(command: string, key: string): boolean {
  return BOOLEAN_VALUE_FLAGS.has(key)
    || COMMAND_BOOLEAN_FLAGS.get(command)?.has(key) === true;
}

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
      // Boolean flags normally never consume the next token. Strict presence-
      // only flags capture values for rejection; agent-friendly booleans also
      // normalize literal true/false. Help tokens remain available to the loop.
      // Non-boolean flags consume the next token as their value, unless it
      // starts with `--` (another long flag). Empty strings remain meaningful
      // values for fields such as an AI assistant greeting, where
      // `--greeting ""` tells the assistant to wait for the user to speak.
      if (
        (VALUE_REJECTING_BOOLEAN_FLAGS.has(key) || isBooleanValueFlag(command, key))
        && next !== undefined
        && next !== "-h"
        && next !== "--help"
        && !next.startsWith("--")
      ) {
        const value = isBooleanValueFlag(command, key) && (next === "true" || next === "false")
          ? next === "true"
          : next;
        flags[key] = value;
        (occurrences[key] ??= []).push(value);
        i++;
      } else if (!isBooleanFlag(command, key) && next !== undefined && next !== null && !next.startsWith("--")) {
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
