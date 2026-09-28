/**
 * Shared data-locality validation for Telnyx-hosted AI inference commands.
 *
 * The generated Go CLI exposes --region and --mode starting in v0.32.0.
 * Keep the supplied region opaque: account Data Locality vocabulary is
 * authoritative and may evolve independently of this agent CLI.
 */

export const AI_INFERENCE_DATA_LOCALITY_MINIMUM_CLI_VERSION = "0.32.0";

const DATA_LOCALITY_MODES = new Set(["preferred", "strict"]);

type FlagValues = Record<string, string | boolean>;

/**
 * Whether the caller explicitly requested a data-locality control. This is
 * intentionally presence-based so old command invocations retain their prior
 * Go CLI compatibility floor.
 */
export function usesDataLocalityFlags(flags: FlagValues): boolean {
  return flags.region !== undefined || flags.mode !== undefined;
}

/**
 * Validate and append the exact generated-Go-CLI data-locality flags.
 * Returns a user-facing validation error rather than throwing so each command
 * can preserve its established JSON/human-readable failure formatting.
 */
export function appendDataLocalityFlags(args: string[], flags: FlagValues): string | undefined {
  const region = flags.region;
  const mode = flags.mode;
  const hasRegion = region !== undefined;
  const hasMode = mode !== undefined;

  if (hasRegion && (typeof region !== "string" || region === "")) {
    return "--region requires a value";
  }
  if (hasMode && (typeof mode !== "string" || mode === "")) {
    return "--mode requires a value (preferred or strict)";
  }
  if (typeof mode === "string" && !DATA_LOCALITY_MODES.has(mode)) {
    return "--mode must be preferred or strict";
  }
  if (mode === "strict" && !hasRegion) {
    return "--mode strict requires --region";
  }

  if (typeof region === "string") args.push("--region", region);
  if (typeof mode === "string") args.push("--mode", mode);
  return undefined;
}
