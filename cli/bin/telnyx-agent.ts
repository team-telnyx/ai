/**
 * telnyx-agent — Agent-friendly CLI for Telnyx API v2.
 * Composite commands that reduce multi-step workflows to a single command.
 *
 * This module is the TypeScript entrypoint. It is launched via the bundled tsx
 * runtime by bin/telnyx-agent.mjs (the package `bin`), not executed directly, so
 * it intentionally carries no shebang. See bin/telnyx-agent.mjs and AIF-333.
 */

import { run } from "../src/index.ts";

run(process.argv.slice(2)).catch((err) => {
  console.error("Fatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});
