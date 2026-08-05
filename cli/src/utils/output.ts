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

export function parseFlags(args: string[]): {
  command: string;
  flags: Record<string, string | boolean>;
  occurrences: Record<string, Array<string | boolean>>;
} {
  const command = args[0] ?? "help";
  const flags: Record<string, string | boolean> = {};
  const occurrences: Record<string, Array<string | boolean>> = Object.create(null);

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = args[i + 1];
      // Empty strings are meaningful for fields such as an AI assistant greeting,
      // where `--greeting ""` tells the assistant to wait for the user to speak.
      if (next !== undefined && !next.startsWith("--")) {
        flags[key] = next;
        (occurrences[key] ??= []).push(next);
        i++;
      } else {
        flags[key] = true;
        (occurrences[key] ??= []).push(true);
      }
    }
  }

  return { command, flags, occurrences };
}
