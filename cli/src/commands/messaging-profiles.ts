/**
 * Direct messaging-profile lifecycle actions backed by the generated Go CLI.
 *
 * List uses raw output to preserve one stable `{ data, meta }` envelope.
 */

import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { outputJson, printError, printSuccess } from "../utils/output.ts";

type Flags = Record<string, string | boolean>;
type Occurrences = Record<string, Array<string | boolean>>;
type JsonRecord = Record<string, unknown>;
type ProfileMutation = "create" | "update";

interface MessagingProfileListResult {
  count: number;
  messaging_profiles: JsonRecord[];
  meta: JsonRecord;
}

interface MessagingProfileResult {
  messaging_profile_id: string;
  messaging_profile: JsonRecord;
}

const MUTATION_STRING_FLAGS: Record<ProfileMutation, string[]> = {
  create: [
    "ai-assistant-id",
    "alpha-sender",
    "daily-spend-limit",
    "health-webhook-url",
    "resource-group-id",
    "webhook-api-version",
    "webhook-failover-url",
    "webhook-url",
  ],
  update: [
    "ai-assistant-id",
    "alpha-sender",
    "daily-spend-limit",
    "name",
    "v1-secret",
    "webhook-api-version",
    "webhook-failover-url",
    "webhook-url",
  ],
};

const MUTATION_BOOLEAN_FLAGS = [
  "daily-spend-limit-enabled",
  "enabled",
  "mms-fall-back-to-sms",
  "mms-transcoding",
  "mobile-only",
  "smart-encoding",
] as const;

const MUTATION_JSON_FLAGS = ["number-pool-settings", "url-shortener-settings"] as const;
const MAX_PROFILE_PAGE_REQUESTS = 1_000;

export async function listMessagingProfilesCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const args = ["messaging-profiles", "list"];

  addMappedFlag(args, flags, "name", "--filter-name-eq");
  addMappedFlag(args, flags, "name-contains", "--filter-name-contains");
  addPositiveIntegerFlag(args, flags, "page-number", jsonOutput);
  addPositiveIntegerFlag(args, flags, "page-size", jsonOutput);
  const maxItems = maxItemsFlag(flags, jsonOutput);

  try {
    const result = maxItems === undefined
      ? normalizeProfileList(await telnyxCli(args, { format: "raw" }))
      : await collectProfilePages(args, maxItems);
    presentProfileList(result, jsonOutput);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function createMessagingProfileCommand(
  flags: Flags,
  occurrences: Occurrences = {},
): Promise<void> {
  const jsonOutput = flags.json === true;
  const name = stringFlag(flags, "name");
  if (!name) fail("--name is required", jsonOutput);

  const destinations = destinationFlags(flags, occurrences, jsonOutput);
  if (destinations.length === 0) {
    fail("--whitelisted-destinations is required (comma-separated ISO alpha-2 codes, or *)", jsonOutput);
  }

  const args = ["messaging-profiles", "create", "--name", name];
  for (const destination of destinations) args.push("--whitelisted-destination", destination);
  addMutationFlags(args, flags, "create", jsonOutput);

  try {
    const response = await telnyxCli(args);
    presentProfile("Messaging profile created!", normalizeProfile(response), jsonOutput);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function getMessagingProfileCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const id = profileId(flags, jsonOutput);

  try {
    const response = await telnyxCli([
      "messaging-profiles", "retrieve", "--messaging-profile-id", id,
    ]);
    presentProfile("Messaging profile retrieved!", normalizeProfile(response, id), jsonOutput);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function updateMessagingProfileCommand(
  flags: Flags,
  occurrences: Occurrences = {},
): Promise<void> {
  const jsonOutput = flags.json === true;
  const id = profileId(flags, jsonOutput);
  const destinations = destinationFlags(flags, occurrences, jsonOutput);
  const args = ["messaging-profiles", "update", "--messaging-profile-id", id];

  for (const destination of destinations) args.push("--whitelisted-destination", destination);
  const mutationCount = addMutationFlags(args, flags, "update", jsonOutput) + destinations.length;
  if (mutationCount === 0) fail("at least one profile field must be provided to update", jsonOutput);

  try {
    const response = await telnyxCli(args, args.includes("--ai-assistant-id")
      ? { minimumVersion: "0.24.0" }
      : undefined);
    presentProfile("Messaging profile updated!", normalizeProfile(response, id), jsonOutput);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function deleteMessagingProfileCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const id = profileId(flags, jsonOutput);
  if (!isExplicitTrue(flags.confirm)) {
    fail("--confirm is required to delete a messaging profile", jsonOutput);
  }

  try {
    await telnyxCli(["messaging-profiles", "delete", "--messaging-profile-id", id]);
    const result = { messaging_profile_id: id, deleted: true };
    if (jsonOutput) {
      outputJson(result);
    } else {
      printSuccess("Messaging profile deleted!", {
        "Messaging Profile ID": id,
        Deleted: true,
      });
    }
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

function addMutationFlags(
  args: string[],
  flags: Flags,
  mutation: ProfileMutation,
  jsonOutput: boolean,
): number {
  let count = 0;

  for (const name of MUTATION_STRING_FLAGS[mutation]) {
    const value = stringFlag(flags, name);
    if (value === undefined) continue;
    validateStringMutation(name, value, jsonOutput);
    args.push(`--${name}`, value);
    count++;
  }

  for (const name of MUTATION_BOOLEAN_FLAGS) {
    if (flags[name] === undefined) continue;
    args.push(`--${name}=${booleanValue(flags[name], name, jsonOutput)}`);
    count++;
  }

  for (const name of MUTATION_JSON_FLAGS) {
    const value = stringFlag(flags, name);
    if (value === undefined) continue;
    args.push(`--${name}`, normalizedJsonObject(value, name, jsonOutput));
    count++;
  }

  return count;
}

function validateStringMutation(name: string, value: string, jsonOutput: boolean): void {
  if (name === "daily-spend-limit" && !/^\d+(?:\.\d+)?$/.test(value)) {
    fail("--daily-spend-limit must be a non-negative decimal amount", jsonOutput);
  }
  if (name === "webhook-api-version" && !["1", "2", "2010-04-01"].includes(value)) {
    fail("--webhook-api-version must be 1, 2, or 2010-04-01", jsonOutput);
  }
  if (["health-webhook-url", "webhook-failover-url", "webhook-url"].includes(name) && value !== "null") {
    try {
      const url = new URL(value);
      if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("unsupported protocol");
    } catch {
      fail(`--${name} must be an http(s) URL`, jsonOutput);
    }
  }
}

function destinationFlags(flags: Flags, occurrences: Occurrences, jsonOutput: boolean): string[] {
  const values = [
    ...(occurrences["whitelisted-destinations"] ?? []),
    ...(occurrences["whitelisted-destination"] ?? []),
  ];
  if (values.length === 0) {
    if (flags["whitelisted-destinations"] !== undefined) values.push(flags["whitelisted-destinations"]);
    else if (flags["whitelisted-destination"] !== undefined) values.push(flags["whitelisted-destination"]);
  }

  const destinations = values
    .flatMap((value) => typeof value === "string" ? value.split(",") : [])
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);

  if (values.length > 0 && destinations.length === 0) {
    fail("--whitelisted-destinations must contain at least one destination", jsonOutput);
  }
  for (const destination of destinations) {
    if (destination !== "*" && !/^[A-Z]{2}$/.test(destination)) {
      fail(`invalid whitelisted destination: ${destination} (expected ISO alpha-2 code or *)`, jsonOutput);
    }
  }
  if (destinations.includes("*") && destinations.length > 1) {
    fail("* cannot be combined with other whitelisted destinations", jsonOutput);
  }
  return [...new Set(destinations)];
}

function normalizeProfileList(response: unknown): MessagingProfileListResult {
  const envelope = asRecord(response);
  const rawProfiles = Array.isArray(response)
    ? response
    : Array.isArray(envelope.data) ? envelope.data : [];
  const messagingProfiles = rawProfiles.filter(
    (item): item is JsonRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item),
  );
  return {
    count: messagingProfiles.length,
    messaging_profiles: messagingProfiles,
    meta: asRecord(envelope.meta),
  };
}

async function collectProfilePages(
  baseArgs: string[],
  maxItems: number,
): Promise<MessagingProfileListResult> {
  const profiles: JsonRecord[] = [];
  const seenIds = new Set<string>();
  const seenPages = new Set<string>();
  const startingPage = positiveInteger(argumentValue(baseArgs, "--page-number")) ?? 1;
  let requestedPage = startingPage;
  let pagesFetched = 0;
  let stableMeta: JsonRecord = {};
  let hasContributingPage = false;

  while (true) {
    if (pagesFetched >= MAX_PROFILE_PAGE_REQUESTS) {
      throw new Error(`messaging profile pagination exceeded ${MAX_PROFILE_PAGE_REQUESTS} page requests without an end signal`);
    }
    const page = normalizeProfileList(await telnyxCli(
      withArgument(baseArgs, "--page-number", String(requestedPage)),
      { format: "raw" },
    ));
    pagesFetched++;
    if (!hasContributingPage) stableMeta = page.meta;
    if (page.messaging_profiles.length === 0) break;

    // Exact page signatures catch malformed repeaters without using structural
    // equality to deduplicate distinct, ID-less profiles across valid pages.
    const authoritativePage = positiveInteger(page.meta.page_number);
    const signature = JSON.stringify([
      authoritativePage === undefined ? "content" : `page:${authoritativePage}`,
      page.messaging_profiles,
    ]);
    if (seenPages.has(signature)) break;
    seenPages.add(signature);

    let added = 0;
    for (const profile of page.messaging_profiles) {
      const id = profile.id;
      if (typeof id === "string" || typeof id === "number") {
        const identity = String(id);
        if (seenIds.has(identity)) continue;
        seenIds.add(identity);
      }
      profiles.push(profile);
      added++;
    }
    if (added === 0) break;
    if (!hasContributingPage) {
      stableMeta = page.meta;
      hasContributingPage = true;
    }
    if (maxItems !== -1 && profiles.length >= maxItems) break;

    const pageSize = positiveInteger(page.meta.page_size)
      ?? positiveInteger(argumentValue(baseArgs, "--page-size"));
    if (pageSize !== undefined && page.messaging_profiles.length < pageSize) break;

    const responsePage = authoritativePage ?? requestedPage;
    const totalPages = positiveInteger(page.meta.total_pages)
      ?? totalPagesFromResults(page.meta.total_results, pageSize);
    if (totalPages !== undefined && responsePage >= totalPages) break;
    if (responsePage < requestedPage) break;
    if (!Number.isSafeInteger(requestedPage + 1)) {
      throw new Error("messaging profile pagination cannot advance beyond the maximum safe page number");
    }
    requestedPage++;
  }

  const limited = maxItems === -1 ? profiles : profiles.slice(0, maxItems);
  return {
    count: limited.length,
    messaging_profiles: limited,
    meta: aggregateProfileMeta(stableMeta, startingPage, pagesFetched, limited.length),
  };
}

function aggregateProfileMeta(
  sourceMeta: JsonRecord,
  startingPage: number,
  pagesFetched: number,
  returnedResults: number,
): JsonRecord {
  // page_number describes one API page, so aggregate results return the first
  // contributing page's other metadata plus explicit traversal metadata.
  const { page_number: _pageNumber, ...stableMeta } = sourceMeta;
  return {
    ...stableMeta,
    starting_page: startingPage,
    pages_fetched: pagesFetched,
    returned_results: returnedResults,
  };
}

function normalizeProfile(response: unknown, fallbackId = ""): MessagingProfileResult {
  const envelope = asRecord(response);
  const profile = asRecord(envelope.data ?? response);
  return {
    messaging_profile_id: stringValue(profile.id) || fallbackId,
    messaging_profile: profile,
  };
}

function presentProfileList(result: MessagingProfileListResult, jsonOutput: boolean): void {
  if (jsonOutput) {
    outputJson(result);
    return;
  }

  printSuccess("Messaging profiles retrieved!", { Count: result.count });
  for (const profile of result.messaging_profiles) {
    const id = stringValue(profile.id) || "(unknown)";
    const name = stringValue(profile.name) || "(unnamed)";
    const state = profile.enabled === undefined ? "" : profile.enabled ? "enabled" : "disabled";
    console.log(`  • ${name} — ${id}${state ? ` · ${state}` : ""}`);
  }
  if (result.count === 0) console.log("  (no messaging profiles returned)");
  console.log();
}

function presentProfile(title: string, result: MessagingProfileResult, jsonOutput: boolean): void {
  if (jsonOutput) {
    outputJson(result);
    return;
  }

  const profile = result.messaging_profile;
  printSuccess(title, {
    "Messaging Profile ID": result.messaging_profile_id || "(not returned)",
    Name: stringValue(profile.name) || "(not returned)",
    Enabled: profile.enabled === undefined ? "(not returned)" : Boolean(profile.enabled),
    "Webhook URL": stringValue(profile.webhook_url) || "(not configured)",
    "Whitelisted Destinations": Array.isArray(profile.whitelisted_destinations)
      ? profile.whitelisted_destinations.map(stringValue).join(", ")
      : "(not returned)",
  });
}

function profileId(flags: Flags, jsonOutput: boolean): string {
  const aliases = ["id", "messaging-profile-id"] as const;
  for (const alias of aliases) {
    const value = flags[alias];
    if (value !== undefined && (typeof value !== "string" || value.length === 0)) {
      fail(`--${alias} must be a non-empty string`, jsonOutput);
    }
  }

  const id = flags.id as string | undefined;
  const messagingProfileId = flags["messaging-profile-id"] as string | undefined;
  if (id !== undefined && messagingProfileId !== undefined && id !== messagingProfileId) {
    fail("--id and --messaging-profile-id must match when both are provided", jsonOutput);
  }
  const resolved = id ?? messagingProfileId;
  if (resolved === undefined) fail("--id is required (messaging profile ID)", jsonOutput);
  return resolved;
}

function addMappedFlag(args: string[], flags: Flags, source: string, target: string): void {
  const value = stringFlag(flags, source);
  if (value !== undefined) args.push(target, value);
}

function addPositiveIntegerFlag(args: string[], flags: Flags, source: string, jsonOutput: boolean): void {
  const value = flags[source];
  if (value === undefined) return;
  if (typeof value !== "string" || value.length === 0) {
    fail(`--${source} must be a positive safe integer`, jsonOutput);
  }
  if (positiveInteger(value) === undefined) fail(`--${source} must be a positive safe integer`, jsonOutput);
  args.push(`--${source}`, value);
}

function maxItemsFlag(flags: Flags, jsonOutput: boolean): number | undefined {
  const value = flags["max-items"];
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.length === 0) {
    fail("--max-items must be -1 or a positive safe integer", jsonOutput);
  }
  if (value !== "-1" && positiveInteger(value) === undefined) {
    fail("--max-items must be -1 or a positive safe integer", jsonOutput);
  }
  return Number(value);
}

function argumentValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

function withArgument(args: string[], flag: string, value: string): string[] {
  const updated = [...args];
  const index = updated.indexOf(flag);
  if (index >= 0) updated.splice(index, 2, flag, value);
  else updated.push(flag, value);
  return updated;
}

function positiveInteger(value: unknown): number | undefined {
  const number = typeof value === "number"
    ? value
    : typeof value === "string" && /^\d+$/.test(value)
      ? Number(value)
      : Number.NaN;
  return Number.isSafeInteger(number) && number > 0 ? number : undefined;
}

function totalPagesFromResults(totalResults: unknown, pageSize: number | undefined): number | undefined {
  if (pageSize === undefined) return undefined;
  const total = typeof totalResults === "number"
    ? totalResults
    : typeof totalResults === "string" && /^\d+$/.test(totalResults)
      ? Number(totalResults)
      : Number.NaN;
  return Number.isSafeInteger(total) && total >= 0 ? Math.ceil(total / pageSize) : undefined;
}

function normalizedJsonObject(value: string, name: string, jsonOutput: boolean): string {
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed !== null && (typeof parsed !== "object" || Array.isArray(parsed))) throw new Error("not an object");
    return JSON.stringify(parsed);
  } catch {
    fail(`--${name} must be a JSON object or null`, jsonOutput);
  }
}

function booleanValue(value: string | boolean, name: string, jsonOutput: boolean): boolean {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  fail(`--${name} must be true or false`, jsonOutput);
}

function isExplicitTrue(value: string | boolean | undefined): boolean {
  return value === true;
}

function stringFlag(flags: Flags, key: string): string | undefined {
  const value = flags[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function stringValue(value: unknown): string {
  return value === undefined || value === null ? "" : String(value);
}

function fail(message: string, jsonOutput: boolean): never {
  if (jsonOutput) outputJson({ error: message });
  else printError(message);
  process.exit(1);
}

function errorMsg(err: unknown): string {
  if (err instanceof TelnyxCLIError) return err.stderr || err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}
