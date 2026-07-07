#!/usr/bin/env tsx
/**
 * Postinstall script — downloads the telnyx CLI (Go binary) for the current platform.
 * Same pattern as esbuild, prisma, turbo.
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, chmodSync } from "node:fs";
import { join } from "node:path";

const VERSION = "0.21.0"; // Pin to known working version (adds whatsapp:user-data, conversation windows, and CLI bug fixes)

const PLATFORM_MAP: Record<string, string> = {
  "darwin-arm64": `telnyx_${VERSION}_macos_arm64.zip`,
  "darwin-x64": `telnyx_${VERSION}_macos_amd64.zip`,
  "linux-x64": `telnyx_${VERSION}_linux_amd64.tar.gz`,
  "linux-arm64": `telnyx_${VERSION}_linux_arm64.tar.gz`,
  "win32-x64": `telnyx_${VERSION}_windows_amd64.zip`,
};

async function main() {
  // Skip if telnyx is already on PATH AND at the required version.
  // An older CLI on PATH would leave WhatsApp and other commands broken,
  // so we check the version before skipping the download.
  try {
    const out = execSync("telnyx --version", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    const installedVersion = out.match(/v?(\d+\.\d+\.\d+)/)?.[1];
    if (installedVersion) {
      const [maj, min] = installedVersion.split(".").map(Number);
      const [reqMaj, reqMin] = VERSION.split(".").map(Number);
      if (maj > reqMaj || (maj === reqMaj && min >= reqMin)) {
        console.log(`✓ telnyx CLI ${installedVersion} already installed (>= ${VERSION})`);
        return;
      }
      console.log(`⚠ telnyx CLI ${installedVersion} found but ${VERSION} required — downloading…`);
    } else {
      console.log("✓ telnyx CLI already installed");
      return;
    }
  } catch {}

  const key = `${process.platform}-${process.arch}`;
  const filename = PLATFORM_MAP[key];
  if (!filename) {
    console.warn(
      `⚠ No prebuilt telnyx CLI for ${key}. Install manually: go install github.com/team-telnyx/telnyx-cli/cmd/telnyx@latest`,
    );
    return;
  }

  const binDir = join(import.meta.dirname || __dirname, "..", "vendor");
  mkdirSync(binDir, { recursive: true });

  const url = `https://github.com/team-telnyx/telnyx-cli/releases/download/v${VERSION}/${filename}`;
  const archivePath = join(binDir, filename);

  console.log(`Downloading telnyx CLI v${VERSION} for ${key}...`);

  // Download
  execSync(`curl -fsSL -o "${archivePath}" "${url}"`);

  // Extract
  if (filename.endsWith(".tar.gz")) {
    execSync(`tar -xzf "${archivePath}" -C "${binDir}" telnyx`, {
      stdio: "inherit",
    });
  } else if (filename.endsWith(".zip")) {
    execSync(`unzip -o "${archivePath}" telnyx -d "${binDir}"`, {
      stdio: "inherit",
    });
  }

  // Cleanup archive
  execSync(`rm -f "${archivePath}"`);

  // Make executable
  const binaryPath = join(binDir, "telnyx");
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
