#!/usr/bin/env node
/**
 * E2E test shim for the bundled telnyx Go CLI.
 *
 * findTelnyxBinary() honours TELNYX_CLI_PATH first, so the walkthrough points
 * that env var at this shim. The shim forwards every call to the REAL vendored
 * Go binary but injects `--base-url <mock>` (from TELNYX_E2E_BASE_URL) so the
 * CLI's own HTTP calls hit the local mock instead of the live Telnyx API.
 * This lets the full E2E exercise the Go-CLI shell-out commands (send-sms,
 * sms-status, number search/order) with ZERO real spend.
 */
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const realBin = join(here, "..", "vendor", "telnyx");
const base = process.env.TELNYX_E2E_BASE_URL;

const args = process.argv.slice(2);
// Inject --base-url right after the subcommand chain, before flags, unless
// the caller already set one. The Go CLI accepts it as a global flag anywhere.
if (base && !args.includes("--base-url")) {
  args.push("--base-url", base);
}

const r = spawnSync(realBin, args, { stdio: "inherit" });
process.exit(r.status ?? 1);
