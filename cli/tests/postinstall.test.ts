import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { getTelnyxCliRelease } from "../src/platform-release.ts";

const cliDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function executable(path: string, body: string): void {
  writeFileSync(path, `#!/bin/sh\n${body}\n`);
  chmodSync(path, 0o755);
}

function runPostinstall(options: {
  vendorOutput?: string;
  vendorExitCode?: number;
  pathOutput?: string;
} = {}) {
  const root = mkdtempSync(join(tmpdir(), "telnyx-postinstall-"));
  tempDirs.push(root);
  mkdirSync(join(root, "scripts"));
  mkdirSync(join(root, "src"));
  mkdirSync(join(root, "fake-bin"));
  cpSync(join(cliDir, "scripts", "postinstall.ts"), join(root, "scripts", "postinstall.ts"));
  cpSync(join(cliDir, "src", "semantic-version.ts"), join(root, "src", "semantic-version.ts"));
  cpSync(join(cliDir, "src", "platform-release.ts"), join(root, "src", "platform-release.ts"));

  const vendor = join(root, "vendor", "telnyx");
  if (options.vendorOutput !== undefined) {
    mkdirSync(dirname(vendor), { recursive: true });
    executable(vendor, `echo "${options.vendorOutput}"\nexit ${options.vendorExitCode ?? 0}`);
  }
  executable(join(root, "fake-bin", "telnyx"), `echo "${options.pathOutput ?? "telnyx version 0.27.0"}"`);
  executable(join(root, "fake-bin", "curl"), `printf '%s\\n' "$@" > "${join(root, "download-args")}"`);
  const installAfter = (flag: string) =>
    `printf '%s\\n' "$@" > "${join(root, "extract-args")}"; ` +
    `while [ "$#" -gt 0 ] && [ "$1" != "${flag}" ]; do shift; done; ` +
    `[ "$#" -ge 2 ] || exit 64; shift; mkdir -p "$1"; ` +
    `printf '#!/bin/sh\\necho "telnyx version 0.27.0"\\n' > "$1/telnyx"`;
  executable(join(root, "fake-bin", "tar"), installAfter("-C"));
  executable(join(root, "fake-bin", "unzip"), installAfter("-d"));
  executable(join(root, "fake-bin", "rm"), "exit 0");

  const result = spawnSync(process.execPath, ["--import", "tsx", join(root, "scripts", "postinstall.ts")], {
    encoding: "utf8",
    cwd: cliDir,
    env: { ...process.env, PATH: `${join(root, "fake-bin")}:${process.env.PATH ?? ""}` },
    timeout: 10000,
  });
  return {
    ...result,
    downloaded: existsSync(join(root, "download-args")),
    downloadArgs: existsSync(join(root, "download-args")) ? readFileSync(join(root, "download-args"), "utf8") : "",
    extractArgs: existsSync(join(root, "extract-args")) ? readFileSync(join(root, "extract-args"), "utf8") : "",
    installedVersion: existsSync(vendor) ? readFileSync(vendor, "utf8") : "",
  };
}

describe("postinstall vendor-first version decision", () => {
  it("refreshes a stale preferred vendor even when PATH is compatible", () => {
    const result = runPostinstall({ vendorOutput: "telnyx version 0.21.0" });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.downloaded, true);
    assert.match(result.stdout, /Vendored telnyx CLI 0\.21\.0 found/);
    assert.match(result.installedVersion, /0\.27\.0/);
  });

  it("keeps a current preferred vendor without downloading", () => {
    const result = runPostinstall({
      vendorOutput: "telnyx version 0.27.0",
      pathOutput: "telnyx version 0.28.0",
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.downloaded, false);
    assert.match(result.stdout, /already installed vendored/);
  });

  it("allows compatible PATH to suppress download only when vendor is absent", () => {
    const result = runPostinstall({ pathOutput: "telnyx version 0.28.0" });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.downloaded, false);
    assert.match(result.stdout, /already installed on PATH/);
  });

  it("refreshes an unrelated preferred vendor even when PATH is compatible", () => {
    const result = runPostinstall({
      vendorOutput: "@telnyx/api-cli/0.28.0 darwin-arm64",
      pathOutput: "telnyx version 0.28.0",
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.downloaded, true);
    assert.match(result.stdout, /Vendored telnyx CLI has an unrecognized version/);
    assert.match(result.installedVersion, /0\.27\.0/);
  });

  it("does not let an unrelated PATH candidate suppress download", () => {
    const result = runPostinstall({ pathOutput: "unrelated-tool v0.28.0" });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.downloaded, true);
    assert.match(result.stdout, /telnyx CLI on PATH has an unrecognized version/);
  });

  it("refreshes a malformed preferred vendor", () => {
    const result = runPostinstall({ vendorOutput: "telnyx version definitely-not-semver" });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.downloaded, true);
    assert.match(result.stdout, /Vendored telnyx CLI has an unrecognized version/);
  });

  it("refreshes a preferred vendor whose version command fails", () => {
    const result = runPostinstall({
      vendorOutput: "telnyx version 0.28.0",
      vendorExitCode: 1,
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.downloaded, true);
    assert.match(result.stdout, /Vendored telnyx CLI could not be validated/);
  });
});

describe("postinstall current-host release", () => {
  it("downloads and extracts the exact archive selected for the current host", () => {
    const result = runPostinstall({ pathOutput: "unrelated-tool" });
    const release = getTelnyxCliRelease(process.platform, process.arch);
    assert.ok(release, `test host ${process.platform}-${process.arch} must be supported`);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.downloaded, true);
    assert.ok(result.downloadArgs.trimEnd().endsWith(release.archiveName));
    assert.ok(result.downloadArgs.includes(`releases/download/v0.27.0/${release.archiveName}`));
    assert.ok(result.extractArgs.includes(release.archiveName));
    assert.ok(result.extractArgs.split("\n").includes(release.executableName));
    assert.match(result.installedVersion, /0\.27\.0/);
  });
});
