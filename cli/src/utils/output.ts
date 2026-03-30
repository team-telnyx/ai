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
  console.log(JSON.stringify(data, null, 2));
}

export function parseFlags(args: string[]): { command: string; flags: Record<string, string | boolean> } {
  const command = args[0] ?? "help";
  const flags: Record<string, string | boolean> = {};

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    }
  }

  return { command, flags };
}
