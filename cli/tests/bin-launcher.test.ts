/**
 * Regression tests for the package bin launcher (AIF-333).
 *
 * The CLI must be usable out of the box on Linux, macOS, and Windows. The
 * previous entrypoint shebang was `#!/usr/bin/env npx tsx` — a multi-argument
 * shebang that Linux `env` rejects without `-S`, making the very first command
 * fail with "env: 'npx tsx': No such file or directory".
 *
 * These tests lock in the fix: the package bin is a plain-JS launcher with a
 * portable single-argument `#!/usr/bin/env node` shebang that spawns the bundled
 * tsx runtime on the TS entrypoint, forwards argv, and passes exit codes through.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliRoot = join(__dirname, "..");
const launcher = join(cliRoot, "bin", "telnyx-agent.mjs");
const entrypoint = join(cliRoot, "bin", "telnyx-agent.ts");

describe("bin launcher shebang portability (AIF-333)", () => {
  it("package.json bin points at the .mjs launcher, not the .ts entrypoint", () => {
    const pkg = JSON.parse(readFileSync(join(cliRoot, "package.json"), "utf8"));
    assert.equal(pkg.bin["telnyx-agent"], "./bin/telnyx-agent.mjs");
  });

  it("launcher uses a portable single-argument env shebang", () => {
    const firstLine = readFileSync(launcher, "utf8").split("\n", 1)[0];
    // Must be exactly `#!/usr/bin/env node` — a single argument to env. A
    // multi-argument shebang (e.g. `env npx tsx`) breaks on Linux without -S.
    assert.equal(firstLine, "#!/usr/bin/env node");
    assert.doesNotMatch(firstLine, /\bnpx\b/);
    const args = firstLine.replace("#!/usr/bin/env ", "").trim().split(/\s+/);
    assert.equal(args.length, 1, `env shebang must take one arg, got: ${args.join(" ")}`);
  });

  it("the TS entrypoint no longer carries a broken multi-arg shebang", () => {
    const firstLine = readFileSync(entrypoint, "utf8").split("\n", 1)[0];
    assert.doesNotMatch(firstLine, /^#!/, "entrypoint should not be directly executable");
  });

  it("launcher boots the CLI and prints usage (exit 0)", () => {
    const out = execFileSync(process.execPath, [launcher, "--help"], {
      cwd: cliRoot,
      encoding: "utf8",
      timeout: 30000,
    });
    assert.match(out, /telnyx-agent/);
    assert.match(out, /Usage:/);
  });

  it("launcher forwards argv to the CLI (unknown command name echoed)", () => {
    // Exercise argv forwarding without touching the network or live account
    // state: an unknown command makes the CLI echo the name back and print
    // usage, proving argv reached the TS entrypoint through the launcher.
    const result = spawnSync(process.execPath, [launcher, "totally-made-up-cmd"], {
      cwd: cliRoot,
      encoding: "utf8",
      timeout: 30000,
    });
    const combined = `${result.stdout ?? ""}${result.stderr ?? ""}`;
    assert.match(combined, /totally-made-up-cmd/);
    assert.match(combined, /Usage:/);
  });

  it("launcher passes through a non-zero exit code on unknown command", () => {
    const result = spawnSync(process.execPath, [launcher, "definitely-not-a-command"], {
      cwd: cliRoot,
      encoding: "utf8",
      timeout: 30000,
    });
    assert.notEqual(result.status, 0, "unknown command must exit non-zero");
  });
});
