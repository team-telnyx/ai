/**
 * Regression tests for --version / -V support.
 *
 * The CLI must respond to --version and -V by printing the package version
 * and exiting 0. Previously these fell through to "Unknown command" and
 * exited non-zero (found by blind E2E test agent, 2026-07-26).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliRoot = join(__dirname, "..");
const launcher = join(cliRoot, "bin", "telnyx-agent.mjs");

describe("--version / -V support", () => {
  it("--version prints the package version and exits 0", () => {
    const pkg = JSON.parse(readFileSync(join(cliRoot, "package.json"), "utf8"));
    const out = execFileSync(process.execPath, [launcher, "--version"], {
      cwd: cliRoot,
      encoding: "utf8",
      timeout: 30000,
    });
    assert.equal(out.trim(), pkg.version);
  });

  it("-V prints the package version and exits 0", () => {
    const pkg = JSON.parse(readFileSync(join(cliRoot, "package.json"), "utf8"));
    const out = execFileSync(process.execPath, [launcher, "-V"], {
      cwd: cliRoot,
      encoding: "utf8",
      timeout: 30000,
    });
    assert.equal(out.trim(), pkg.version);
  });

  it("--version does NOT print usage or 'Unknown command'", () => {
    const out = execFileSync(process.execPath, [launcher, "--version"], {
      cwd: cliRoot,
      encoding: "utf8",
      timeout: 30000,
    });
    assert.doesNotMatch(out, /Unknown command/i);
    assert.doesNotMatch(out, /Usage:/);
  });
});
