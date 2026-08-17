/**
 * Room-session discovery and moderation actions backed by the generated Go CLI.
 *
 * List requests use raw output so the Go CLI returns one parseable
 * `{ data, meta }` envelope instead of concatenated iterator documents.
 */

import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { outputJson, printError, printSuccess } from "../utils/output.ts";

type Flags = Record<string, string | boolean>;
type JsonRecord = Record<string, unknown>;
type RoomSessionAction = "end" | "kick" | "mute" | "unmute";
type ParticipantSelection = "all" | string[];

interface RoomSessionListResult {
  count: number;
  room_sessions: JsonRecord[];
  meta: JsonRecord;
}

interface RoomSessionResult {
  room_session_id: string;
  room_session: JsonRecord;
}

interface RoomParticipantListResult {
  room_session_id: string;
  count: number;
  participants: JsonRecord[];
  meta: JsonRecord;
}

interface RoomParticipantResult {
  room_participant_id: string;
  participant: JsonRecord;
}

interface RoomSessionActionResult {
  room_session_id: string;
  action: RoomSessionAction;
  participants?: ParticipantSelection;
  excluded_participants?: string[];
  result: JsonRecord;
}

export async function listRoomSessionsCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const args = ["rooms:sessions", "list-0"];

  addMappedFlag(args, flags, "room-id", "--filter.room-id");
  addBooleanFlag(args, flags, "active", "--filter.active", jsonOutput);
  addBooleanFlag(args, flags, "include-participants", "--include-participants", jsonOutput);
  addPositiveIntegerFlag(args, flags, "page-number", jsonOutput);
  addPositiveIntegerFlag(args, flags, "page-size", jsonOutput);

  try {
    const response = await telnyxCli(args, { format: "raw" });
    const page = normalizeListPage(response);
    const result: RoomSessionListResult = {
      count: page.items.length,
      room_sessions: page.items,
      meta: page.meta,
    };
    presentRoomSessionList(result, jsonOutput);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function getRoomSessionCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const roomSessionId = requiredStringFlag(flags, "room-session-id", "room session ID", jsonOutput);
  const args = ["rooms:sessions", "retrieve", "--room-session-id", roomSessionId];
  addBooleanFlag(args, flags, "include-participants", "--include-participants", jsonOutput);

  try {
    const response = await telnyxCli(args);
    const roomSession = responseData(response);
    const result: RoomSessionResult = {
      room_session_id: stringValue(roomSession.id) || roomSessionId,
      room_session: roomSession,
    };
    presentRoomSession(result, jsonOutput);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function listRoomParticipantsCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const roomSessionId = requiredStringFlag(flags, "room-session-id", "room session ID", jsonOutput);
  const args = [
    "rooms:sessions",
    "retrieve-participants",
    "--room-session-id",
    roomSessionId,
  ];

  addMappedFlag(args, flags, "context", "--filter.context");
  addPositiveIntegerFlag(args, flags, "page-number", jsonOutput);
  addPositiveIntegerFlag(args, flags, "page-size", jsonOutput);

  try {
    const response = await telnyxCli(args, { format: "raw" });
    const page = normalizeListPage(response);
    const result: RoomParticipantListResult = {
      room_session_id: roomSessionId,
      count: page.items.length,
      participants: page.items,
      meta: page.meta,
    };
    presentRoomParticipantList(result, jsonOutput);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function getRoomParticipantCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const participantId = requiredStringFlag(flags, "room-participant-id", "room participant ID", jsonOutput);

  try {
    const response = await telnyxCli([
      "room-participants",
      "retrieve",
      "--room-participant-id",
      participantId,
    ]);
    const participant = responseData(response);
    const result: RoomParticipantResult = {
      room_participant_id: stringValue(participant.id) || participantId,
      participant,
    };
    presentRoomParticipant(result, jsonOutput);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function endRoomSessionCommand(flags: Flags): Promise<void> {
  await runRoomSessionAction("end", flags);
}

export async function kickRoomParticipantsCommand(flags: Flags): Promise<void> {
  await runRoomSessionAction("kick", flags);
}

export async function muteRoomParticipantsCommand(flags: Flags): Promise<void> {
  await runRoomSessionAction("mute", flags);
}

export async function unmuteRoomParticipantsCommand(flags: Flags): Promise<void> {
  await runRoomSessionAction("unmute", flags);
}

async function runRoomSessionAction(action: RoomSessionAction, flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const roomSessionId = requiredStringFlag(flags, "room-session-id", "room session ID", jsonOutput);
  const args = ["rooms:sessions:actions", action, "--room-session-id", roomSessionId];
  let participants: ParticipantSelection | undefined;
  let excludedParticipants: string[] | undefined;

  if (action !== "end") {
    participants = parseParticipantSelection(flags, jsonOutput);
    args.push(
      "--participants",
      participants === "all" ? participants : JSON.stringify(participants),
    );
    excludedParticipants = parseCsvFlag(flags, "exclude", jsonOutput);
    for (const participantId of excludedParticipants) {
      args.push("--exclude", participantId);
    }
  }

  try {
    const response = await telnyxCli(args);
    const result: RoomSessionActionResult = {
      room_session_id: roomSessionId,
      action,
      ...(participants === undefined ? {} : { participants }),
      ...(excludedParticipants?.length ? { excluded_participants: excludedParticipants } : {}),
      result: responseData(response),
    };
    presentRoomSessionAction(result, jsonOutput);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

function normalizeListPage(response: unknown): { items: JsonRecord[]; meta: JsonRecord } {
  const envelope = asRecord(response);
  const items = Array.isArray(envelope.data)
    ? envelope.data.filter(
        (item): item is JsonRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item),
      )
    : [];
  return { items, meta: asRecord(envelope.meta) };
}

function responseData(response: unknown): JsonRecord {
  const envelope = asRecord(response);
  return asRecord(envelope.data ?? response);
}

function presentRoomSessionList(result: RoomSessionListResult, jsonOutput: boolean): void {
  if (jsonOutput) {
    outputJson(result);
    return;
  }

  printSuccess("Room sessions retrieved!", { Count: result.count });
  for (const session of result.room_sessions) {
    const id = stringValue(session.id) || "(unknown)";
    const details = [session.room_id, activeLabel(session.active), session.date_created_at]
      .map(stringValue)
      .filter(Boolean)
      .join(" · ");
    console.log(`  • ${id}${details ? ` — ${details}` : ""}`);
  }
  if (result.count === 0) console.log("  (no room sessions returned)");
  console.log();
}

function presentRoomSession(result: RoomSessionResult, jsonOutput: boolean): void {
  if (jsonOutput) {
    outputJson(result);
    return;
  }
  printSuccess("Room session retrieved!", {
    "Room Session ID": result.room_session_id,
    "Room ID": stringValue(result.room_session.room_id) || "(not returned)",
    Active: activeLabel(result.room_session.active) || "(not returned)",
  });
}

function presentRoomParticipantList(result: RoomParticipantListResult, jsonOutput: boolean): void {
  if (jsonOutput) {
    outputJson(result);
    return;
  }

  printSuccess("Room participants retrieved!", {
    "Room Session ID": result.room_session_id,
    Count: result.count,
  });
  for (const participant of result.participants) {
    const id = stringValue(participant.id) || "(unknown)";
    const details = [participant.context, participant.date_joined_at, participant.date_left_at]
      .map(stringValue)
      .filter(Boolean)
      .join(" · ");
    console.log(`  • ${id}${details ? ` — ${details}` : ""}`);
  }
  if (result.count === 0) console.log("  (no room participants returned)");
  console.log();
}

function presentRoomParticipant(result: RoomParticipantResult, jsonOutput: boolean): void {
  if (jsonOutput) {
    outputJson(result);
    return;
  }
  printSuccess("Room participant retrieved!", {
    "Room Participant ID": result.room_participant_id,
    "Room Session ID": stringValue(result.participant.session_id) || "(not returned)",
    Context: stringValue(result.participant.context) || "(not returned)",
  });
}

function presentRoomSessionAction(result: RoomSessionActionResult, jsonOutput: boolean): void {
  if (jsonOutput) {
    outputJson(result);
    return;
  }
  printSuccess(`Room session ${result.action} requested!`, {
    "Room Session ID": result.room_session_id,
    Action: result.action,
    Participants: formatSelection(result.participants),
    Excluded: result.excluded_participants?.join(", ") || "(none)",
  });
}

function parseParticipantSelection(flags: Flags, jsonOutput: boolean): ParticipantSelection {
  const value = requiredStringFlag(
    flags,
    "participants",
    'participant IDs as comma-separated values, or "all"',
    jsonOutput,
  );
  if (value === "all") return "all";
  const participants = splitCsv(value);
  if (participants.length === 0) {
    fail('--participants must be "all" or contain at least one participant ID', jsonOutput);
  }
  return participants;
}

function parseCsvFlag(flags: Flags, key: string, jsonOutput: boolean): string[] {
  const rawValue = flags[key];
  if (rawValue === undefined) return [];
  if (typeof rawValue !== "string") {
    fail(`--${key} must contain comma-separated participant IDs`, jsonOutput);
  }
  const values = splitCsv(rawValue);
  if (values.length === 0) fail(`--${key} must contain at least one participant ID`, jsonOutput);
  return values;
}

function splitCsv(value: string): string[] {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function addMappedFlag(args: string[], flags: Flags, source: string, target: string): void {
  const value = stringFlag(flags, source);
  if (value !== undefined) args.push(target, value);
}

function addBooleanFlag(
  args: string[],
  flags: Flags,
  source: string,
  target: string,
  jsonOutput: boolean,
): void {
  const value = flags[source];
  if (value === undefined) return;
  if (value === true || value === "true") {
    args.push(`${target}=true`);
    return;
  }
  if (value === false || value === "false") {
    args.push(`${target}=false`);
    return;
  }
  fail(`--${source} must be true or false`, jsonOutput);
}

function addPositiveIntegerFlag(
  args: string[],
  flags: Flags,
  source: "page-number" | "page-size",
  jsonOutput: boolean,
): void {
  const rawValue = flags[source];
  if (rawValue === undefined) return;
  if (typeof rawValue !== "string") fail(`--${source} must be a positive safe integer`, jsonOutput);
  const parsed = Number(rawValue);
  if (!/^\d+$/.test(rawValue) || !Number.isSafeInteger(parsed) || parsed < 1) {
    fail(`--${source} must be a positive safe integer`, jsonOutput);
  }
  args.push(`--${source}`, rawValue);
}

function requiredStringFlag(flags: Flags, key: string, label: string, jsonOutput: boolean): string {
  const value = stringFlag(flags, key);
  if (!value) fail(`--${key} is required (${label})`, jsonOutput);
  return value;
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

function activeLabel(value: unknown): string {
  return typeof value === "boolean" ? (value ? "active" : "inactive") : stringValue(value);
}

function formatSelection(value: ParticipantSelection | undefined): string {
  if (value === undefined) return "(all participants will be removed)";
  return value === "all" ? value : value.join(", ");
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
