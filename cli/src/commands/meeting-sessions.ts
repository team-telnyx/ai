/**
 * Meeting Bot session lifecycle, live controls, and artifact retrieval.
 *
 * These routes first appear in Telnyx Go CLI v0.27.0. The npm package remains
 * pinned to its current bundled CLI until the separate v0.27 upgrade lands, so
 * every invocation performs a command-scoped compatibility check and reports an
 * actionable upgrade error instead of dispatching an unknown generated command.
 *
 * Important lifecycle detail: upstream `meeting-sessions delete` ends/cancels a
 * bot session but deliberately retains the session record. It is therefore
 * exposed as `end-meeting-session`, not as a misleading hard-delete command.
 */

import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { outputJson, printError, printSuccess } from "../utils/output.ts";

type Flags = Record<string, string | boolean>;
type JsonRecord = Record<string, unknown>;

const MINIMUM_CLI_VERSION = "0.27.0";
const CLI_OPTIONS = { minimumVersion: MINIMUM_CLI_VERSION } as const;

const CREATE_VALUE_FLAGS = [
  "assistant",
  "avatar",
  "bot-name",
  "camera-image",
  "idempotency-key",
  "join-at",
  "metadata",
  "speak-on-enter",
  "voice",
  "webhook-url",
] as const;

export async function createMeetingSessionCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const meetingUrl = requiredString(flags, "meeting-url", jsonOutput);
  const args = ["meeting-sessions", "create", "--meeting-url", meetingUrl];

  for (const name of CREATE_VALUE_FLAGS) {
    const value = optionalString(flags, name);
    if (value === undefined) continue;
    if (["assistant", "avatar", "camera-image", "metadata"].includes(name)) {
      validateJsonObject(value, name, jsonOutput);
    }
    args.push(`--${name}`, value);
  }
  addBooleanFlag(args, flags, "barge-in", jsonOutput);
  addBooleanFlag(args, flags, "summarize-on-end", jsonOutput);

  try {
    const response = await meetingCli(args);
    presentSession("Meeting session created!", normalizeSession(response), jsonOutput);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function listMeetingSessionsCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const args = ["meeting-sessions", "list"];
  addStringFlag(args, flags, "status");

  try {
    const response = await meetingCli(args, "raw");
    const envelope = asRecord(response);
    const sessions = recordArray(Array.isArray(response) ? response : envelope.data);
    const result = {
      count: sessions.length,
      meeting_sessions: sessions,
      meta: asRecord(envelope.meta),
    };
    if (jsonOutput) {
      outputJson(result);
      return;
    }
    printSuccess("Meeting sessions retrieved!", { Count: result.count });
    for (const session of sessions) {
      const id = stringValue(session.id) || "(unknown)";
      const name = stringValue(session.bot_name) || "Meeting Bot";
      const status = stringValue(session.status) || "unknown";
      console.log(`  • ${name} — ${id} · ${status}`);
    }
    if (sessions.length === 0) console.log("  (no meeting sessions returned)");
    console.log();
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function getMeetingSessionCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const id = meetingSessionId(flags, jsonOutput);
  try {
    const response = await meetingCli(["meeting-sessions", "retrieve", "--id", id]);
    presentSession("Meeting session retrieved!", normalizeSession(response, id), jsonOutput);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function endMeetingSessionCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const id = meetingSessionId(flags, jsonOutput);
  try {
    const response = await meetingCli(["meeting-sessions", "delete", "--id", id]);
    const session = asRecord(asRecord(response).data ?? response);
    const result = {
      meeting_session_id: stringValue(session.id) || id,
      ended: true as const,
      meeting_session: session,
    };
    if (jsonOutput) {
      outputJson(result);
    } else {
      printSuccess("Meeting session ended!", {
        "Meeting Session ID": result.meeting_session_id,
        "Record retained": "yes",
      });
    }
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function sendMeetingChatCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const id = meetingSessionId(flags, jsonOutput);
  const text = requiredString(flags, "text", jsonOutput);
  await runLiveAction(
    "send-chat",
    ["meeting-sessions:actions", "send-chat", "--id", id, "--text", text],
    id,
    "Meeting chat sent!",
    jsonOutput,
  );
}

export async function speakInMeetingCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const id = meetingSessionId(flags, jsonOutput);
  const text = requiredString(flags, "text", jsonOutput);
  const args = ["meeting-sessions:actions", "speak", "--id", id, "--text", text];
  addStringFlag(args, flags, "voice");
  addBooleanFlag(args, flags, "interrupt", jsonOutput);
  await runLiveAction("speak", args, id, "Meeting speech started!", jsonOutput);
}

export async function stopMeetingSpeakingCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const id = meetingSessionId(flags, jsonOutput);
  await runLiveAction(
    "stop-speaking",
    ["meeting-sessions:actions", "stop-speaking", "--id", id],
    id,
    "Meeting speech stopped!",
    jsonOutput,
  );
}

export async function getMeetingTranscriptCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const id = meetingSessionId(flags, jsonOutput);
  const args = ["meeting-sessions", "retrieve-transcript", "--id", id];
  addNonNegativeIntegerFlag(args, flags, "after", jsonOutput);
  addIntegerRangeFlag(args, flags, "limit", 1, 1000, jsonOutput);
  addNonNegativeIntegerFlag(args, flags, "wait-seconds", jsonOutput);

  try {
    const response = await meetingCli(args);
    const envelope = asRecord(response);
    const segments = recordArray(Array.isArray(response) ? response : envelope.data);
    const result = {
      meeting_session_id: id,
      count: segments.length,
      transcript: segments,
      meta: asRecord(envelope.meta),
    };
    if (jsonOutput) outputJson(result);
    else printSuccess("Meeting transcript retrieved!", {
      "Meeting Session ID": id,
      Segments: result.count,
      "Next cursor": stringValue(result.meta.next_after) || "(none)",
    });
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function getMeetingRecordingsCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const id = meetingSessionId(flags, jsonOutput);
  try {
    const response = await meetingCli(["meeting-sessions", "retrieve-recordings", "--id", id]);
    const envelope = asRecord(response);
    const recordings = recordArray(Array.isArray(response) ? response : envelope.data);
    const result = { meeting_session_id: id, count: recordings.length, recordings };
    if (jsonOutput) outputJson(result);
    else printSuccess("Meeting recordings retrieved!", {
      "Meeting Session ID": id,
      Recordings: result.count,
    });
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function createMeetingArtifactCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const id = meetingSessionId(flags, jsonOutput);
  const type = requiredString(flags, "type", jsonOutput);
  if (type !== "summary" && type !== "action_items") {
    fail("--type must be summary or action_items", jsonOutput);
  }
  try {
    const response = await meetingCli([
      "meeting-sessions:artifacts", "create", "--id", id, "--type", type,
    ]);
    presentArtifact("Meeting artifact generation requested!", normalizeArtifact(response, id), jsonOutput);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function listMeetingArtifactsCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const id = meetingSessionId(flags, jsonOutput);
  try {
    const response = await meetingCli(
      ["meeting-sessions:artifacts", "list", "--id", id],
      "raw",
    );
    const envelope = asRecord(response);
    const artifacts = recordArray(Array.isArray(response) ? response : envelope.data);
    const result = {
      meeting_session_id: id,
      count: artifacts.length,
      artifacts,
      meta: asRecord(envelope.meta),
    };
    if (jsonOutput) outputJson(result);
    else printSuccess("Meeting artifacts retrieved!", {
      "Meeting Session ID": id,
      Artifacts: result.count,
    });
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function getMeetingArtifactCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const id = meetingSessionId(flags, jsonOutput);
  const artifactId = requiredString(flags, "artifact-id", jsonOutput);
  try {
    const response = await meetingCli([
      "meeting-sessions:artifacts", "retrieve",
      "--id", id,
      "--artifact-id", artifactId,
    ]);
    presentArtifact(
      "Meeting artifact retrieved!",
      normalizeArtifact(response, id, artifactId),
      jsonOutput,
    );
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

async function runLiveAction(
  action: string,
  args: string[],
  meetingSessionIdValue: string,
  title: string,
  jsonOutput: boolean,
): Promise<void> {
  try {
    const response = await meetingCli(args);
    const result = {
      meeting_session_id: meetingSessionIdValue,
      action,
      result: asRecord(response).data ?? response,
    };
    if (jsonOutput) outputJson(result);
    else printSuccess(title, {
      "Meeting Session ID": meetingSessionIdValue,
      Action: action,
    });
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

async function meetingCli(args: string[], format: "json" | "raw" = "json"): Promise<unknown> {
  return telnyxCli(args, { ...CLI_OPTIONS, format });
}

function normalizeSession(response: unknown, fallbackId = ""): {
  meeting_session_id: string;
  meeting_session: JsonRecord;
} {
  const session = asRecord(asRecord(response).data ?? response);
  return {
    meeting_session_id: stringValue(session.id) || fallbackId,
    meeting_session: session,
  };
}

function normalizeArtifact(response: unknown, meetingId: string, fallbackArtifactId = ""): {
  meeting_session_id: string;
  artifact_id: string;
  artifact: JsonRecord;
} {
  const artifact = asRecord(asRecord(response).data ?? response);
  return {
    meeting_session_id: meetingId,
    artifact_id: stringValue(artifact.id) || fallbackArtifactId,
    artifact,
  };
}

function presentSession(
  title: string,
  result: { meeting_session_id: string; meeting_session: JsonRecord },
  jsonOutput: boolean,
): void {
  if (jsonOutput) {
    outputJson(result);
    return;
  }
  printSuccess(title, {
    "Meeting Session ID": result.meeting_session_id || "(not returned)",
    "Bot name": stringValue(result.meeting_session.bot_name) || "Meeting Bot",
    Status: stringValue(result.meeting_session.status) || "(not returned)",
  });
}

function presentArtifact(
  title: string,
  result: { meeting_session_id: string; artifact_id: string; artifact: JsonRecord },
  jsonOutput: boolean,
): void {
  if (jsonOutput) {
    outputJson(result);
    return;
  }
  printSuccess(title, {
    "Meeting Session ID": result.meeting_session_id,
    "Artifact ID": result.artifact_id || "(not returned)",
    Type: stringValue(result.artifact.type) || "(not returned)",
    Status: stringValue(result.artifact.status) || "(not returned)",
  });
}

function meetingSessionId(flags: Flags, jsonOutput: boolean): string {
  const id = nonEmptyString(flags, "id");
  const sessionId = nonEmptyString(flags, "meeting-session-id");
  if (id && sessionId && id !== sessionId) {
    fail("--id and --meeting-session-id cannot specify different values", jsonOutput);
  }
  const value = sessionId ?? id;
  if (!value) fail("--id is required (Meeting session ID; --meeting-session-id is also accepted)", jsonOutput);
  return value;
}

function addStringFlag(args: string[], flags: Flags, name: string): void {
  const value = optionalString(flags, name);
  if (value !== undefined) args.push(`--${name}`, value);
}

function addBooleanFlag(args: string[], flags: Flags, name: string, jsonOutput: boolean): void {
  const value = flags[name];
  if (value === undefined) return;
  if (value === true || value === "true") {
    args.push(`--${name}=true`);
  } else if (value === false || value === "false") {
    args.push(`--${name}=false`);
  } else {
    fail(`--${name} must be true or false`, jsonOutput);
  }
}

function addNonNegativeIntegerFlag(
  args: string[],
  flags: Flags,
  name: string,
  jsonOutput: boolean,
): void {
  const value = optionalString(flags, name);
  if (value === undefined) return;
  if (!/^\d+$/.test(value)) fail(`--${name} must be a non-negative integer`, jsonOutput);
  args.push(`--${name}`, value);
}

function addIntegerRangeFlag(
  args: string[],
  flags: Flags,
  name: string,
  minimum: number,
  maximum: number,
  jsonOutput: boolean,
): void {
  const value = optionalString(flags, name);
  if (value === undefined) return;
  if (!/^\d+$/.test(value) || Number(value) < minimum || Number(value) > maximum) {
    fail(`--${name} must be an integer between ${minimum} and ${maximum}`, jsonOutput);
  }
  args.push(`--${name}`, value);
}

function validateJsonObject(value: string, name: string, jsonOutput: boolean): void {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
  } catch {
    fail(`--${name} must be a JSON object`, jsonOutput);
  }
}

function requiredString(flags: Flags, name: string, jsonOutput: boolean): string {
  const value = nonEmptyString(flags, name);
  if (!value) fail(`--${name} is required`, jsonOutput);
  return value;
}

function optionalString(flags: Flags, name: string): string | undefined {
  const value = flags[name];
  return typeof value === "string" ? value : undefined;
}

function nonEmptyString(flags: Flags, name: string): string | undefined {
  const value = optionalString(flags, name);
  return value && value.length > 0 ? value : undefined;
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function recordArray(value: unknown): JsonRecord[] {
  return Array.isArray(value)
    ? value.filter((item): item is JsonRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    : [];
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
