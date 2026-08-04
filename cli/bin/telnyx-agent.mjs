#!/usr/bin/env node
/**
 * telnyx-agent launcher.
 *
 * This plain-JS launcher is the package `bin`. It exists so the executable
 * shebang is a portable single-argument `#!/usr/bin/env node`, which works on
 * Linux, macOS, and Windows.
 *
 * The previous entrypoint used `#!/usr/bin/env npx tsx`. That is a multi-argument
 * shebang, which Linux `env` rejects without `-S` ("env: 'npx tsx': No such file
 * or directory"), leaving the CLI unusable out of the box (AIF-333). Even the
 * `-S` form (`#!/usr/bin/env -S npx tsx`) requires coreutils >= 8.30 and pays an
 * `npx` resolution cost on every invocation.
 *
 * Instead we resolve the bundled `tsx` runtime (a declared dependency) and spawn
 * it on the TypeScript entrypoint, forwarding argv and exit status. No `npx`, no
 * network, no multi-arg shebang.
 */
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const entrypoint = join(here, "telnyx-agent.ts");

// Resolve the bundled tsx CLI from this package's own dependency tree so we do
// not depend on a globally installed `tsx`/`npx`.
//
// We do NOT rely solely on the `tsx/cli` subpath export: across tsx versions
// that export has moved/changed, so on some installs `require.resolve("tsx/cli")`
// throws and the launcher would die before spawning anything. Resolve the
// package's own declared `bin` target from its package.json (the authoritative
// entrypoint), and fall back to the subpath export and the `.bin/tsx` shim.
function resolveTsxCli() {
  // 1) Authoritative: read tsx's package.json `bin` and resolve it relative to
  //    the package root. Works regardless of the `exports` map.
  try {
    const pkgJsonPath = require.resolve("tsx/package.json");
    const pkg = require(pkgJsonPath);
    const binRel = typeof pkg.bin === "string" ? pkg.bin : pkg.bin?.tsx;
    if (binRel) {
      return join(dirname(pkgJsonPath), binRel);
    }
  } catch {
    // fall through
  }
  // 2) The subpath export, when present.
  try {
    return require.resolve("tsx/cli");
  } catch {
    // fall through
  }
  // 3) The installed bin shim.
  try {
    return require.resolve(".bin/tsx");
  } catch {
    return undefined;
  }
}

const tsxCli = resolveTsxCli();
if (!tsxCli) {
  console.error(
    "telnyx-agent: unable to locate the bundled 'tsx' runtime. " +
      "Reinstall the package (npm i -g @telnyx/agent-cli) to restore it.",
  );
  process.exit(1);
}

const result = spawnSync(process.execPath, [tsxCli, entrypoint, ...process.argv.slice(2)], {
  stdio: "inherit",
});

if (result.error) {
  console.error(`telnyx-agent: failed to launch — ${result.error.message}`);
  process.exit(1);
}

// Re-raise a terminating signal as a non-zero exit; otherwise forward the code.
if (result.signal) {
  process.exit(1);
}
process.exit(result.status ?? 0);
