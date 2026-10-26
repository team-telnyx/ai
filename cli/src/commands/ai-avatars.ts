/**
 * Direct AI avatar lifecycle actions backed by the Stainless-generated Go CLI.
 *
 * Avatar creation deliberately passes the local image path through to the Go
 * CLI, whose multipart file-input handling owns image encoding and API-side
 * validation. This wrapper only verifies that the supplied path is a readable
 * regular file before dispatching.
 */

import { lstatSync } from "node:fs";
import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { outputJson, printError, printSuccess } from "../utils/output.ts";

type Flags = Record<string, string | boolean>;
type JsonRecord = Record<string, unknown>;

interface AiAvatarResult {
  avatar_id: string;
  ai_avatar: JsonRecord;
}

interface AiAvatarListResult {
  count: number;
  ai_avatars: JsonRecord[];
  meta: JsonRecord;
}

const AI_AVATARS_MINIMUM_CLI_VERSION = "0.34.0";

export async function createAiAvatarCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const imageFile = requiredStringFlag(flags, "image-file", jsonOutput);
  const name = requiredStringFlag(flags, "name", jsonOutput);
  validateLocalImageFile(imageFile, jsonOutput);

  try {
    const response = await telnyxCli(
      ["ai:avatars", "create", "--image-file", imageFile, "--name", name],
      { minimumVersion: AI_AVATARS_MINIMUM_CLI_VERSION },
    );
    presentAvatar("AI avatar created!", normalizeAvatar(response), jsonOutput);
  } catch (err) {
    fail(errorMessage(err), jsonOutput);
  }
}

export async function getAiAvatarCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const avatarId = avatarIdFlag(flags, jsonOutput);

  try {
    const response = await telnyxCli(
      ["ai:avatars", "retrieve", "--avatar-id", avatarId],
      { minimumVersion: AI_AVATARS_MINIMUM_CLI_VERSION },
    );
    presentAvatar("AI avatar retrieved!", normalizeAvatar(response, avatarId), jsonOutput);
  } catch (err) {
    fail(errorMessage(err), jsonOutput);
  }
}

export async function updateAiAvatarCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const avatarId = avatarIdFlag(flags, jsonOutput);
  const name = requiredStringFlag(flags, "name", jsonOutput);

  try {
    const response = await telnyxCli(
      ["ai:avatars", "update", "--avatar-id", avatarId, "--name", name],
      { minimumVersion: AI_AVATARS_MINIMUM_CLI_VERSION },
    );
    presentAvatar("AI avatar updated!", normalizeAvatar(response, avatarId), jsonOutput);
  } catch (err) {
    fail(errorMessage(err), jsonOutput);
  }
}

export async function listAiAvatarsCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const args = ["ai:avatars", "list"];
  addOptionalStringFlag(args, flags, "filter-avatar-type", jsonOutput);
  addOptionalStringFlag(args, flags, "filter-id", jsonOutput);
  addOptionalStringFlag(args, flags, "filter-name", jsonOutput);
  addPositiveIntegerFlag(args, flags, "page-number", jsonOutput);
  addPositiveIntegerFlag(args, flags, "page-size", jsonOutput);
  const maxItems = addMaxItemsFlag(args, flags, jsonOutput);

  try {
    const response = await telnyxCli(args, {
      format: "raw",
      minimumVersion: AI_AVATARS_MINIMUM_CLI_VERSION,
    });
    const envelope = asRecord(response);
    const allAvatars = dataRecords(response);
    const avatars = maxItems === undefined || maxItems === -1 ? allAvatars : allAvatars.slice(0, maxItems);
    const result: AiAvatarListResult = {
      count: avatars.length,
      ai_avatars: avatars,
      meta: asRecord(envelope.meta),
    };
    if (jsonOutput) {
      outputJson(result);
      return;
    }

    printSuccess("AI avatars retrieved!", { Count: result.count });
    for (const avatar of result.ai_avatars) {
      const id = stringValue(avatar.id) || "(unknown)";
      const name = stringValue(avatar.name) || "(unnamed)";
      const type = stringValue(avatar.avatar_type);
      console.log(`  • ${name} — ${id}${type ? ` · ${type}` : ""}`);
    }
    if (result.count === 0) console.log("  (no AI avatars returned)");
    console.log();
  } catch (err) {
    fail(errorMessage(err), jsonOutput);
  }
}

function normalizeAvatar(response: unknown, fallbackId = ""): AiAvatarResult {
  const avatar = asRecord(asRecord(response).data ?? response);
  return { avatar_id: stringValue(avatar.id) || fallbackId, ai_avatar: avatar };
}

function presentAvatar(title: string, result: AiAvatarResult, jsonOutput: boolean): void {
  if (jsonOutput) {
    outputJson(result);
    return;
  }
  printSuccess(title, {
    "Avatar ID": result.avatar_id || "(not returned)",
    Name: stringValue(result.ai_avatar.name) || "(not returned)",
    Type: stringValue(result.ai_avatar.avatar_type) || "(not returned)",
  });
}

function avatarIdFlag(flags: Flags, jsonOutput: boolean): string {
  const id = nonEmptyStringFlag(flags, "id");
  const avatarId = nonEmptyStringFlag(flags, "avatar-id");
  if (id && avatarId && id !== avatarId) {
    fail("--id and --avatar-id cannot specify different values", jsonOutput);
  }
  const value = avatarId ?? id;
  if (!value) fail("--id is required (AI avatar ID; --avatar-id is also accepted)", jsonOutput);
  return value;
}

function requiredStringFlag(flags: Flags, key: string, jsonOutput: boolean): string {
  const value = nonEmptyStringFlag(flags, key);
  if (!value) fail(`--${key} is required`, jsonOutput);
  return value;
}

function addOptionalStringFlag(args: string[], flags: Flags, name: string, jsonOutput: boolean): void {
  const value = flags[name];
  if (value === undefined) return;
  if (typeof value !== "string" || value.length === 0) fail(`--${name} requires a non-empty value`, jsonOutput);
  args.push(`--${name}`, value);
}

function addPositiveIntegerFlag(args: string[], flags: Flags, name: string, jsonOutput: boolean): void {
  const value = flags[name];
  if (value === undefined) return;
  if (typeof value !== "string" || !/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < 1) {
    fail(`--${name} must be a positive safe integer`, jsonOutput);
  }
  args.push(`--${name}`, value);
}

function addMaxItemsFlag(args: string[], flags: Flags, jsonOutput: boolean): number | undefined {
  const value = flags["max-items"];
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !/^(?:-1|\d+)$/.test(value) || !Number.isSafeInteger(Number(value))) {
    fail("--max-items must be -1 or a non-negative safe integer", jsonOutput);
  }
  args.push("--max-items", value);
  return Number(value);
}

function validateLocalImageFile(path: string, jsonOutput: boolean): void {
  try {
    if (!lstatSync(path).isFile()) throw new Error();
  } catch {
    fail("--image-file must name a readable regular file", jsonOutput);
  }
}

function dataRecords(response: unknown): JsonRecord[] {
  const data = Array.isArray(response) ? response : asRecord(response).data;
  if (!Array.isArray(data)) return [];
  return data.filter((item): item is JsonRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item));
}

function nonEmptyStringFlag(flags: Flags, key: string): string | undefined {
  const value = flags[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function stringValue(value: unknown): string {
  return value === undefined || value === null ? "" : String(value);
}

function errorMessage(err: unknown): string {
  if (err instanceof TelnyxCLIError) return err.stderr || err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}

function fail(message: string, jsonOutput: boolean): never {
  if (jsonOutput) outputJson({ error: message });
  else printError(message);
  process.exit(1);
}
