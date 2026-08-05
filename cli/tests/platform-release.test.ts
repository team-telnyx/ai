import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import {
  getTelnyxCliRelease,
  TELNYX_CLI_VERSION,
  telnyxCliReleaseUrl,
  vendoredTelnyxCliPath,
} from "../src/platform-release.ts";

describe("Telnyx CLI platform releases", () => {
  const cases = [
    ["darwin", "x64", "telnyx_0.24.0_macos_amd64.zip", "telnyx"],
    ["darwin", "arm64", "telnyx_0.24.0_macos_arm64.zip", "telnyx"],
    ["linux", "x64", "telnyx_0.24.0_linux_amd64.tar.gz", "telnyx"],
    ["linux", "arm64", "telnyx_0.24.0_linux_arm64.tar.gz", "telnyx"],
    ["win32", "x64", "telnyx_0.24.0_windows_amd64.zip", "telnyx.exe"],
    ["win32", "arm64", "telnyx_0.24.0_windows_arm64.zip", "telnyx.exe"],
  ] as const;

  for (const [platform, arch, archiveName, executableName] of cases) {
    it(`maps ${platform}-${arch} to its exact v${TELNYX_CLI_VERSION} asset`, () => {
      const release = getTelnyxCliRelease(platform, arch);
      assert.deepEqual(release, { archiveName, executableName });
      assert.equal(
        telnyxCliReleaseUrl(release!),
        `https://github.com/team-telnyx/telnyx-cli/releases/download/v0.24.0/${archiveName}`,
      );
    });
  }

  it("uses the executable name shipped in Windows archives for the vendor path", () => {
    assert.equal(vendoredTelnyxCliPath("C:\\package\\vendor", "win32"), join("C:\\package\\vendor", "telnyx.exe"));
  });
});
