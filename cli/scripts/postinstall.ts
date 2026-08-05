#!/usr/bin/env tsx
/**
 * Postinstall script — downloads the telnyx CLI (Go binary) for the current platform.
 * Same pattern as esbuild, prisma, turbo.
 */
import { execFileSync, execSync } from "node:child_process";
import { existsSync, mkdirSync, chmodSync } from "node:fs";
import { join } from "node:path";
import { compareSemanticVersions, parseTelnyxGoCliVersion } from "../src/semantic-version.ts";
import {
  getTelnyxCliRelease,
  TELNYX_CLI_VERSION,
  telnyxCliReleaseUrl,
  vendoredTelnyxCliPath,
} from "../src/platform-release.ts";

const VERSION = TELNYX_CLI_VERSION; // Includes Anthropic Messages and calls dial --retry-on-timeout

async function main() {
  const binDir = join(import.meta.dirname || __dirname, "..", "vendor");
  const binaryPath = vendoredTelnyxCliPath(binDir, process.platform);
  const vendorExists = existsSync(binaryPath);

  // Runtime prefers the platform-specific vendored executable, so validate it before considering PATH. A
  // stale vendor must be refreshed even when PATH contains a compatible CLI.
  const candidate = vendorExists ? binaryPath : "telnyx";
  try {
    const out = execFileSync(candidate, ["--version"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    const installedVersion = parseTelnyxGoCliVersion(out);
    if (installedVersion) {
      const comparison = compareSemanticVersions(installedVersion, VERSION);
      if (comparison !== null && comparison >= 0) {
        const location = vendorExists ? "vendored" : "on PATH";
        console.log(`✓ telnyx CLI ${installedVersion} already installed ${location} (>= ${VERSION})`);
        return;
      }
      const location = vendorExists ? "Vendored telnyx CLI" : "telnyx CLI on PATH";
      console.log(`⚠ ${location} ${installedVersion} found but ${VERSION} required — downloading…`);
    } else {
      const location = vendorExists ? "Vendored telnyx CLI" : "telnyx CLI on PATH";
      console.log(`⚠ ${location} has an unrecognized version — downloading v${VERSION}…`);
    }
  } catch {
    if (vendorExists) {
      console.log(`⚠ Vendored telnyx CLI could not be validated — downloading v${VERSION}…`);
    }
  }

  const key = `${process.platform}-${process.arch}`;
  const release = getTelnyxCliRelease(process.platform, process.arch);
  if (!release) {
    console.warn(
      `⚠ No prebuilt telnyx CLI for ${key}. Install manually: go install github.com/team-telnyx/telnyx-cli/cmd/telnyx@latest`,
    );
    return;
  }

  mkdirSync(binDir, { recursive: true });

  const url = telnyxCliReleaseUrl(release);
  const archivePath = join(binDir, release.archiveName);

  console.log(`Downloading telnyx CLI v${VERSION} for ${key}...`);

  // Download
  execSync(`curl -fsSL -o "${archivePath}" "${url}"`);

  // Extract
  if (release.archiveName.endsWith(".tar.gz")) {
    execSync(`tar -xzf "${archivePath}" -C "${binDir}" "${release.executableName}"`, {
      stdio: "inherit",
    });
  } else if (release.archiveName.endsWith(".zip")) {
    execSync(`unzip -o "${archivePath}" "${release.executableName}" -d "${binDir}"`, {
      stdio: "inherit",
    });
  }

  // Cleanup archive
  execSync(`rm -f "${archivePath}"`);

  // Make executable
  if (existsSync(binaryPath)) {
    chmodSync(binaryPath, 0o755);
    console.log(`✓ telnyx CLI v${VERSION} installed to ${binaryPath}`);
  }
}

main().catch((err) => {
  console.warn(`⚠ Failed to install telnyx CLI: ${err.message}`);
  console.warn(
    "Install manually: go install github.com/team-telnyx/telnyx-cli/cmd/telnyx@latest",
  );
  // Don't fail the install — the CLI will give a helpful error at runtime
});
