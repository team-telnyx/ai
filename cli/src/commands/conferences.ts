/**
 * Conference discovery, creation, participant discovery, and live controls.
 *
 * The generated Telnyx Go CLI has a complete conference surface, so these
 * commands keep the agent-facing registry compact while forwarding only flags
 * supported by each upstream command.
 */

import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { outputJson, printError, printSuccess } from "../utils/output.ts";

type Flags = Record<string, string | boolean>;
type Occurrences = Record<string, Array<string | boolean>>;
type JsonRecord = Record<string, unknown>;

const BOOLEAN_CREATE_FLAGS = new Set(["comfort-noise", "start-conference-on-create"]);
const CREATE_FLAGS = [
  "call-control-id", "name", "beep-enabled", "client-state", "comfort-noise",
  "command-id", "duration-minutes", "hold-audio-url", "hold-media-name",
  "max-participants", "region", "start-conference-on-create",
] as const;

const ACTION_ALIASES: Record<string, ConferenceAction> = {
  end: "end-conference",
  "gather-dtmf": "gather-dtmf-audio",
  "start-recording": "record-start",
  "stop-recording": "record-stop",
  "pause-recording": "record-pause",
  "resume-recording": "record-resume",
};

type ConferenceAction =
  | "update"
  | "end-conference"
  | "gather-dtmf-audio"
  | "hold"
  | "join"
  | "leave"
  | "mute"
  | "play"
  | "record-pause"
  | "record-resume"
  | "record-start"
  | "record-stop"
  | "send-dtmf"
  | "speak"
  | "stop"
  | "unhold"
  | "unmute";

interface ActionSpec {
  flags: readonly string[];
  required?: readonly string[];
  repeated?: readonly string[];
  booleans?: readonly string[];
}

const ACTION_SPECS: Record<ConferenceAction, ActionSpec> = {
  update: {
    flags: ["call-control-id", "supervisor-role", "command-id", "region", "whisper-call-control-id"],
    required: ["call-control-id", "supervisor-role"],
    repeated: ["whisper-call-control-id"],
  },
  "end-conference": { flags: ["command-id"] },
  "gather-dtmf-audio": {
    flags: [
      "call-control-id", "audio-url", "client-state", "gather-id", "initial-timeout-millis",
      "inter-digit-timeout-millis", "invalid-audio-url", "invalid-media-name", "maximum-digits",
      "maximum-tries", "media-name", "minimum-digits", "stop-playback-on-dtmf",
      "terminating-digit", "timeout-millis", "valid-digits",
    ],
    required: ["call-control-id"],
    booleans: ["stop-playback-on-dtmf"],
  },
  hold: {
    flags: ["audio-url", "call-control-id", "media-name", "region"],
    repeated: ["call-control-id"],
  },
  join: {
    flags: [
      "call-control-id", "beep-enabled", "client-state", "command-id", "end-conference-on-exit",
      "hold", "hold-audio-url", "hold-media-name", "mute", "region", "soft-end-conference-on-exit",
      "start-conference-on-enter", "supervisor-role", "whisper-call-control-id",
    ],
    required: ["call-control-id"],
    repeated: ["whisper-call-control-id"],
    booleans: ["end-conference-on-exit", "hold", "mute", "soft-end-conference-on-exit", "start-conference-on-enter"],
  },
  leave: {
    flags: ["call-control-id", "beep-enabled", "command-id", "region"],
    required: ["call-control-id"],
  },
  mute: { flags: ["call-control-id", "region"], repeated: ["call-control-id"] },
  play: {
    flags: ["audio-url", "call-control-id", "loop", "media-name", "region"],
    repeated: ["call-control-id"],
  },
  "record-pause": { flags: ["command-id", "recording-id", "region"] },
  "record-resume": { flags: ["command-id", "recording-id", "region"] },
  "record-start": {
    flags: ["format", "channels", "command-id", "custom-file-name", "play-beep", "region", "trim"],
    required: ["format"],
    booleans: ["play-beep"],
  },
  "record-stop": { flags: ["client-state", "command-id", "recording-id", "region"] },
  "send-dtmf": {
    flags: ["digits", "call-control-id", "client-state", "duration-millis"],
    required: ["digits"],
    repeated: ["call-control-id"],
  },
  speak: {
    flags: ["payload", "voice", "call-control-id", "command-id", "language", "payload-type", "region", "voice-settings"],
    required: ["payload", "voice"],
    repeated: ["call-control-id"],
  },
  stop: { flags: ["call-control-id", "region"], repeated: ["call-control-id"] },
  unhold: {
    flags: ["call-control-id", "region"],
    required: ["call-control-id"],
    repeated: ["call-control-id"],
  },
  unmute: { flags: ["call-control-id", "region"], repeated: ["call-control-id"] },
};

export const CONFERENCE_ACTIONS = Object.freeze(Object.keys(ACTION_SPECS) as ConferenceAction[]);

export async function createConferenceCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  requireValue(flags, "call-control-id", "call leg to bridge into the new conference", jsonOutput);
  requireValue(flags, "name", "conference name", jsonOutput);

  const args = ["conferences", "create"];
  for (const key of CREATE_FLAGS) {
    addFlag(args, key, flags[key], BOOLEAN_CREATE_FLAGS.has(key), jsonOutput);
  }
  await runObjectCommand(args, jsonOutput, "Conference created!", "conference");
}

export async function getConferenceCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const id = requireValue(flags, "id", "conference ID", jsonOutput);
  const args = ["conferences", "retrieve", "--id", id];
  addFlag(args, "region", flags.region, false, jsonOutput);
  await runObjectCommand(args, jsonOutput, "Conference retrieved!", "conference", id);
}

export async function listConferencesCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const args = ["conferences", "list"];
  addFlag(args, "filter.name", flags.name, false, jsonOutput);
  addFlag(args, "filter.status", flags.status, false, jsonOutput);
  addFlag(args, "page-number", positiveInteger(flags, "page-number", jsonOutput), false, jsonOutput);
  addFlag(args, "page-size", positiveInteger(flags, "page-size", jsonOutput), false, jsonOutput);
  addFlag(args, "region", flags.region, false, jsonOutput);
  const maxItems = maxItemsValue(flags, jsonOutput);
  await runListCommand(args, maxItems, jsonOutput, "Conferences retrieved!", "conferences");
}

export async function listConferenceParticipantsCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const conferenceId = requireValue(flags, "conference-id", "conference ID", jsonOutput);
  const args = ["conferences", "list-participants", "--conference-id", conferenceId];
  addFlag(args, "filter.muted", flags.muted, true, jsonOutput);
  addFlag(args, "filter.on-hold", flags["on-hold"], true, jsonOutput);
  addFlag(args, "filter.whispering", flags.whispering, true, jsonOutput);
  addFlag(args, "page-number", positiveInteger(flags, "page-number", jsonOutput), false, jsonOutput);
  addFlag(args, "page-size", positiveInteger(flags, "page-size", jsonOutput), false, jsonOutput);
  addFlag(args, "region", flags.region, false, jsonOutput);
  const maxItems = maxItemsValue(flags, jsonOutput);
  await runListCommand(args, maxItems, jsonOutput, "Conference participants retrieved!", "participants", conferenceId);
}

export async function conferenceControlCommand(flags: Flags, occurrences: Occurrences = {}): Promise<void> {
  const jsonOutput = flags.json === true;
  const requested = requireValue(flags, "action", "conference action", jsonOutput);
  const action = (ACTION_ALIASES[requested] ?? requested) as ConferenceAction;
  const spec = ACTION_SPECS[action];
  if (!spec) {
    fail(`Unknown --action: ${requested}. Valid actions: ${CONFERENCE_ACTIONS.join(", ")}`, jsonOutput);
  }
  const conferenceId = stringValue(flags["conference-id"]) ?? stringValue(flags.id);
  if (!conferenceId) fail("--conference-id is required", jsonOutput);

  for (const required of spec.required ?? []) {
    const values = repeatedValues(required, flags, occurrences);
    if (values.length === 0) fail(`--${required} is required for ${requested}`, jsonOutput);
  }

  for (const repeated of spec.repeated ?? []) {
    const rawValues = occurrences[repeated] ?? (flags[repeated] === undefined ? [] : [flags[repeated]]);
    if (rawValues.some((value) => typeof value !== "string" || value.length === 0)) {
      fail(`--${repeated} requires a value`, jsonOutput);
    }
  }

  const accepted = new Set(["action", "conference-id", "id", "json", ...spec.flags]);
  const unsupported = Object.keys(flags).filter((key) => key !== "_" && !accepted.has(key));
  if (unsupported.length > 0) {
    fail(`Unsupported flag${unsupported.length === 1 ? "" : "s"} for ${requested}: ${unsupported.map((key) => `--${key}`).join(", ")}`, jsonOutput);
  }

  const args = ["conferences:actions", action, "--id", conferenceId];
  const repeated = new Set(spec.repeated ?? []);
  const booleans = new Set(spec.booleans ?? []);
  for (const key of spec.flags) {
    if (repeated.has(key)) {
      for (const value of repeatedValues(key, flags, occurrences)) {
        addFlag(args, key, value, false, jsonOutput);
      }
    } else {
      addFlag(args, key, flags[key], booleans.has(key), jsonOutput);
    }
  }

  try {
    const response = await telnyxCli(args);
    const result = {
      action,
      conference_id: conferenceId,
      result: asRecord(response).data ?? response,
    };
    if (jsonOutput) outputJson(result);
    else printSuccess(`Conference action '${action}' completed`, { "Conference ID": conferenceId, Action: action });
  } catch (error) {
    fail(errorMessage(error), jsonOutput);
  }
}

async function runObjectCommand(
  args: string[],
  jsonOutput: boolean,
  message: string,
  field: string,
  fallbackId?: string,
): Promise<void> {
  try {
    const response = await telnyxCli(args);
    const value = asRecord(response).data ?? response;
    if (jsonOutput) {
      outputJson({ [field]: value });
      return;
    }
    const record = asRecord(value);
    printSuccess(message, {
      "Conference ID": stringValue(record.id) ?? fallbackId ?? "(not returned)",
      Name: stringValue(record.name) ?? "(not returned)",
      Status: stringValue(record.status) ?? "(not returned)",
    });
  } catch (error) {
    fail(errorMessage(error), jsonOutput);
  }
}

async function runListCommand(
  args: string[],
  maxItems: number,
  jsonOutput: boolean,
  message: string,
  field: "conferences" | "participants",
  conferenceId?: string,
): Promise<void> {
  try {
    const response = await telnyxCli(args, { format: "raw" });
    const envelope = asRecord(response);
    const allItems = Array.isArray(envelope.data) ? envelope.data : [];
    const items = maxItems < 0 ? allItems : allItems.slice(0, maxItems);
    const result = {
      ...(conferenceId ? { conference_id: conferenceId } : {}),
      count: items.length,
      [field]: items,
      meta: asRecord(envelope.meta),
    };
    if (jsonOutput) outputJson(result);
    else printSuccess(message, { ...(conferenceId ? { "Conference ID": conferenceId } : {}), Count: items.length });
  } catch (error) {
    fail(errorMessage(error), jsonOutput);
  }
}

function addFlag(args: string[], key: string, value: string | boolean | undefined, booleanFlag: boolean, jsonOutput: boolean): void {
  if (value === undefined || value === false) {
    if (booleanFlag && value === false) args.push(`--${key}=false`);
    return;
  }
  if (booleanFlag) {
    if (value === true || value === "true") args.push(`--${key}=true`);
    else if (value === "false") args.push(`--${key}=false`);
    else fail(`--${key} must be true or false`, jsonOutput);
    return;
  }
  if (typeof value !== "string" || value.length === 0) fail(`--${key} requires a value`, jsonOutput);
  args.push(`--${key}`, value);
}

function repeatedValues(key: string, flags: Flags, occurrences: Occurrences): string[] {
  const values = occurrences[key] ?? (flags[key] === undefined ? [] : [flags[key]]);
  return values.flatMap((value) => {
    if (typeof value !== "string") return [];
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  });
}

function requireValue(flags: Flags, key: string, label: string, jsonOutput: boolean): string {
  const value = stringValue(flags[key]);
  if (!value) fail(`--${key} is required (${label})`, jsonOutput);
  return value;
}

function positiveInteger(flags: Flags, key: string, jsonOutput: boolean): string | undefined {
  if (flags[key] !== undefined && typeof flags[key] !== "string") {
    fail(`--${key} must be a positive safe integer`, jsonOutput);
  }
  const value = stringValue(flags[key]);
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(parsed) || parsed < 1) {
    fail(`--${key} must be a positive safe integer`, jsonOutput);
  }
  return value;
}

function maxItemsValue(flags: Flags, jsonOutput: boolean): number {
  if (flags["max-items"] !== undefined && typeof flags["max-items"] !== "string") {
    fail("--max-items must be -1 or a non-negative safe integer", jsonOutput);
  }
  const value = stringValue(flags["max-items"]);
  if (value === undefined) return -1;
  const parsed = Number(value);
  if (!/^(?:-1|\d+)$/.test(value) || !Number.isSafeInteger(parsed)) {
    fail("--max-items must be -1 or a non-negative safe integer", jsonOutput);
  }
  return parsed;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
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
