/**
 * Verify-profile lifecycle and configuration actions backed by the generated
 * Telnyx Go CLI. Profile creation remains the setup-verify composite command.
 */

import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { outputJson, printError, printSuccess } from "../utils/output.ts";

type Flags = Record<string, string | boolean>;
type JsonRecord = Record<string, unknown>;
type VerifyProfileAction = "retrieve" | "list" | "update" | "delete";

const ACTIONS: VerifyProfileAction[] = ["retrieve", "list", "update", "delete"];
const JSON_SETTINGS = ["sms", "call", "whatsapp"] as const;
const WEBHOOK_SETTINGS = ["webhook-url", "webhook-failover-url"] as const;

export async function verifyProfileCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const action = actionFlag(flags, jsonOutput);
  const unsupported = unsupportedFlags(flags, action);
  if (unsupported.length > 0) {
    fail(`Unsupported flag${unsupported.length === 1 ? "" : "s"} for ${action}: ${unsupported.map((flag) => `--${flag}`).join(", ")}`, jsonOutput);
  }

  switch (action) {
    case "retrieve":
      await retrieveProfile(flags, jsonOutput);
      return;
    case "list":
      await listProfiles(flags, jsonOutput);
      return;
    case "update":
      await updateProfile(flags, jsonOutput);
      return;
    case "delete":
      await deleteProfile(flags, jsonOutput);
      return;
  }
}

async function retrieveProfile(flags: Flags, jsonOutput: boolean): Promise<void> {
  const id = profileId(flags, jsonOutput);
  try {
    const profile = responseRecord(await telnyxCli([
      "verify-profiles", "retrieve", "--verify-profile-id", id,
    ]));
    presentProfile("Verify profile retrieved!", profile, id, jsonOutput);
  } catch (error) {
    fail(errorMessage(error), jsonOutput);
  }
}

async function listProfiles(flags: Flags, jsonOutput: boolean): Promise<void> {
  const args = ["verify-profiles", "list"];
  const name = optionalString(flags, "name", jsonOutput);
  const filter = optionalString(flags, "filter", jsonOutput);
  if (name !== undefined && filter !== undefined) {
    fail("--name cannot be combined with --filter", jsonOutput);
  }
  if (filter !== undefined) args.push("--filter", normalizedJsonObject(filter, "filter", jsonOutput));
  if (name !== undefined) args.push("--filter.name", name);
  addPositiveInteger(args, flags, "page-number", jsonOutput);
  addPositiveInteger(args, flags, "page-size", jsonOutput);
  const maxItems = addMaxItems(args, flags, jsonOutput);

  try {
    const response = await telnyxCli(args, { format: "raw" });
    const envelope = asRecord(response);
    // Raw format preserves the list envelope but bypasses the generated CLI's
    // iterator truncation, so honor finite --max-items locally as well.
    const returnedProfiles = dataRecords(response);
    const profiles = maxItems === undefined || maxItems === -1
      ? returnedProfiles
      : returnedProfiles.slice(0, maxItems);
    const result = { count: profiles.length, verify_profiles: profiles, meta: asRecord(envelope.meta) };
    if (jsonOutput) {
      outputJson(result);
      return;
    }

    printSuccess("Verify profiles retrieved!", { Count: result.count });
    for (const profile of profiles) {
      const id = stringValue(profile.id) || "(unknown)";
      const name = stringValue(profile.name) || "(unnamed)";
      console.log(`  • ${name} — ${id}`);
    }
    if (profiles.length === 0) console.log("  (no verify profiles returned)");
    console.log();
  } catch (error) {
    fail(errorMessage(error), jsonOutput);
  }
}

async function updateProfile(flags: Flags, jsonOutput: boolean): Promise<void> {
  const id = profileId(flags, jsonOutput);
  const args = ["verify-profiles", "update", "--verify-profile-id", id];
  let mutations = 0;

  const name = optionalString(flags, "name", jsonOutput);
  if (name !== undefined) {
    args.push("--name", name);
    mutations++;
  }

  for (const setting of JSON_SETTINGS) {
    const value = optionalString(flags, setting, jsonOutput);
    if (value === undefined) continue;
    args.push(`--${setting}`, normalizedJsonObject(value, setting, jsonOutput));
    mutations++;
  }

  const dailySpendLimit = optionalString(flags, "daily-spend-limit", jsonOutput);
  if (dailySpendLimit !== undefined) {
    if (!/^\d+(?:\.\d+)?$/.test(dailySpendLimit) || !Number.isFinite(Number(dailySpendLimit))) {
      fail("--daily-spend-limit must be a non-negative decimal amount", jsonOutput);
    }
    args.push("--daily-spend-limit", dailySpendLimit);
    mutations++;
  }

  if (flags["daily-spend-limit-enabled"] !== undefined) {
    args.push("--daily-spend-limit-enabled=" + booleanValue(
      flags["daily-spend-limit-enabled"], "daily-spend-limit-enabled", jsonOutput,
    ));
    mutations++;
  }

  for (const setting of WEBHOOK_SETTINGS) {
    const value = optionalString(flags, setting, jsonOutput);
    if (value === undefined) continue;
    validateHttpUrl(setting, value, jsonOutput);
    args.push(`--${setting}`, value);
    mutations++;
  }

  if (mutations === 0) fail("at least one profile field must be provided to update", jsonOutput);

  try {
    const profile = responseRecord(await telnyxCli(args));
    presentProfile("Verify profile updated!", profile, id, jsonOutput);
  } catch (error) {
    fail(errorMessage(error), jsonOutput);
  }
}

async function deleteProfile(flags: Flags, jsonOutput: boolean): Promise<void> {
  const id = profileId(flags, jsonOutput);
  if (flags.confirm !== true) fail("--confirm is required to delete a verify profile", jsonOutput);

  try {
    await telnyxCli(["verify-profiles", "delete", "--verify-profile-id", id]);
    const result = { verify_profile_id: id, deleted: true };
    if (jsonOutput) {
      outputJson(result);
      return;
    }
    printSuccess("Verify profile deleted!", { "Verify Profile ID": id, Deleted: true });
  } catch (error) {
    fail(errorMessage(error), jsonOutput);
  }
}

function actionFlag(flags: Flags, jsonOutput: boolean): VerifyProfileAction {
  const action = optionalString(flags, "action", jsonOutput);
  if (action === undefined) fail(`--action is required. Valid actions: ${ACTIONS.join(", ")}`, jsonOutput);
  if (!(ACTIONS as readonly string[]).includes(action)) {
    fail(`Unknown --action: ${action}. Valid actions: ${ACTIONS.join(", ")}`, jsonOutput);
  }
  return action as VerifyProfileAction;
}

function profileId(flags: Flags, jsonOutput: boolean): string {
  const aliases = ["id", "verify-profile-id"] as const;
  for (const alias of aliases) {
    if (flags[alias] !== undefined && (typeof flags[alias] !== "string" || flags[alias].length === 0)) {
      fail(`--${alias} must be a non-empty string`, jsonOutput);
    }
  }
  const id = flags.id as string | undefined;
  const verifyProfileId = flags["verify-profile-id"] as string | undefined;
  if (id !== undefined && verifyProfileId !== undefined && id !== verifyProfileId) {
    fail("--id and --verify-profile-id must match when both are provided", jsonOutput);
  }
  const resolved = id ?? verifyProfileId;
  if (resolved === undefined) fail("--id is required (verify profile ID)", jsonOutput);
  return resolved;
}

function unsupportedFlags(flags: Flags, action: VerifyProfileAction): string[] {
  const accepted = new Set<string>(["action", "json"]);
  if (action === "retrieve") ["id", "verify-profile-id"].forEach((flag) => accepted.add(flag));
  if (action === "list") ["name", "filter", "page-number", "page-size", "max-items"].forEach((flag) => accepted.add(flag));
  if (action === "update") [
    "id", "verify-profile-id", "name", "sms", "call", "whatsapp", "daily-spend-limit",
    "daily-spend-limit-enabled", "webhook-url", "webhook-failover-url",
  ].forEach((flag) => accepted.add(flag));
  if (action === "delete") ["id", "verify-profile-id", "confirm"].forEach((flag) => accepted.add(flag));
  return Object.keys(flags).filter((flag) => flag !== "_" && !accepted.has(flag));
}

function optionalString(flags: Flags, name: string, jsonOutput: boolean): string | undefined {
  const value = flags[name];
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.length === 0) fail(`--${name} must be a non-empty string`, jsonOutput);
  return value;
}

function normalizedJsonObject(value: string, name: string, jsonOutput: boolean): string {
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not object");
    return JSON.stringify(parsed);
  } catch {
    fail(`--${name} must be a JSON object`, jsonOutput);
  }
}

function booleanValue(value: string | boolean, name: string, jsonOutput: boolean): boolean {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  fail(`--${name} must be true or false`, jsonOutput);
}

function validateHttpUrl(name: string, value: string, jsonOutput: boolean): void {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("unsupported protocol");
  } catch {
    fail(`--${name} must be an http(s) URL`, jsonOutput);
  }
}

function addPositiveInteger(args: string[], flags: Flags, name: string, jsonOutput: boolean): void {
  const value = flags[name];
  if (value === undefined) return;
  if (typeof value !== "string" || !/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) <= 0) {
    fail(`--${name} must be a positive safe integer`, jsonOutput);
  }
  args.push(`--${name}`, value);
}

function addMaxItems(args: string[], flags: Flags, jsonOutput: boolean): number | undefined {
  const value = flags["max-items"];
  if (value === undefined) return undefined;
  if (typeof value !== "string" || (value !== "-1" && (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) <= 0))) {
    fail("--max-items must be -1 or a positive safe integer", jsonOutput);
  }
  args.push("--max-items", value);
  return Number(value);
}

function responseRecord(response: unknown): JsonRecord {
  const envelope = asRecord(response);
  return asRecord(envelope.data ?? response);
}

function dataRecords(response: unknown): JsonRecord[] {
  const envelope = asRecord(response);
  const data = Array.isArray(response) ? response : envelope.data;
  return Array.isArray(data)
    ? data.filter((item): item is JsonRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    : [];
}

function presentProfile(title: string, profile: JsonRecord, fallbackId: string, jsonOutput: boolean): void {
  const result = {
    verify_profile_id: stringValue(profile.id) || fallbackId,
    verify_profile: profile,
  };
  if (jsonOutput) {
    outputJson(result);
    return;
  }
  printSuccess(title, {
    "Verify Profile ID": result.verify_profile_id,
    Name: stringValue(profile.name) || "(not returned)",
    "Webhook URL": stringValue(profile.webhook_url) || "(not configured)",
  });
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

function errorMessage(error: unknown): string {
  if (error instanceof TelnyxCLIError) return error.stderr || error.message;
  if (error instanceof Error) return error.message;
  return String(error);
}
