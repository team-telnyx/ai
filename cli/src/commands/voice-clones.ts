/**
 * Voice-clone lifecycle actions backed by the generated Telnyx Go CLI.
 *
 * The upstream create actions intentionally accept their request bodies as JSON:
 * their schemas vary by provider/model, so this wrapper validates and forwards
 * the generated request-body flags without inventing a lossy local schema.
 */

import { telnyxCli, telnyxCliRaw, TelnyxCLIError } from "../telnyx-cli.ts";
import { outputJson, printError, printSuccess } from "../utils/output.ts";

type Flags = Record<string, string | boolean>;
type JsonRecord = Record<string, unknown>;

interface VoiceCloneListResult {
  count: number;
  voice_clones: JsonRecord[];
  meta: JsonRecord;
}

interface VoiceCloneResult {
  voice_clone_id: string;
  voice_clone: JsonRecord;
}

export async function listVoiceClonesCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const args = ["voice-clones", "list"];
  addOptionalStringFlag(args, flags, "filter-model-id", jsonOutput);
  addOptionalStringFlag(args, flags, "filter-name", jsonOutput);
  addOptionalStringFlag(args, flags, "filter-provider", jsonOutput);
  addPositiveIntegerFlag(args, flags, "page-number", jsonOutput);
  addPositiveIntegerFlag(args, flags, "page-size", jsonOutput);
  addOptionalStringFlag(args, flags, "sort", jsonOutput);
  addMaxItemsFlag(args, flags, jsonOutput);

  try {
    const result = normalizeVoiceCloneList(await telnyxCli(args, { format: "raw" }));
    if (jsonOutput) {
      outputJson(result);
      return;
    }
    printSuccess("Voice clones retrieved!", { Count: result.count });
    for (const clone of result.voice_clones) {
      const id = stringValue(clone.id) || "(unknown)";
      const name = stringValue(clone.name) || "(unnamed)";
      const status = stringValue(clone.status);
      console.log(`  • ${name} — ${id}${status ? ` · ${status}` : ""}`);
    }
    if (result.count === 0) console.log("  (no voice clones returned)");
    console.log();
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function createVoiceCloneCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const request = requiredJsonObjectFlag(flags, "voice-clone-request", jsonOutput);

  try {
    const response = await telnyxCli(["voice-clones", "create", "--voice-clone-request", request]);
    presentVoiceClone("Voice clone created!", normalizeVoiceClone(response), jsonOutput);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function updateVoiceCloneCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const id = requiredStringFlag(flags, "id", jsonOutput);
  const args = ["voice-clones", "update", "--id", id];
  let updates = 0;
  for (const key of ["name", "gender", "language"] as const) {
    if (flags[key] === undefined) continue;
    args.push(`--${key}`, requiredStringFlag(flags, key, jsonOutput));
    updates++;
  }
  if (updates === 0) fail("at least one of --name, --gender, or --language is required to update a voice clone", jsonOutput);

  try {
    const response = await telnyxCli(args);
    presentVoiceClone("Voice clone updated!", normalizeVoiceClone(response, id), jsonOutput);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function deleteVoiceCloneCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const id = requiredStringFlag(flags, "id", jsonOutput);
  if (flags.confirm !== true) {
    fail("--confirm is required to delete a voice clone", jsonOutput);
  }

  try {
    await telnyxCli(["voice-clones", "delete", "--id", id]);
    const result = { voice_clone_id: id, deleted: true };
    if (jsonOutput) outputJson(result);
    else printSuccess("Voice clone deleted!", { "Voice Clone ID": id, Deleted: true });
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function createVoiceCloneFromUploadCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const request = requiredJsonObjectFlag(flags, "voice-clone-upload-request", jsonOutput);
  if (flags["acknowledge-voice-consent"] !== true) {
    fail("--acknowledge-voice-consent is required to confirm you have consent to clone the uploaded voice", jsonOutput);
  }

  try {
    const response = await telnyxCli([
      "voice-clones", "create-from-upload", "--voice-clone-upload-request", request,
    ]);
    presentVoiceClone("Voice clone upload accepted!", normalizeVoiceClone(response), jsonOutput);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function downloadVoiceCloneSampleCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const id = requiredStringFlag(flags, "id", jsonOutput);
  const output = requiredStringFlag(flags, "output", jsonOutput);
  if (output === "-") {
    fail("--output must be a file path; stdout is not supported for binary sample downloads", jsonOutput);
  }

  try {
    // Successful downloads write the binary directly to --output. stdout is only
    // an informational message and must not be parsed as JSON.
    await telnyxCliRaw(["voice-clones", "download-sample", "--id", id, "--output", output]);
    const result = { voice_clone_id: id, output, downloaded: true };
    if (jsonOutput) outputJson(result);
    else printSuccess("Voice clone sample downloaded!", { "Voice Clone ID": id, Output: output });
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

function normalizeVoiceCloneList(response: unknown): VoiceCloneListResult {
  const envelope = asRecord(response);
  const rawClones = Array.isArray(response) ? response : Array.isArray(envelope.data) ? envelope.data : [];
  return {
    count: rawClones.filter(isRecord).length,
    voice_clones: rawClones.filter(isRecord),
    meta: asRecord(envelope.meta),
  };
}

function normalizeVoiceClone(response: unknown, fallbackId = ""): VoiceCloneResult {
  const voiceClone = asRecord(asRecord(response).data ?? response);
  return {
    voice_clone_id: stringValue(voiceClone.id) || fallbackId,
    voice_clone: voiceClone,
  };
}

function presentVoiceClone(title: string, result: VoiceCloneResult, jsonOutput: boolean): void {
  if (jsonOutput) {
    outputJson(result);
    return;
  }
  printSuccess(title, {
    "Voice Clone ID": result.voice_clone_id || "(not returned)",
    Name: stringValue(result.voice_clone.name) || "(unnamed)",
    Status: stringValue(result.voice_clone.status) || "(not returned)",
  });
}

function addOptionalStringFlag(args: string[], flags: Flags, key: string, jsonOutput: boolean): void {
  if (flags[key] === undefined) return;
  args.push(`--${key}`, requiredStringFlag(flags, key, jsonOutput));
}

function addPositiveIntegerFlag(args: string[], flags: Flags, key: string, jsonOutput: boolean): void {
  if (flags[key] === undefined) return;
  const value = requiredStringFlag(flags, key, jsonOutput);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < 1) {
    fail(`--${key} must be a positive safe integer`, jsonOutput);
  }
  args.push(`--${key}`, value);
}

function addMaxItemsFlag(args: string[], flags: Flags, jsonOutput: boolean): void {
  if (flags["max-items"] === undefined) return;
  const value = requiredStringFlag(flags, "max-items", jsonOutput);
  if (!/^-?\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || (Number(value) !== -1 && Number(value) < 1)) {
    fail("--max-items must be -1 or a positive safe integer", jsonOutput);
  }
  args.push("--max-items", value);
}

function requiredJsonObjectFlag(flags: Flags, key: string, jsonOutput: boolean): string {
  const value = requiredStringFlag(flags, key, jsonOutput);
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
  } catch {
    fail(`--${key} must be a JSON object`, jsonOutput);
  }
  return value;
}

function requiredStringFlag(flags: Flags, key: string, jsonOutput: boolean): string {
  const value = flags[key];
  if (typeof value !== "string" || value.length === 0) {
    fail(`--${key} is required`, jsonOutput);
  }
  return value;
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
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
