/**
 * Regression tests for findTelnyxBinary()'s silent-fallback bug.
 *
 * Before: when vendor/telnyx was absent, the wrapper silently shelled out to
 * whatever `telnyx` was on PATH. If that was the incompatible `@telnyx/api-cli`
 * (singular commands), real commands crashed with a confusing
 * "command messages:send not found". Now the wrapper verifies a PATH-resolved
 * binary is the Telnyx Go CLI (`telnyx version X.Y.Z`) and hard-fails with an
 * actionable IncompatibleTelnyxCLIError otherwise.
 *
 * verifyTelnyxGoCli() is the exported safeguard; TELNYX_CLI_PATH / vendor
 * remain trusted and are NOT re-verified (tests + the E2E shim depend on that).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, chmodSync, cpSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { telnyxCli, verifyTelnyxGoCli } from "../src/telnyx-cli.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Write an executable fake `telnyx` and return its absolute path. */
function makeFakeTelnyx(script: string): string {
  const tempDir = mkdtempSync(join(tmpdir(), "telnyx-resolve-"));
  const binDir = join(tempDir, "bin");
  mkdirSync(binDir, { recursive: true });
  const p = join(binDir, "telnyx");
  writeFileSync(p, script);
  chmodSync(p, 0o755);
  return p;
}

describe("verifyTelnyxGoCli (silent-fallback safeguard)", () => {
  it("rejects an incompatible CLI (@telnyx/api-cli signature) with an actionable error", async () => {
    const fake = makeFakeTelnyx(
      `#!/usr/bin/env node
const args = process.argv.slice(2);
if (args[0] === "--version") { console.log("@telnyx/api-cli/1.1.0 darwin-arm64 node-v25.6.0"); process.exit(0); }
console.error("command " + args.join(":") + " not found");
process.exit(1);
`,
    );
    await assert.rejects(
      () => verifyTelnyxGoCli(fake),
      (err: any) => {
        assert.equal(err?.name, "IncompatibleTelnyxCLIError");
        assert.match(err.message, /not the Telnyx Go CLI/i);
        assert.match(err.message, /@telnyx\/api-cli/); // surfaces what it actually found
        assert.match(err.message, /go install|npm install|TELNYX_CLI_PATH/); // actionable hint
        return true;
      },
    );
  });

  it("rejects a missing binary (ENOENT) with the install hint", async () => {
    const missing = join(tmpdir(), "definitely-not-a-real-telnyx-binary-xyz");
    await assert.rejects(
      () => verifyTelnyxGoCli(missing),
      (err: any) => {
        assert.equal(err?.name, "IncompatibleTelnyxCLIError");
        assert.match(err.message, /not found/i);
        assert.match(err.message, /go install|npm install|TELNYX_CLI_PATH/);
        return true;
      },
    );
  });

  it("accepts a compatible Telnyx Go CLI (version signature matches)", async () => {
    const fake = makeFakeTelnyx(
      `#!/usr/bin/env node
const args = process.argv.slice(2);
if (args[0] === "--version") { console.log("telnyx version 0.21.0"); process.exit(0); }
process.exit(0);
`,
    );
    await assert.doesNotReject(() => verifyTelnyxGoCli(fake));
  });

  it("accepts even when --version exits non-zero but still prints the Go-CLI signature", async () => {
    const fake = makeFakeTelnyx(
      `#!/usr/bin/env node
console.error("telnyx version 0.21.0");
process.exit(3);
`,
    );
    await assert.doesNotReject(() => verifyTelnyxGoCli(fake));
  });

  it("enforces an optional command-scoped minimum with semantic version precedence", async () => {
    const old = makeFakeTelnyx(`#!/usr/bin/env node
console.log("telnyx version 0.21.0");
`);
    const prerelease = makeFakeTelnyx(`#!/usr/bin/env node
console.log("telnyx version 0.24.0-rc.1");
`);
    const current = makeFakeTelnyx(`#!/usr/bin/env node
console.log("telnyx version 0.24.0");
`);
    const newer = makeFakeTelnyx(`#!/usr/bin/env node
console.log("telnyx version 0.100.0");
`);

    await assert.rejects(() => verifyTelnyxGoCli(old, "0.24.0"), /requires >= 0\.24\.0/);
    await assert.rejects(() => verifyTelnyxGoCli(prerelease, "0.24.0"), /requires >= 0\.24\.0/);
    await assert.doesNotReject(() => verifyTelnyxGoCli(current, "0.24.0"));
    await assert.doesNotReject(() => verifyTelnyxGoCli(newer, "0.24.0"));
  });
});

describe("command-scoped minimum resolution", () => {
  it("falls back from a stale preferred vendor to a compatible PATH Go CLI", () => {
    const cliRoot = join(__dirname, "..");
    const isolatedRoot = mkdtempSync(join(cliRoot, ".resolver-vendor-fallback-"));
    const vendor = join(isolatedRoot, "vendor", "telnyx");
    const compatiblePath = makeFakeTelnyx(`#!/usr/bin/env node
const args = process.argv.slice(2);
if (args[0] === "--version") console.log("telnyx version 0.24.0");
else console.log("{}");
`);
    cpSync(join(cliRoot, "src"), join(isolatedRoot, "src"), { recursive: true });
    mkdirSync(dirname(vendor), { recursive: true });
    writeFileSync(vendor, `#!/usr/bin/env node
console.log("telnyx version 0.21.0");
`);
    chmodSync(vendor, 0o755);

    try {
      const moduleUrl = pathToFileURL(join(isolatedRoot, "src", "telnyx-cli.ts")).href;
      const result = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "--eval",
        `const { telnyxCli } = await import(${JSON.stringify(moduleUrl)}); await telnyxCli(["test"], { minimumVersion: "0.24.0" });`,
      ], {
        cwd: isolatedRoot,
        encoding: "utf8",
        env: {
          ...process.env,
          TELNYX_CLI_PATH: undefined,
          PATH: `${dirname(compatiblePath)}:${process.env.PATH ?? ""}`,
        },
      });
      assert.equal(result.status, 0, result.stderr);
    } finally {
      rmSync(isolatedRoot, { recursive: true, force: true });
    }
  });

  it("keeps an invalid explicit TELNYX_CLI_PATH authoritative", async () => {
    const explicit = makeFakeTelnyx(`#!/usr/bin/env node
console.log("telnyx version 0.21.0");
`);
    const compatiblePath = makeFakeTelnyx(`#!/usr/bin/env node
const args = process.argv.slice(2);
if (args[0] === "--version") console.log("telnyx version 0.24.0");
else console.log("{}");
`);
    const previousOverride = process.env.TELNYX_CLI_PATH;
    const previousPath = process.env.PATH;
    process.env.TELNYX_CLI_PATH = explicit;
    process.env.PATH = `${dirname(compatiblePath)}:${previousPath ?? ""}`;
    try {
      await assert.rejects(
        () => telnyxCli(["ai:anthropic:v1", "messages"], { minimumVersion: "0.24.0" }),
        /0\.21\.0.*requires >= 0\.24\.0/,
      );
    } finally {
      if (previousOverride === undefined) delete process.env.TELNYX_CLI_PATH;
      else process.env.TELNYX_CLI_PATH = previousOverride;
      if (previousPath === undefined) delete process.env.PATH;
      else process.env.PATH = previousPath;
    }
  });
});
