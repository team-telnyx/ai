/**
 * Direct voice-connection discovery actions backed by the generated Go CLI.
 *
 * List requests use raw output so the Go CLI returns one parseable
 * `{ data, meta }` envelope rather than a stream of JSON documents.
 */

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
  const maxItems = addMaxItemsFlag(args, flags, jsonOutput);

  try {
    const response = await telnyxCli(args, { format: "raw" });
    const normalized = normalizeList(response, maxItems);
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
  const args = ["connections", "list-active-calls", "--connection-id", connectionId];

  addPositiveIntegerFlag(args, flags, "page-number", jsonOutput);
  addPositiveIntegerFlag(args, flags, "page-size", jsonOutput);
  const maxItems = addMaxItemsFlag(args, flags, jsonOutput);

  try {
    const response = await telnyxCli(args, { format: "raw" });
    const normalized = normalizeList(response, maxItems);
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

function normalizeList(
  response: unknown,
  maxItems: number | undefined,
): { count: number; items: JsonRecord[]; meta: JsonRecord } {
  const envelope = asRecord(response);
  const items = Array.isArray(envelope.data)
    ? envelope.data.filter(
        (item): item is JsonRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item),
      )
    : [];
  const limited = maxItems !== undefined && maxItems >= 0 ? items.slice(0, maxItems) : items;
  return { count: limited.length, items: limited, meta: asRecord(envelope.meta) };
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
  const value = stringFlag(flags, source);
  if (value === undefined) return;
  if (!/^\d+$/.test(value) || Number(value) < 1) {
    fail(`--${source} must be a positive integer`, jsonOutput);
  }
  args.push(`--${source}`, value);
}

function addMaxItemsFlag(args: string[], flags: Flags, jsonOutput: boolean): number | undefined {
  const value = stringFlag(flags, "max-items");
  if (value === undefined) return undefined;
  if (!/^(?:-1|\d+)$/.test(value)) {
    fail("--max-items must be -1 or a non-negative integer", jsonOutput);
  }
  args.push("--max-items", value);
  return Number(value);
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
