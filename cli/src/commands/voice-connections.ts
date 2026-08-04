/**
 * Direct voice-connection discovery actions backed by the generated Go CLI.
 *
 * Numbered voice-connection lists use raw output so the Go CLI returns one
 * parseable `{ data, meta }` envelope rather than a stream of JSON documents.
 * Active calls use the direct client from the first request because pinned CLI
 * v0.21.0 generates unsupported `page[number]` pagination for that cursor
 * endpoint and does not safely encode connection IDs.
 *
 * Aggregated metadata keeps stable API totals/page size from the first
 * contributing page, replaces per-page navigation with `starting_page`, and
 * reports `pages_fetched` plus `returned_results`.
 */

import { TelnyxClient } from "../client.ts";
import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { outputJson, printError, printSuccess } from "../utils/output.ts";

type Flags = Record<string, string | boolean>;
type JsonRecord = Record<string, unknown>;

interface ConnectionListResult {
  count: number;
  connections: JsonRecord[];
  meta: JsonRecord;
}

interface ConnectionRetrieveResult {
  connection_id: string;
  connection: JsonRecord;
}

interface ActiveCallListResult {
  connection_id: string;
  count: number;
  active_calls: JsonRecord[];
  meta: JsonRecord;
}

export async function listVoiceConnectionsCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const args = ["connections", "list"];

  const connectionName = stringFlag(flags, "connection-name");
  if (connectionName !== undefined) {
    // The generated flag is a map of nested matching operations, not a scalar.
    args.push("--filter.connection-name", JSON.stringify({ contains: connectionName }));
  }
  addMappedFlag(args, flags, "fqdn", "--filter.fqdn");
  addMappedFlag(args, flags, "outbound-voice-profile-id", "--filter.outbound-voice-profile-id");
  addPositiveIntegerFlag(args, flags, "page-number", jsonOutput);
  addPositiveIntegerFlag(args, flags, "page-size", jsonOutput);
  addMappedFlag(args, flags, "sort", "--sort");
  const maxItems = parseMaxItemsFlag(flags, jsonOutput);

  try {
    const normalized = await collectListPages(args, maxItems);
    presentConnectionList(normalized, jsonOutput);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function getVoiceConnectionCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const connectionId = requiredStringFlag(flags, "id", "voice connection ID", jsonOutput);

  try {
    const response = await telnyxCli(["connections", "retrieve", "--id", connectionId]);
    const connection = asRecord(asRecord(response).data ?? response);
    const result: ConnectionRetrieveResult = {
      connection_id: stringValue(connection.id) || connectionId,
      connection,
    };

    if (jsonOutput) {
      outputJson(result);
    } else {
      printSuccess("Voice connection retrieved!", {
        "Connection ID": result.connection_id,
        Name: stringValue(connection.connection_name) || "(not returned)",
        Type: stringValue(connection.record_type) || "(not returned)",
        Active: booleanOrFallback(connection.active),
      });
    }
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function listActiveCallsCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const connectionId = requiredStringFlag(flags, "connection-id", "voice connection ID", jsonOutput);
  if (flags["page-number"] !== undefined) {
    fail("--page-number is unsupported for cursor-paginated active calls", jsonOutput);
  }
  const pageSize = parsePositiveIntegerFlag(flags, "page-size", jsonOutput);
  const maxItems = parseMaxItemsFlag(flags, jsonOutput);

  try {
    const normalized = await collectActiveCallPages(connectionId, pageSize, maxItems);
    const result: ActiveCallListResult = {
      connection_id: connectionId,
      count: normalized.count,
      active_calls: normalized.items,
      meta: normalized.meta,
    };
    presentActiveCallList(result, jsonOutput);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

async function collectActiveCallPages(
  connectionId: string,
  pageSize: string | undefined,
  maxItems: number,
): Promise<{ count: number; items: JsonRecord[]; meta: JsonRecord }> {
  if (maxItems === 0) {
    return {
      count: 0,
      items: [],
      meta: aggregateMeta({}, 1, 0, 0),
    };
  }

  const items: JsonRecord[] = [];
  const seenItems = new Set<string>();
  const seenNextPages = new Set<string>();
  const client = new TelnyxClient();
  const path = `/connections/${encodeURIComponent(connectionId)}/active_calls`;
  const initialQuery = pageSize === undefined ? "" : `?${new URLSearchParams({ "page[limit]": pageSize })}`;
  let page = normalizeListPage(await client.get(`${path}${initialQuery}`));
  const stableMeta = page.meta;
  let pagesFetched = 1;

  while (true) {
    let added = 0;
    for (const item of page.items) {
      const identity = itemIdentity(item);
      if (seenItems.has(identity)) continue;
      seenItems.add(identity);
      items.push(item);
      added++;
    }

    if (page.items.length === 0 || added === 0) break;
    if (maxItems >= 0 && items.length >= maxItems) break;

    const nextPage = activeCallNextPage(page.meta, connectionId, pageSize);
    if (nextPage === undefined || seenNextPages.has(nextPage)) break;
    seenNextPages.add(nextPage);

    page = normalizeListPage(await client.get(nextPage));
    pagesFetched++;
  }

  const limited = maxItems >= 0 ? items.slice(0, maxItems) : items;
  return {
    count: limited.length,
    items: limited,
    meta: aggregateCursorMeta(stableMeta, 1, pagesFetched, limited.length),
  };
}

function activeCallNextPage(
  meta: JsonRecord,
  connectionId: string,
  pageSize: string | undefined,
): string | undefined {
  const expectedPath = `/v2/connections/${encodeURIComponent(connectionId)}/active_calls`;
  const next = stringValue(meta.next);
  if (next) {
    const nextUrl = new URL(next, "https://api.telnyx.com");
    if (nextUrl.origin !== "https://api.telnyx.com" || nextUrl.pathname !== expectedPath) {
      throw new Error("active-call pagination returned an unexpected next-page URL");
    }
    return `${nextUrl.pathname.slice(3)}${nextUrl.search}`;
  }

  const after = stringValue(asRecord(meta.cursors).after);
  if (!after) return undefined;
  const query = new URLSearchParams({ "page[after]": after });
  if (pageSize !== undefined) query.set("page[limit]", pageSize);
  return `${expectedPath.slice(3)}?${query.toString()}`;
}

async function collectListPages(
  baseArgs: string[],
  maxItems: number,
): Promise<{ count: number; items: JsonRecord[]; meta: JsonRecord }> {
  const items: JsonRecord[] = [];
  const seenItems = new Set<string>();
  const seenPages = new Set<string>();
  const startingPage = positiveInteger(argumentValue(baseArgs, "--page-number")) ?? 1;
  let stableMeta: JsonRecord = {};
  let hasContributingPage = false;
  let pagesFetched = 0;
  let requestedPage = startingPage;
  let args = [...baseArgs];

  if (maxItems === 0) {
    return {
      count: 0,
      items: [],
      meta: aggregateMeta({}, startingPage, 0, 0),
    };
  }

  while (true) {
    const page = normalizeListPage(await telnyxCli(args, { format: "raw" }));
    pagesFetched++;

    // Keep the first page's authoritative metadata even when it is empty. Once
    // a page contributes items, later termination probes must not replace it.
    if (!hasContributingPage) stableMeta = page.meta;

    if (page.items.length === 0) break;
    const pageSignature = JSON.stringify(page.items);
    if (seenPages.has(pageSignature)) break;
    seenPages.add(pageSignature);

    let added = 0;
    for (const item of page.items) {
      const identity = itemIdentity(item);
      if (seenItems.has(identity)) continue;
      seenItems.add(identity);
      items.push(item);
      added++;
    }
    if (added === 0) break;

    if (!hasContributingPage) {
      stableMeta = page.meta;
      hasContributingPage = true;
    }

    if (maxItems >= 0 && items.length >= maxItems) break;

    const pageSize = positiveInteger(page.meta.page_size)
      ?? positiveInteger(argumentValue(baseArgs, "--page-size"));
    if (pageSize !== undefined && page.items.length < pageSize) break;

    const totalPages = positiveInteger(page.meta.total_pages)
      ?? totalPagesFromResults(page.meta.total_results, pageSize);
    if (totalPages !== undefined && requestedPage >= totalPages) break;

    const nextPage = requestedPage + 1;
    if (!Number.isSafeInteger(nextPage)) break;
    requestedPage = nextPage;
    args = withArgument(baseArgs, "--page-number", String(nextPage));
  }

  const limited = maxItems >= 0 ? items.slice(0, maxItems) : items;
  return {
    count: limited.length,
    items: limited,
    meta: aggregateMeta(stableMeta, startingPage, pagesFetched, limited.length),
  };
}

function aggregateMeta(
  sourceMeta: JsonRecord,
  startingPage: number,
  pagesFetched: number,
  returnedResults: number,
): JsonRecord {
  // `page_number` describes one API page and would be false for this aggregate.
  const { page_number: _pageNumber, ...stableMeta } = sourceMeta;
  return {
    ...stableMeta,
    starting_page: startingPage,
    pages_fetched: pagesFetched,
    returned_results: returnedResults,
  };
}

function aggregateCursorMeta(
  sourceMeta: JsonRecord,
  startingPage: number,
  pagesFetched: number,
  returnedResults: number,
): JsonRecord {
  // Cursor links describe the first API page, not the completed aggregate.
  const { cursors: _cursors, next: _next, ...stableMeta } = sourceMeta;
  return aggregateMeta(stableMeta, startingPage, pagesFetched, returnedResults);
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

function itemIdentity(item: JsonRecord): string {
  for (const key of ["id", "call_control_id"]) {
    const value = item[key];
    if (typeof value === "string" || typeof value === "number") return `${key}:${value}`;
  }
  return `json:${JSON.stringify(item)}`;
}

function presentConnectionList(
  normalized: { count: number; items: JsonRecord[]; meta: JsonRecord },
  jsonOutput: boolean,
): void {
  const result: ConnectionListResult = {
    count: normalized.count,
    connections: normalized.items,
    meta: normalized.meta,
  };
  if (jsonOutput) {
    outputJson(result);
    return;
  }

  printSuccess("Voice connections retrieved!", { Count: result.count });
  for (const connection of result.connections) {
    const id = stringValue(connection.id) || "(unknown)";
    const details = [connection.connection_name, connection.record_type, connection.active]
      .map(stringValue)
      .filter(Boolean)
      .join(" · ");
    console.log(`  • ${id}${details ? ` — ${details}` : ""}`);
  }
  if (result.count === 0) console.log("  (no voice connections returned)");
  console.log();
}

function presentActiveCallList(result: ActiveCallListResult, jsonOutput: boolean): void {
  if (jsonOutput) {
    outputJson(result);
    return;
  }

  printSuccess("Active calls retrieved!", {
    "Connection ID": result.connection_id,
    Count: result.count,
  });
  for (const call of result.active_calls) {
    const id = stringValue(call.call_control_id) || "(unknown)";
    const details = [
      call.call_leg_id,
      call.call_duration === undefined ? undefined : `${stringValue(call.call_duration)}s`,
    ]
      .map(stringValue)
      .filter(Boolean)
      .join(" · ");
    console.log(`  • ${id}${details ? ` — ${details}` : ""}`);
  }
  if (result.count === 0) console.log("  (no active calls returned)");
  console.log();
}

function addMappedFlag(args: string[], flags: Flags, source: string, target: string): void {
  const value = stringFlag(flags, source);
  if (value !== undefined) args.push(target, value);
}

function addPositiveIntegerFlag(
  args: string[],
  flags: Flags,
  source: "page-number" | "page-size",
  jsonOutput: boolean,
): void {
  const value = parsePositiveIntegerFlag(flags, source, jsonOutput);
  if (value !== undefined) args.push(`--${source}`, value);
}

function parsePositiveIntegerFlag(
  flags: Flags,
  source: "page-number" | "page-size",
  jsonOutput: boolean,
): string | undefined {
  const rawValue = flags[source];
  if (rawValue !== undefined && typeof rawValue !== "string") {
    fail(`--${source} must be a positive safe integer`, jsonOutput);
  }
  const value = stringFlag(flags, source);
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(parsed) || parsed < 1) {
    fail(`--${source} must be a positive safe integer`, jsonOutput);
  }
  return value;
}

function parseMaxItemsFlag(flags: Flags, jsonOutput: boolean): number {
  const rawValue = flags["max-items"];
  if (rawValue !== undefined && typeof rawValue !== "string") {
    fail("--max-items must be -1 or a non-negative safe integer", jsonOutput);
  }
  const value = stringFlag(flags, "max-items");
  if (value === undefined) return -1;
  const parsed = Number(value);
  if (!/^(?:-1|\d+)$/.test(value) || !Number.isSafeInteger(parsed)) {
    fail("--max-items must be -1 or a non-negative safe integer", jsonOutput);
  }
  return parsed;
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

function booleanOrFallback(value: unknown): string | boolean {
  return typeof value === "boolean" ? value : "(not returned)";
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
