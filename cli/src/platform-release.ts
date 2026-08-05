import { join } from "node:path";

export const TELNYX_CLI_VERSION = "0.24.0";

export interface TelnyxCliRelease {
  archiveName: string;
  executableName: "telnyx" | "telnyx.exe";
}

const RELEASES: Readonly<Record<string, TelnyxCliRelease>> = {
  "darwin-x64": { archiveName: `telnyx_${TELNYX_CLI_VERSION}_macos_amd64.zip`, executableName: "telnyx" },
  "darwin-arm64": { archiveName: `telnyx_${TELNYX_CLI_VERSION}_macos_arm64.zip`, executableName: "telnyx" },
  "linux-x64": { archiveName: `telnyx_${TELNYX_CLI_VERSION}_linux_amd64.tar.gz`, executableName: "telnyx" },
  "linux-arm64": { archiveName: `telnyx_${TELNYX_CLI_VERSION}_linux_arm64.tar.gz`, executableName: "telnyx" },
  "win32-x64": { archiveName: `telnyx_${TELNYX_CLI_VERSION}_windows_amd64.zip`, executableName: "telnyx.exe" },
  "win32-arm64": { archiveName: `telnyx_${TELNYX_CLI_VERSION}_windows_arm64.zip`, executableName: "telnyx.exe" },
};

export function getTelnyxCliRelease(platform: NodeJS.Platform, arch: string): TelnyxCliRelease | null {
  return RELEASES[`${platform}-${arch}`] ?? null;
}

export function telnyxCliReleaseUrl(release: TelnyxCliRelease): string {
  return `https://github.com/team-telnyx/telnyx-cli/releases/download/v${TELNYX_CLI_VERSION}/${release.archiveName}`;
}

export function vendoredTelnyxCliPath(vendorDir: string, platform: NodeJS.Platform): string {
  return join(vendorDir, platform === "win32" ? "telnyx.exe" : "telnyx");
}
