/**
 * Agent-friendly wrappers for Telnyx web search, page contents, and research.
 *
 * These commands deliberately preserve the generated Go CLI's flag names and
 * complete JSON responses. The Go CLI remains responsible for API request
 * serialization and server-side validation.
 */

import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { failWith, outputJson, printError, printSuccess } from "../utils/output.ts";

const MINIMUM_CLI_VERSION = "0.27.0";
const VALUE_FLAGS = [
  "count",
  "country",
  "freshness",
  "safesearch",
] as const;
const RESEARCH_VALUE_FLAGS = ["max-sources", "research-effort"] as const;

type Flags = Record<string, string | boolean>;
type Occurrences = Record<string, Array<string | boolean>>;

export async function webSearchCommand(
  flags: Flags,
  occurrences: Occurrences = {},
): Promise<void> {
  const jsonOutput = flags.json === true;
  const query = requiredString(flags, "query", jsonOutput);
  const args = ["web-search", "create", "--query", query];

  forwardValueFlags(args, flags, VALUE_FLAGS);
  forwardRepeatedFlags(args, flags, occurrences, ["exclude-domain", "include-domain"], jsonOutput);
  forwardBooleanFlag(args, flags, "livecrawl", jsonOutput);

  await execute(args, "Web search completed!", jsonOutput);
}

export async function webContentsCommand(
  flags: Flags,
  occurrences: Occurrences = {},
): Promise<void> {
  const jsonOutput = flags.json === true;
  const urls = repeatedStrings(flags, occurrences, "url", jsonOutput);
  if (urls.length === 0) failWith("--url is required (repeat for up to 20 URLs)", jsonOutput);
  if (urls.length > 20) failWith("--url accepts at most 20 URLs per request", jsonOutput);

  const args = ["web-search", "contents"];
  for (const url of urls) args.push("--url", url);
  forwardValueFlags(args, flags, ["crawl-timeout", "max-age"]);
  forwardRepeatedFlags(args, flags, occurrences, ["format"], jsonOutput);

  // `web-search contents` owns a request-body --format flag. Put the Go CLI's
  // output --format at the root so it does not become an extra content format.
  await execute(args, "Web contents retrieved!", jsonOutput, 120_000, true);
}

export async function webResearchCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const query = requiredString(flags, "query", jsonOutput);
  const args = ["web-search:research", "create", "--query", query];

  forwardValueFlags(args, flags, RESEARCH_VALUE_FLAGS);
  forwardBooleanFlag(args, flags, "background", jsonOutput);

  // Synchronous deep research can legitimately take longer than the wrapper's
  // normal one-minute subprocess timeout.
  await execute(args, "Web research started!", jsonOutput, 10 * 60_000);
}

export async function webResearchStatusCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const taskId = requiredString(flags, "task-id", jsonOutput);
  await execute(
    ["web-search:research", "retrieve", "--task-id", taskId],
    "Web research status retrieved!",
    jsonOutput,
  );
}

function requiredString(flags: Flags, name: string, jsonOutput: boolean): string {
  const value = flags[name];
  if (typeof value !== "string" || value === "") failWith(`--${name} is required`, jsonOutput);
  return value;
}

function repeatedStrings(
  flags: Flags,
  occurrences: Occurrences,
  name: string,
  jsonOutput: boolean,
): string[] {
  const values = occurrences[name] ?? (flags[name] === undefined ? [] : [flags[name]]);
  const strings: string[] = [];
  for (const value of values) {
    if (typeof value !== "string" || value === "") failWith(`--${name} requires a value`, jsonOutput);
    strings.push(value);
  }
  return strings;
}

function forwardValueFlags(args: string[], flags: Flags, names: readonly string[]): void {
  for (const name of names) {
    const value = flags[name];
    if (typeof value === "string" && value !== "") args.push(`--${name}`, value);
  }
}

function forwardRepeatedFlags(
  args: string[],
  flags: Flags,
  occurrences: Occurrences,
  names: readonly string[],
  jsonOutput: boolean,
): void {
  for (const name of names) {
    for (const value of repeatedStrings(flags, occurrences, name, jsonOutput)) {
      args.push(`--${name}`, value);
    }
  }
}

function forwardBooleanFlag(
  args: string[],
  flags: Flags,
  name: string,
  jsonOutput: boolean,
): void {
  const value = flags[name];
  if (value === undefined) return;
  if (value === true || value === "true") {
    args.push(`--${name}=true`);
    return;
  }
  if (value === false || value === "false") {
    args.push(`--${name}=false`);
    return;
  }
  failWith(`--${name} must be true or false`, jsonOutput);
}

async function execute(
  args: string[],
  title: string,
  jsonOutput: boolean,
  timeout = 120_000,
  rootOutputFormat = false,
): Promise<void> {
  try {
    const response = await telnyxCli(args, {
      timeout,
      minimumVersion: MINIMUM_CLI_VERSION,
      formatPosition: rootOutputFormat ? "root" : "command",
    });
    if (jsonOutput) {
      // Search results, page contents, answers, citations, and task metadata are
      // all agent-relevant, so preserve the entire upstream response envelope.
      outputJson(response);
      return;
    }

    printSuccess(title, { Status: responseStatus(response) });
    outputJson(response);
  } catch (err) {
    if (jsonOutput) outputJson({ error: errorMsg(err) });
    else printError(errorMsg(err));
    process.exit(1);
  }
}

function responseStatus(response: unknown): string {
  if (!response || typeof response !== "object" || Array.isArray(response)) return "completed";
  const envelope = response as Record<string, unknown>;
  const data = envelope.data && typeof envelope.data === "object" && !Array.isArray(envelope.data)
    ? envelope.data as Record<string, unknown>
    : undefined;
  return String(data?.status ?? envelope.status ?? "completed");
}

function errorMsg(err: unknown): string {
  if (err instanceof TelnyxCLIError) return err.stderr || err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}
