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
const MAX_SCHEDULED_EVENT_PAGE_REQUESTS = 1_000;

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

export interface DeleteAiAssistantScheduledEventResult {
  assistant_id: string;
  event_id: string;
  deleted: true;
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
  validateFutureDateTime("scheduled-at-fixed-datetime", scheduledAt, jsonOutput);
  validateChannel("telnyx-conversation-channel", channel, jsonOutput);
  if (channel === "sms_chat") requiredStringFlag(flags, "text", jsonOutput);
  validateChannelSpecificCreateFlags(channel, flags, jsonOutput);

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
  const maxRetries = parseNonNegativeInt64Flag(flags, "max-retries-client-errors", jsonOutput);
  const retryInterval = parseNonNegativeInt64Flag(flags, "retry-interval-secs", jsonOutput);
  validateRetryPolicy(channel, maxRetries, retryInterval, jsonOutput);
  if (maxRetries !== undefined) args.push("--max-retries-client-errors", maxRetries);
  if (retryInterval !== undefined) args.push("--retry-interval-secs", retryInterval);
  addOptionalStringFlag(args, flags, "text", "--text", jsonOutput, true);
  addIdempotencyKeyFlag(args, flags, jsonOutput);

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
  addBoundedInt64Flag(args, flags, "page-number", "--page-number", 1n, BigInt(Number.MAX_SAFE_INTEGER), jsonOutput);
  addBoundedInt64Flag(args, flags, "page-size", "--page-size", 1n, 100n, jsonOutput);
  addIsoDateTimeFlag(args, flags, "to-date", "--to-date", jsonOutput);
  const maxItems = parseMaxItemsFlag(flags, jsonOutput);

  try {
    const page = await collectScheduledEventPages(args, maxItems ?? -1);
    const scheduledEvents = page.items;
    const result: AiAssistantScheduledEventListResult = {
      assistant_id: assistantId,
      count: scheduledEvents.length,
      scheduled_events: scheduledEvents,
      meta: page.meta,
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
      const eventId = scheduledEventId(event) || "(unknown)";
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
    fail("--confirm is required to delete/cancel an AI assistant scheduled event", jsonOutput);
  }

  try {
    await telnyxCli([
      "ai:assistants:scheduled-events", "delete",
      "--assistant-id", assistantId,
      "--event-id", eventId,
    ]);
    const result: DeleteAiAssistantScheduledEventResult = {
      assistant_id: assistantId,
      event_id: eventId,
      deleted: true,
    };
    if (jsonOutput) outputJson(result);
    else {
      printSuccess("AI assistant scheduled event deleted!", {
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
    event_id: scheduledEventId(scheduledEvent) || fallbackEventId,
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

function addIdempotencyKeyFlag(args: string[], flags: Flags, jsonOutput: boolean): void {
  if (flags["idempotency-key"] === undefined) return;
  const value = optionalStringFlag(flags, "idempotency-key");
  if (value === undefined || !/^[A-Za-z0-9_-]{1,255}$/.test(value)) {
    fail("--idempotency-key must contain 1-255 letters, numbers, hyphens, or underscores", jsonOutput);
  }
  args.push("--idempotency-key", value);
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

function validateFutureDateTime(flag: string, value: string, jsonOutput: boolean): void {
  if (Date.parse(value) <= Date.now()) {
    fail(`--${flag} must be in the future`, jsonOutput);
  }
}

function validateChannelSpecificCreateFlags(
  channel: string,
  flags: Flags,
  jsonOutput: boolean,
): void {
  if (
    channel === "sms_chat"
    && (flags["call-settings"] !== undefined || flags["call-settings.sip-region"] !== undefined)
  ) {
    fail("call settings are only supported for phone_call scheduled events", jsonOutput);
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

function addBoundedInt64Flag(
  args: string[],
  flags: Flags,
  source: string,
  target: string,
  minimum: bigint,
  maximum: bigint,
  jsonOutput: boolean,
): void {
  if (flags[source] === undefined) return;
  const value = optionalStringFlag(flags, source);
  if (value === undefined || !/^\d+$/.test(value)) {
    fail(`--${source} must be an integer between ${minimum} and ${maximum}`, jsonOutput);
  }
  const parsed = BigInt(value);
  if (parsed < minimum || parsed > maximum) {
    fail(`--${source} must be an integer between ${minimum} and ${maximum}`, jsonOutput);
  }
  args.push(target, value);
}

function parseNonNegativeInt64Flag(
  flags: Flags,
  source: string,
  jsonOutput: boolean,
): string | undefined {
  if (flags[source] === undefined) return undefined;
  const value = optionalStringFlag(flags, source);
  if (value === undefined || !/^\d+$/.test(value) || BigInt(value) > 9_223_372_036_854_775_807n) {
    fail(`--${source} must be a non-negative 64-bit integer`, jsonOutput);
  }
  return value;
}

function validateRetryPolicy(
  channel: string,
  maxRetriesValue: string | undefined,
  retryIntervalValue: string | undefined,
  jsonOutput: boolean,
): void {
  const maxRetries = maxRetriesValue === undefined ? undefined : BigInt(maxRetriesValue);
  const retryInterval = retryIntervalValue === undefined ? undefined : BigInt(retryIntervalValue);

  if (channel === "sms_chat") {
    if (maxRetriesValue !== undefined || retryIntervalValue !== undefined) {
      fail("retry flags are only supported for phone_call scheduled events", jsonOutput);
    }
    return;
  }

  if (maxRetries !== undefined && maxRetries > 10n) {
    fail("--max-retries-client-errors must be between 0 and 10", jsonOutput);
  }
  if (maxRetries !== undefined && maxRetries > 0n) {
    if (retryInterval === undefined) {
      fail("--retry-interval-secs is required when --max-retries-client-errors is greater than 0", jsonOutput);
    }
    if (retryInterval < 60n || retryInterval > 86_400n) {
      fail("--retry-interval-secs must be between 60 and 86400", jsonOutput);
    }
    return;
  }
  if (retryIntervalValue !== undefined) {
    fail("--retry-interval-secs requires --max-retries-client-errors greater than 0", jsonOutput);
  }
}

function parseMaxItemsFlag(flags: Flags, jsonOutput: boolean): number | undefined {
  if (flags["max-items"] === undefined) return undefined;
  const value = optionalStringFlag(flags, "max-items");
  if (
    value === undefined
    || !/^(?:-1|\d+)$/.test(value)
    || (value !== "-1" && BigInt(value) > BigInt(Number.MAX_SAFE_INTEGER))
  ) {
    fail("--max-items must be -1 or a non-negative safe integer", jsonOutput);
  }
  return Number(value);
}

async function collectScheduledEventPages(
  baseArgs: string[],
  maxItems: number,
): Promise<{ items: JsonRecord[]; meta: JsonRecord }> {
  const items: JsonRecord[] = [];
  const seenIds = new Set<string>();
  const seenPages = new Set<string>();
  const explicitStartingPage = nonNegativeInteger(argumentValue(baseArgs, "--page-number"));
  let startingPage = explicitStartingPage;
  let requestedPage = explicitStartingPage;
  let zeroBased = explicitStartingPage === 0;
  let pagesFetched = 0;
  let stableMeta: JsonRecord = {};
  let knownLastPage: number | undefined;
  let args = [...baseArgs];

  if (maxItems === 0) {
    return { items: [], meta: aggregateListMeta({}, startingPage ?? 1, 0, 0) };
  }

  while (true) {
    if (pagesFetched >= MAX_SCHEDULED_EVENT_PAGE_REQUESTS && knownLastPage === undefined) {
      throw new Error(`scheduled-event pagination exceeded ${MAX_SCHEDULED_EVENT_PAGE_REQUESTS} page requests without a declared end`);
    }
    const response = await telnyxCli(args, { format: "raw" });
    const envelope = asRecord(response);
    const pageItems = dataRecords(response);
    const meta = asRecord(envelope.meta);
    pagesFetched++;
    if (pagesFetched === 1) stableMeta = meta;
    if (pageItems.length === 0) break;

    const authoritativePage = nonNegativeInteger(meta.page_number);
    if (startingPage === undefined) startingPage = authoritativePage ?? 1;
    if (explicitStartingPage === undefined && authoritativePage !== undefined) {
      zeroBased = authoritativePage === 0;
    }
    const signature = JSON.stringify([
      authoritativePage === undefined ? "content" : `page:${authoritativePage}`,
      pageItems,
    ]);
    if (seenPages.has(signature)) break;
    seenPages.add(signature);

    for (const item of pageItems) {
      const id = scheduledEventId(item);
      if (id) {
        const identity = id;
        if (seenIds.has(identity)) continue;
        seenIds.add(identity);
      }
      items.push(item);
    }
    if (maxItems !== -1 && items.length >= maxItems) break;

    const pageSize = positiveInteger(meta.page_size)
      ?? positiveInteger(argumentValue(baseArgs, "--page-size"));
    if (pageSize !== undefined && pageItems.length < pageSize) break;

    const responsePage = authoritativePage ?? requestedPage ?? startingPage;
    const totalPages = positiveInteger(meta.total_pages)
      ?? totalPagesFromResults(meta.total_results, pageSize);
    if (totalPages !== undefined) knownLastPage = zeroBased ? totalPages - 1 : totalPages;
    if (totalPages !== undefined && (zeroBased ? responsePage + 1 >= totalPages : responsePage >= totalPages)) break;
    if (requestedPage !== undefined && responsePage < requestedPage) break;
    const nextPage = responsePage + 1;
    if (!Number.isSafeInteger(nextPage)) break;

    requestedPage = nextPage;
    args = withArgument(baseArgs, "--page-number", String(requestedPage));
  }

  const limited = maxItems === -1 ? items : items.slice(0, maxItems);
  return {
    items: limited,
    meta: aggregateListMeta(stableMeta, startingPage ?? 1, pagesFetched, limited.length),
  };
}

function aggregateListMeta(
  sourceMeta: JsonRecord,
  startingPage: number,
  pagesFetched: number,
  returnedResults: number,
): JsonRecord {
  const { page_number: _pageNumber, ...stableMeta } = sourceMeta;
  return { ...stableMeta, starting_page: startingPage, pages_fetched: pagesFetched, returned_results: returnedResults };
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

function nonNegativeInteger(value: unknown): number | undefined {
  const number = typeof value === "number"
    ? value
    : typeof value === "string" && /^\d+$/.test(value)
      ? Number(value)
      : Number.NaN;
  return Number.isSafeInteger(number) && number >= 0 ? number : undefined;
}

function positiveInteger(value: unknown): number | undefined {
  const number = nonNegativeInteger(value);
  return number !== undefined && number > 0 ? number : undefined;
}

function totalPagesFromResults(totalResults: unknown, pageSize: number | undefined): number | undefined {
  if (pageSize === undefined) return undefined;
  const total = nonNegativeInteger(totalResults);
  return total === undefined ? undefined : Math.ceil(total / pageSize);
}

function scheduledEventId(event: JsonRecord): string {
  return stringValue(event.scheduled_event_id)
    || stringValue(event.id)
    || stringValue(event.event_id);
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
