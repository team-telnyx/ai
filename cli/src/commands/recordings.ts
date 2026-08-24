/**
 * Read-only post-call recording and transcription discovery backed by the
 * Stainless-generated Telnyx Go CLI.
 *
 * List actions request raw output so each command receives one parseable
 * `{ data, meta }` REST envelope rather than concatenated iterator documents.
 */

import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { outputJson, printError, printSuccess } from "../utils/output.ts";

type Flags = Record<string, string | boolean>;
type JsonRecord = Record<string, unknown>;

interface RecordingListResult {
  count: number;
  recordings: JsonRecord[];
  meta: JsonRecord;
}

interface RecordingResult {
  recording_id: string;
  recording: JsonRecord;
}

interface TranscriptionListResult {
  count: number;
  recording_transcriptions: JsonRecord[];
  meta: JsonRecord;
}

interface TranscriptionResult {
  recording_transcription_id: string;
  recording_transcription: JsonRecord;
}

const RECORDING_SCALAR_FILTERS = [
  "call-control-id",
  "call-leg-id",
  "call-session-id",
  "conference-id",
  "conference-region",
  "connection-id",
  "from",
  "sip-call-id",
  "to",
] as const;

const RECORDING_RANGE_FILTERS = ["created-at", "end-time", "start-time"] as const;

export async function listCallRecordingsCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const args = ["recordings", "list"];

  for (const name of RECORDING_SCALAR_FILTERS) {
    addMappedFlag(args, flags, name, `--filter.${name}`);
  }
  for (const name of RECORDING_RANGE_FILTERS) {
    addJsonObjectFlag(args, flags, name, `--filter.${name}`, jsonOutput);
  }
  addPositiveIntegerFlag(args, flags, "page-number", jsonOutput);
  addPositiveIntegerFlag(args, flags, "page-size", jsonOutput);
  const maxItems = maxItemsFlag(flags, jsonOutput);

  try {
    const response = await telnyxCli(args, { format: "raw" });
    const envelope = asRecord(response);
    const allRecordings = objectArray(envelope.data);
    const recordings = maxItems === undefined || maxItems === -1
      ? allRecordings
      : allRecordings.slice(0, maxItems);
    presentRecordingList({
      count: recordings.length,
      recordings,
      meta: asRecord(envelope.meta),
    }, jsonOutput);
  } catch (error) {
    fail(errorMessage(error), jsonOutput);
  }
}

export async function getCallRecordingCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const recordingId = requiredStringFlag(flags, "id", "call recording ID", jsonOutput);

  try {
    const response = await telnyxCli([
      "recordings", "retrieve", "--recording-id", recordingId,
    ]);
    const recording = asRecord(asRecord(response).data ?? response);
    const result: RecordingResult = {
      recording_id: stringValue(recording.id) || recordingId,
      recording,
    };

    if (jsonOutput) {
      outputJson(result);
    } else {
      printSuccess("Call recording retrieved!", {
        "Recording ID": result.recording_id,
        Status: stringValue(recording.status) || "(not returned)",
        From: stringValue(recording.from) || "(not returned)",
        To: stringValue(recording.to) || "(not returned)",
        Created: stringValue(recording.created_at) || "(not returned)",
      });
    }
  } catch (error) {
    fail(errorMessage(error), jsonOutput);
  }
}

export async function listRecordingTranscriptionsCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const args = ["recording-transcriptions", "list"];

  addMappedFlag(args, flags, "recording-id", "--filter.recording-id");
  addJsonObjectFlag(args, flags, "created-at", "--filter.created-at", jsonOutput);
  addPositiveIntegerFlag(args, flags, "page-number", jsonOutput);
  addPositiveIntegerFlag(args, flags, "page-size", jsonOutput);
  const maxItems = maxItemsFlag(flags, jsonOutput);

  try {
    const response = await telnyxCli(args, { format: "raw" });
    const envelope = asRecord(response);
    const allTranscriptions = objectArray(envelope.data);
    const recordingTranscriptions = maxItems === undefined || maxItems === -1
      ? allTranscriptions
      : allTranscriptions.slice(0, maxItems);
    presentTranscriptionList({
      count: recordingTranscriptions.length,
      recording_transcriptions: recordingTranscriptions,
      meta: asRecord(envelope.meta),
    }, jsonOutput);
  } catch (error) {
    fail(errorMessage(error), jsonOutput);
  }
}

export async function getRecordingTranscriptionCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const transcriptionId = requiredStringFlag(
    flags,
    "id",
    "recording transcription ID",
    jsonOutput,
  );

  try {
    const response = await telnyxCli([
      "recording-transcriptions", "retrieve",
      "--recording-transcription-id", transcriptionId,
    ]);
    const transcription = asRecord(asRecord(response).data ?? response);
    const result: TranscriptionResult = {
      recording_transcription_id: stringValue(transcription.id) || transcriptionId,
      recording_transcription: transcription,
    };

    if (jsonOutput) {
      outputJson(result);
    } else {
      printSuccess("Recording transcription retrieved!", {
        "Transcription ID": result.recording_transcription_id,
        "Recording ID": stringValue(transcription.recording_id) || "(not returned)",
        Status: stringValue(transcription.status) || "(not returned)",
        Created: stringValue(transcription.created_at) || "(not returned)",
      });
    }
  } catch (error) {
    fail(errorMessage(error), jsonOutput);
  }
}

function presentRecordingList(result: RecordingListResult, jsonOutput: boolean): void {
  if (jsonOutput) {
    outputJson(result);
    return;
  }

  printSuccess("Call recordings retrieved!", { Count: result.count });
  for (const recording of result.recordings) {
    const id = stringValue(recording.id) || "(unknown)";
    const details = [recording.status, recording.from, recording.to, recording.created_at]
      .map(stringValue)
      .filter(Boolean)
      .join(" · ");
    console.log(`  • ${id}${details ? ` — ${details}` : ""}`);
  }
  if (result.count === 0) console.log("  (no call recordings returned)");
  console.log();
}

function presentTranscriptionList(result: TranscriptionListResult, jsonOutput: boolean): void {
  if (jsonOutput) {
    outputJson(result);
    return;
  }

  printSuccess("Recording transcriptions retrieved!", { Count: result.count });
  for (const transcription of result.recording_transcriptions) {
    const id = stringValue(transcription.id) || "(unknown)";
    const details = [transcription.recording_id, transcription.status, transcription.created_at]
      .map(stringValue)
      .filter(Boolean)
      .join(" · ");
    console.log(`  • ${id}${details ? ` — ${details}` : ""}`);
  }
  if (result.count === 0) console.log("  (no recording transcriptions returned)");
  console.log();
}

function addMappedFlag(args: string[], flags: Flags, source: string, target: string): void {
  const value = stringFlag(flags, source);
  if (value !== undefined) args.push(target, value);
}

function addJsonObjectFlag(
  args: string[],
  flags: Flags,
  source: string,
  target: string,
  jsonOutput: boolean,
): void {
  const value = stringFlag(flags, source);
  if (value === undefined) return;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      fail(`--${source} must be a JSON object`, jsonOutput);
    }
    args.push(target, JSON.stringify(parsed));
  } catch (error) {
    fail(`--${source} must be a JSON object: ${error instanceof Error ? error.message : String(error)}`, jsonOutput);
  }
}

function addPositiveIntegerFlag(
  args: string[],
  flags: Flags,
  source: "page-number" | "page-size",
  jsonOutput: boolean,
): void {
  const raw = flags[source];
  if (raw === undefined) return;
  if (typeof raw !== "string") fail(`--${source} must be a positive safe integer`, jsonOutput);
  const parsed = Number(raw);
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(parsed) || parsed < 1) {
    fail(`--${source} must be a positive safe integer`, jsonOutput);
  }
  args.push(`--${source}`, raw);
}

function maxItemsFlag(flags: Flags, jsonOutput: boolean): number | undefined {
  const raw = flags["max-items"];
  if (raw === undefined) return undefined;
  if (typeof raw !== "string") {
    fail("--max-items must be -1 or a non-negative safe integer", jsonOutput);
  }
  const parsed = Number(raw);
  if (!/^(?:-1|\d+)$/.test(raw) || !Number.isSafeInteger(parsed)) {
    fail("--max-items must be -1 or a non-negative safe integer", jsonOutput);
  }
  return parsed;
}

function requiredStringFlag(flags: Flags, key: string, label: string, jsonOutput: boolean): string {
  const value = stringFlag(flags, key);
  if (!value) fail(`--${key} is required (${label})`, jsonOutput);
  return value;
}

function objectArray(value: unknown): JsonRecord[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is JsonRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item),
      )
    : [];
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

function errorMessage(error: unknown): string {
  if (error instanceof TelnyxCLIError) return error.stderr || error.message;
  if (error instanceof Error) return error.message;
  return String(error);
}

function fail(message: string, jsonOutput: boolean): never {
  if (jsonOutput) outputJson({ error: message });
  else printError(message);
  process.exit(1);
}
