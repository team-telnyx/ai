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
import { mkdtempSync, mkdirSync, writeFileSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { verifyTelnyxGoCli } from "../src/telnyx-cli.ts";

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
});
