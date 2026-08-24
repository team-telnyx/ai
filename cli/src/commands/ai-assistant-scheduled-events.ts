/**
 * AI assistant scheduled-event lifecycle actions backed by the generated Go CLI.
 *
 * List requests use raw output so the wrapper receives one parseable
 * `{ data, meta }` response envelope.
 */

import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { outputJson, printError, printSuccess } from "../utils/output.ts";

type Flags = Record<string, string | boolean>;
type JsonRecord = Record<string, unknown>;

export interface AiAssistantScheduledEventResult {
  assistant_id: string;
  event_id: string;
  scheduled_event: JsonRecord;
}

export interface AiAssistantScheduledEventListResult {
  assistant_id: string;
  count: number;
  scheduled_events: JsonRecord[];
  meta: JsonRecord;
}

export interface CancelAiAssistantScheduledEventResult {
  assistant_id: string;
  event_id: string;
  canceled: true;
}

/** Create a phone-call or SMS event for future assistant execution. */
export async function createAiAssistantScheduledEventCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const assistantId = requiredStringFlag(flags, "assistant-id", jsonOutput);
  const scheduledAt = requiredStringFlag(flags, "scheduled-at-fixed-datetime", jsonOutput);
  const agentTarget = requiredStringFlag(flags, "telnyx-agent-target", jsonOutput);
  const channel = requiredStringFlag(flags, "telnyx-conversation-channel", jsonOutput);
  const endUserTarget = requiredStringFlag(flags, "telnyx-end-user-target", jsonOutput);

  validateIsoDateTime("scheduled-at-fixed-datetime", scheduledAt, jsonOutput);
  validateChannel("telnyx-conversation-channel", channel, jsonOutput);
  if (channel === "sms_chat") requiredStringFlag(flags, "text", jsonOutput);

  const args = [
    "ai:assistants:scheduled-events", "create",
    "--assistant-id", assistantId,
    "--scheduled-at-fixed-datetime", scheduledAt,
    "--telnyx-agent-target", agentTarget,
    "--telnyx-conversation-channel", channel,
    "--telnyx-end-user-target", endUserTarget,
  ];
  addJsonObjectFlag(args, flags, "call-settings", "--call-settings", jsonOutput);
  addOptionalNonEmptyStringFlag(
    args, flags, "call-settings.sip-region", "--call-settings.sip-region", jsonOutput,
  );
  addJsonObjectFlag(args, flags, "conversation-metadata", "--conversation-metadata", jsonOutput);
  addJsonObjectFlag(args, flags, "dynamic-variables", "--dynamic-variables", jsonOutput);
  addNonNegativeInt64Flag(
    args, flags, "max-retries-client-errors", "--max-retries-client-errors", jsonOutput,
  );
  addNonNegativeInt64Flag(args, flags, "retry-interval-secs", "--retry-interval-secs", jsonOutput);
  addOptionalStringFlag(args, flags, "text", "--text", jsonOutput, true);

  try {
    const response = await telnyxCli(args);
    presentScheduledEvent(
      "AI assistant scheduled event created!",
      normalizeScheduledEvent(response, assistantId),
      jsonOutput,
    );
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

/** Retrieve one scheduled event by assistant and event IDs. */
export async function getAiAssistantScheduledEventCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const assistantId = requiredStringFlag(flags, "assistant-id", jsonOutput);
  const eventId = requiredStringFlag(flags, "event-id", jsonOutput);

  try {
    const response = await telnyxCli([
      "ai:assistants:scheduled-events", "retrieve",
      "--assistant-id", assistantId,
      "--event-id", eventId,
    ]);
    presentScheduledEvent(
      "AI assistant scheduled event retrieved!",
      normalizeScheduledEvent(response, assistantId, eventId),
      jsonOutput,
    );
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

/** List scheduled events with the filters exposed by the generated CLI. */
export async function listAiAssistantScheduledEventsCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const assistantId = requiredStringFlag(flags, "assistant-id", jsonOutput);
  const args = [
    "ai:assistants:scheduled-events", "list",
    "--assistant-id", assistantId,
  ];

  if (flags["conversation-channel"] !== undefined) {
    const channel = requiredStringFlag(flags, "conversation-channel", jsonOutput);
    validateChannel("conversation-channel", channel, jsonOutput);
    args.push("--conversation-channel", channel);
  }
  addIsoDateTimeFlag(args, flags, "from-date", "--from-date", jsonOutput);
  addNonNegativeInt64Flag(args, flags, "page-number", "--page-number", jsonOutput);
  addNonNegativeInt64Flag(args, flags, "page-size", "--page-size", jsonOutput);
  addIsoDateTimeFlag(args, flags, "to-date", "--to-date", jsonOutput);
  const maxItems = addMaxItemsFlag(args, flags, jsonOutput);

  try {
    const response = await telnyxCli(args, { format: "raw" });
    const envelope = asRecord(response);
    const allEvents = dataRecords(response);
    const scheduledEvents = maxItems === undefined || maxItems === -1
      ? allEvents
      : allEvents.slice(0, maxItems);
    const result: AiAssistantScheduledEventListResult = {
      assistant_id: assistantId,
      count: scheduledEvents.length,
      scheduled_events: scheduledEvents,
      meta: asRecord(envelope.meta),
    };

    if (jsonOutput) {
      outputJson(result);
      return;
    }
    printSuccess("AI assistant scheduled events retrieved!", {
      "Assistant ID": assistantId,
      Count: result.count,
    });
    for (const event of scheduledEvents) {
      const eventId = stringValue(event.id) || stringValue(event.event_id) || "(unknown)";
      const status = stringValue(event.status);
      const scheduledAt = stringValue(event.scheduled_at_fixed_datetime);
      console.log(`  • ${eventId}${status ? ` — ${status}` : ""}${scheduledAt ? ` · ${scheduledAt}` : ""}`);
    }
    if (scheduledEvents.length === 0) console.log("  (no scheduled events returned)");
    console.log();
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

/** Cancel a pending event, or remove its record, after explicit confirmation. */
export async function cancelAiAssistantScheduledEventCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const assistantId = requiredStringFlag(flags, "assistant-id", jsonOutput);
  const eventId = requiredStringFlag(flags, "event-id", jsonOutput);
  if (flags.confirm !== true) {
    fail("--confirm is required to cancel an AI assistant scheduled event", jsonOutput);
  }

  try {
    await telnyxCli([
      "ai:assistants:scheduled-events", "delete",
      "--assistant-id", assistantId,
      "--event-id", eventId,
    ]);
    const result: CancelAiAssistantScheduledEventResult = {
      assistant_id: assistantId,
      event_id: eventId,
      canceled: true,
    };
    if (jsonOutput) outputJson(result);
    else {
      printSuccess("AI assistant scheduled event canceled!", {
        "Assistant ID": assistantId,
        "Event ID": eventId,
      });
    }
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

function normalizeScheduledEvent(
  response: unknown,
  assistantId: string,
  fallbackEventId = "",
): AiAssistantScheduledEventResult {
  const scheduledEvent = asRecord(asRecord(response).data ?? response);
  return {
    assistant_id: assistantId,
    event_id: stringValue(scheduledEvent.id) || stringValue(scheduledEvent.event_id) || fallbackEventId,
    scheduled_event: scheduledEvent,
  };
}

function presentScheduledEvent(
  title: string,
  result: AiAssistantScheduledEventResult,
  jsonOutput: boolean,
): void {
  if (jsonOutput) {
    outputJson(result);
    return;
  }
  printSuccess(title, {
    "Assistant ID": result.assistant_id,
    "Event ID": result.event_id || "(not returned)",
    Status: stringValue(result.scheduled_event.status) || "(not returned)",
    "Scheduled at": stringValue(result.scheduled_event.scheduled_at_fixed_datetime) || "(not returned)",
  });
}

function requiredStringFlag(flags: Flags, key: string, jsonOutput: boolean): string {
  const value = optionalStringFlag(flags, key);
  if (!value) fail(`--${key} is required and must be a non-empty string`, jsonOutput);
  return value;
}

function optionalStringFlag(flags: Flags, key: string): string | undefined {
  const value = flags[key];
  return typeof value === "string" ? value : undefined;
}

function addOptionalNonEmptyStringFlag(
  args: string[],
  flags: Flags,
  source: string,
  target: string,
  jsonOutput: boolean,
): void {
  if (flags[source] === undefined) return;
  args.push(target, requiredStringFlag(flags, source, jsonOutput));
}

function addOptionalStringFlag(
  args: string[],
  flags: Flags,
  source: string,
  target: string,
  jsonOutput: boolean,
  allowEmpty = false,
): void {
  if (flags[source] === undefined) return;
  const value = optionalStringFlag(flags, source);
  if (value === undefined || (!allowEmpty && value.length === 0)) {
    fail(`--${source} must be a string${allowEmpty ? "" : " with at least one character"}`, jsonOutput);
  }
  args.push(target, value);
}

function addJsonObjectFlag(
  args: string[],
  flags: Flags,
  source: string,
  target: string,
  jsonOutput: boolean,
): void {
  if (flags[source] === undefined) return;
  const value = optionalStringFlag(flags, source);
  if (value === undefined) fail(`--${source} must be a JSON object`, jsonOutput);
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
  } catch {
    fail(`--${source} must be a JSON object`, jsonOutput);
  }
  args.push(target, value);
}

function validateChannel(flag: string, value: string, jsonOutput: boolean): void {
  if (value !== "phone_call" && value !== "sms_chat") {
    fail(`--${flag} must be one of: phone_call, sms_chat`, jsonOutput);
  }
}

function validateIsoDateTime(flag: string, value: string, jsonOutput: boolean): void {
  const match = /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.exec(value);
  const year = Number(match?.[1]);
  const month = Number(match?.[2]);
  const day = Number(match?.[3]);
  const daysInMonth = match ? new Date(Date.UTC(year, month, 0)).getUTCDate() : 0;
  if (!match || month < 1 || month > 12 || day < 1 || day > daysInMonth || Number.isNaN(Date.parse(value))) {
    fail(`--${flag} must be a valid ISO 8601 date-time`, jsonOutput);
  }
}

function addIsoDateTimeFlag(
  args: string[],
  flags: Flags,
  source: string,
  target: string,
  jsonOutput: boolean,
): void {
  if (flags[source] === undefined) return;
  const value = optionalStringFlag(flags, source);
  if (value === undefined || value.length === 0) {
    fail(`--${source} must be a valid ISO 8601 date-time`, jsonOutput);
  }
  validateIsoDateTime(source, value, jsonOutput);
  args.push(target, value);
}

function addNonNegativeInt64Flag(
  args: string[],
  flags: Flags,
  source: string,
  target: string,
  jsonOutput: boolean,
): void {
  if (flags[source] === undefined) return;
  const value = optionalStringFlag(flags, source);
  if (value === undefined || !/^\d+$/.test(value) || BigInt(value) > 9_223_372_036_854_775_807n) {
    fail(`--${source} must be a non-negative 64-bit integer`, jsonOutput);
  }
  args.push(target, value);
}

function addMaxItemsFlag(args: string[], flags: Flags, jsonOutput: boolean): number | undefined {
  if (flags["max-items"] === undefined) return undefined;
  const value = optionalStringFlag(flags, "max-items");
  if (
    value === undefined
    || !/^(?:-1|\d+)$/.test(value)
    || (value !== "-1" && BigInt(value) > BigInt(Number.MAX_SAFE_INTEGER))
  ) {
    fail("--max-items must be -1 or a non-negative safe integer", jsonOutput);
  }
  args.push("--max-items", value);
  return Number(value);
}

function dataRecords(response: unknown): JsonRecord[] {
  const envelope = asRecord(response);
  const data = Array.isArray(response) ? response : envelope.data;
  if (!Array.isArray(data)) return [];
  return data.filter(
    (item): item is JsonRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item),
  );
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
