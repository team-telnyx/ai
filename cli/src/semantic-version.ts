export interface SemanticVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease: string[];
}

const SEMANTIC_VERSION_RE = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;
const TELNYX_GO_CLI_VERSION_RE = /telnyx version (\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?)/i;

/** Extract the version only from the Telnyx Go CLI's `telnyx version ...` identity. */
export function parseTelnyxGoCliVersion(output: string): string | null {
  return TELNYX_GO_CLI_VERSION_RE.exec(output)?.[1] ?? null;
}

export function parseSemanticVersion(value: string): SemanticVersion | null {
  const match = SEMANTIC_VERSION_RE.exec(value);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4]?.split(".") ?? [],
  };
}

/** Compare complete SemVer values, including prerelease precedence. */
export function compareSemanticVersions(left: string, right: string): number | null {
  const a = parseSemanticVersion(left);
  const b = parseSemanticVersion(right);
  if (!a || !b) return null;

  for (const key of ["major", "minor", "patch"] as const) {
    if (a[key] !== b[key]) return a[key] < b[key] ? -1 : 1;
  }
  if (a.prerelease.length === 0 || b.prerelease.length === 0) {
    return a.prerelease.length === b.prerelease.length ? 0 : a.prerelease.length === 0 ? 1 : -1;
  }
  const length = Math.max(a.prerelease.length, b.prerelease.length);
  for (let i = 0; i < length; i++) {
    const aPart = a.prerelease[i];
    const bPart = b.prerelease[i];
    if (aPart === undefined || bPart === undefined) return aPart === undefined ? -1 : 1;
    if (aPart === bPart) continue;
    const aNumeric = /^\d+$/.test(aPart);
    const bNumeric = /^\d+$/.test(bPart);
    if (aNumeric && bNumeric) return Number(aPart) < Number(bPart) ? -1 : 1;
    if (aNumeric !== bNumeric) return aNumeric ? -1 : 1;
    return aPart < bPart ? -1 : 1;
  }
  return 0;
}
