/**
 * Port-Out order lifecycle actions backed by the generated Telnyx Go CLI.
 *
 * The generated CLI uses `portouts` for orders and `portouts:comments` for
 * comments. List output is requested as a raw envelope so it remains one
 * parseable JSON value.
 */

import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { failWith, outputJson, printError, printSuccess } from "../utils/output.ts";

type Flags = Record<string, string | boolean>;
type JsonRecord = Record<string, unknown>;

const PORTOUT_STATUSES = ["authorized", "rejected-pending"] as const;

export async function listPortoutOrdersCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const args = ["portouts", "list"];

  const filter = optionalString(flags, "filter", jsonOutput);
  const filterFlags = [
    "carrier-name", "country-code", "country-code-in", "foc-date", "inserted-at",
    "phone-number", "pon", "ported-out-at", "spid", "status", "status-in", "support-key",
  ];
  if (filter !== undefined && filterFlags.some((name) => flags[name] !== undefined)) {
    failWith("--filter cannot be combined with individual Port-Out filter flags", jsonOutput);
  }
  if (filter !== undefined) {
    args.push("--filter", normalizedJsonObject(filter, "filter", jsonOutput));
  } else {
    addMappedFlag(args, flags, "carrier-name", "--filter.carrier-name", jsonOutput);
    addMappedFlag(args, flags, "country-code", "--filter.country-code", jsonOutput);
    addStringArrayFlag(args, flags, "country-code-in", "--filter.country-code-in", jsonOutput);

    const focDate = optionalString(flags, "foc-date", jsonOutput);
    if (focDate !== undefined) {
      validateDate("foc-date", focDate, jsonOutput);
      args.push("--filter.foc-date", focDate);
    }
    addJsonObjectFlag(args, flags, "inserted-at", "--filter.inserted-at", jsonOutput);
    addMappedFlag(args, flags, "phone-number", "--filter.phone-number", jsonOutput);
    addMappedFlag(args, flags, "pon", "--filter.pon", jsonOutput);
    addJsonObjectFlag(args, flags, "ported-out-at", "--filter.ported-out-at", jsonOutput);
    addMappedFlag(args, flags, "spid", "--filter.spid", jsonOutput);
    addMappedFlag(args, flags, "status", "--filter.status", jsonOutput);
    addStringArrayFlag(args, flags, "status-in", "--filter.status-in", jsonOutput);
    addMappedFlag(args, flags, "support-key", "--filter.support-key", jsonOutput);
  }

  addPositiveIntegerFlag(args, flags, "page-number", jsonOutput);
  addPositiveIntegerFlag(args, flags, "page-size", jsonOutput);
  const maxItems = addMaxItemsFlag(args, flags, jsonOutput);

  try {
    const response = await telnyxCli(args, { format: "raw" });
    const envelope = asRecord(response);
    const returnedOrders = dataRecords(response);
    // Raw format preserves the response envelope but bypasses the generated
    // CLI iterator's max-items truncation, so apply the same bound locally.
    const orders = maxItems >= 0 ? returnedOrders.slice(0, maxItems) : returnedOrders;
    const result = {
      count: orders.length,
      portout_orders: orders,
      meta: asRecord(envelope.meta),
    };
    if (jsonOutput) {
      outputJson(result);
    } else {
      printSuccess("Port-Out orders retrieved!", { Count: result.count });
      printRows(orders, ["status", "carrier_name", "support_key"]);
    }
  } catch (err) {
    fail(errorMessage(err), jsonOutput);
  }
}

export async function getPortoutOrderCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const id = requiredString(flags, "id", "Port-Out order ID", jsonOutput);

  try {
    const response = await telnyxCli(["portouts", "retrieve", "--id", id]);
    const order = responseDataRecord(response);
    const result = {
      portout_order_id: stringValue(order.id) || id,
      portout_order: order,
    };
    if (jsonOutput) {
      outputJson(result);
    } else {
      printSuccess("Port-Out order retrieved!", {
        "Port-Out Order ID": result.portout_order_id,
        Status: stringValue(order.status) || "(not returned)",
        "Support Key": stringValue(order.support_key) || "(not returned)",
      });
    }
  } catch (err) {
    fail(errorMessage(err), jsonOutput);
  }
}

export async function listPortoutRejectionCodesCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const portoutId = requiredString(flags, "portout-id", "Port-Out order ID", jsonOutput);
  const args = ["portouts", "list-rejection-codes", "--portout-id", portoutId];

  const filter = optionalString(flags, "filter", jsonOutput);
  const code = optionalString(flags, "code", jsonOutput);
  if (filter !== undefined && code !== undefined) {
    failWith("--filter cannot be combined with --code", jsonOutput);
  }
  if (filter !== undefined) args.push("--filter", normalizedJsonObject(filter, "filter", jsonOutput));
  if (code !== undefined) args.push("--filter.code", code);

  try {
    const response = await telnyxCli(args);
    const rejectionCodes = dataRecords(response);
    const result = {
      portout_id: portoutId,
      count: rejectionCodes.length,
      rejection_codes: rejectionCodes,
    };
    if (jsonOutput) {
      outputJson(result);
    } else {
      printSuccess("Port-Out rejection codes retrieved!", {
        "Port-Out Order ID": portoutId,
        Count: result.count,
      });
      printRows(rejectionCodes, ["code", "description"]);
    }
  } catch (err) {
    fail(errorMessage(err), jsonOutput);
  }
}

export async function updatePortoutStatusCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const id = requiredString(flags, "id", "Port-Out order ID", jsonOutput);
  const status = requiredString(flags, "status", PORTOUT_STATUSES.join(" or "), jsonOutput);
  if (!PORTOUT_STATUSES.includes(status as (typeof PORTOUT_STATUSES)[number])) {
    failWith(`--status must be one of: ${PORTOUT_STATUSES.join(", ")}`, jsonOutput);
  }
  const reason = requiredString(flags, "reason", "authorization or rejection reason", jsonOutput);
  if (flags.confirm !== true) {
    failWith("updating a Port-Out order status authorizes or rejects the request; pass a bare --confirm to continue", jsonOutput);
  }

  const args = [
    "portouts", "update-status",
    "--id", id,
    "--status", status,
    "--reason", reason,
  ];
  const hostMessaging = optionalBoolean(flags, "host-messaging", jsonOutput);
  if (hostMessaging !== undefined) args.push(`--host-messaging=${String(hostMessaging)}`);

  try {
    const response = await telnyxCli(args);
    const order = responseDataRecord(response);
    const result = {
      portout_order_id: stringValue(order.id) || id,
      status: stringValue(order.status) || status,
      portout_order: order,
    };
    if (jsonOutput) {
      outputJson(result);
    } else {
      printSuccess("Port-Out order status updated!", {
        "Port-Out Order ID": result.portout_order_id,
        Status: result.status,
      });
    }
  } catch (err) {
    fail(errorMessage(err), jsonOutput);
  }
}

export async function createPortoutCommentCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const id = requiredString(flags, "id", "Port-Out order ID", jsonOutput);
  const body = requiredString(flags, "body", "comment text", jsonOutput);

  try {
    const response = await telnyxCli(["portouts:comments", "create", "--id", id, "--body", body]);
    const comment = responseDataRecord(response);
    const result = {
      portout_order_id: id,
      comment,
    };
    if (jsonOutput) {
      outputJson(result);
    } else {
      printSuccess("Port-Out comment created!", {
        "Port-Out Order ID": id,
        "Comment ID": stringValue(comment.id) || "(not returned)",
      });
    }
  } catch (err) {
    fail(errorMessage(err), jsonOutput);
  }
}

export async function listPortoutCommentsCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const id = requiredString(flags, "id", "Port-Out order ID", jsonOutput);

  try {
    const response = await telnyxCli(["portouts:comments", "list", "--id", id]);
    const comments = dataRecords(response);
    const result = {
      portout_order_id: id,
      count: comments.length,
      comments,
    };
    if (jsonOutput) {
      outputJson(result);
    } else {
      printSuccess("Port-Out comments retrieved!", {
        "Port-Out Order ID": id,
        Count: result.count,
      });
      printRows(comments, ["body", "user_id", "created_at"]);
    }
  } catch (err) {
    fail(errorMessage(err), jsonOutput);
  }
}

function addMappedFlag(
  args: string[],
  flags: Flags,
  source: string,
  target: string,
  jsonOutput: boolean,
): void {
  const value = optionalString(flags, source, jsonOutput);
  if (value !== undefined) args.push(target, value);
}

function addJsonObjectFlag(
  args: string[],
  flags: Flags,
  source: string,
  target: string,
  jsonOutput: boolean,
): void {
  const value = optionalString(flags, source, jsonOutput);
  if (value !== undefined) args.push(target, normalizedJsonObject(value, source, jsonOutput));
}

function normalizedJsonObject(value: string, name: string, jsonOutput: boolean): string {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    return JSON.stringify(parsed);
  } catch {
    failWith(`--${name} must be a JSON object`, jsonOutput);
  }
}

function addStringArrayFlag(
  args: string[],
  flags: Flags,
  source: string,
  target: string,
  jsonOutput: boolean,
): void {
  const value = optionalString(flags, source, jsonOutput);
  if (value === undefined) return;
  let values: unknown;
  try {
    values = value.trimStart().startsWith("[")
      ? JSON.parse(value)
      : value.split(",").map((item) => item.trim()).filter(Boolean);
  } catch {
    failWith(`--${source} must be a comma-separated list or JSON string array`, jsonOutput);
  }
  if (!Array.isArray(values) || values.length === 0 || values.some((item) => typeof item !== "string" || item.trim() === "")) {
    failWith(`--${source} must be a non-empty comma-separated list or JSON string array`, jsonOutput);
  }
  args.push(target, JSON.stringify(values));
}

function addPositiveIntegerFlag(args: string[], flags: Flags, name: string, jsonOutput: boolean): void {
  const value = optionalString(flags, name, jsonOutput);
  if (value === undefined) return;
  const parsed = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(parsed) || parsed < 1) {
    failWith(`--${name} must be a positive safe integer`, jsonOutput);
  }
  args.push(`--${name}`, value);
}

function addMaxItemsFlag(args: string[], flags: Flags, jsonOutput: boolean): number {
  const value = optionalString(flags, "max-items", jsonOutput);
  if (value === undefined) return -1;
  const parsed = Number(value);
  if (!/^(?:-1|\d+)$/.test(value) || !Number.isSafeInteger(parsed)) {
    failWith("--max-items must be -1 or a non-negative safe integer", jsonOutput);
  }
  args.push("--max-items", value);
  return parsed;
}

function validateDate(name: string, value: string, jsonOutput: boolean): void {
  if (!/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value) || Number.isNaN(Date.parse(value))) {
    failWith(`--${name} must be a valid ISO 8601 date or date-time`, jsonOutput);
  }
}

function requiredString(flags: Flags, name: string, label: string, jsonOutput: boolean): string {
  const value = optionalString(flags, name, jsonOutput);
  if (value === undefined) failWith(`--${name} is required (${label})`, jsonOutput);
  return value;
}

function optionalString(flags: Flags, name: string, jsonOutput: boolean): string | undefined {
  const value = flags[name];
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.trim() === "") {
    failWith(`--${name} requires a non-empty value`, jsonOutput);
  }
  return value.trim();
}

function optionalBoolean(flags: Flags, name: string, jsonOutput: boolean): boolean | undefined {
  const value = flags[name];
  if (value === undefined) return undefined;
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  failWith(`--${name} must be true or false`, jsonOutput);
}

function dataRecords(response: unknown): JsonRecord[] {
  const data = asRecord(response).data;
  if (Array.isArray(data)) {
    return data.filter(
      (item): item is JsonRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item),
    );
  }
  const record = asRecord(data);
  return Object.keys(record).length > 0 ? [record] : [];
}

function responseDataRecord(response: unknown): JsonRecord {
  const envelope = asRecord(response);
  return asRecord(envelope.data ?? response);
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function stringValue(value: unknown): string {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return stringValue((value as JsonRecord).value);
  }
  return value === undefined || value === null ? "" : String(value);
}

function printRows(rows: JsonRecord[], detailKeys: string[]): void {
  for (const row of rows) {
    const id = stringValue(row.id) || stringValue(row.code) || "(unknown)";
    const detail = detailKeys.map((key) => stringValue(row[key])).filter(Boolean).join(" · ");
    console.log(`  • ${id}${detail ? ` — ${detail}` : ""}`);
  }
  if (rows.length === 0) console.log("  (none returned)");
  console.log();
}

function fail(message: string, jsonOutput: boolean): never {
  if (jsonOutput) outputJson({ error: message });
  else printError(message);
  process.exit(1);
}

function errorMessage(err: unknown): string {
  if (err instanceof TelnyxCLIError) return err.stderr || err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}
