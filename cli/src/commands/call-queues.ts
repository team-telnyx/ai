/**
 * Call-queue provisioning and queued-call inspection actions backed by the
 * Stainless-generated Telnyx Go CLI.
 *
 * List requests use raw output so callers receive one stable JSON envelope
 * instead of the generated CLI's concatenated iterator documents.
 */

import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { outputJson, printError, printSuccess } from "../utils/output.ts";

type Flags = Record<string, string | boolean>;
type JsonRecord = Record<string, unknown>;

interface CallQueueResult {
  queue_name: string;
  call_queue: JsonRecord;
}

interface CallQueueListResult {
  count: number;
  call_queues: JsonRecord[];
  meta: JsonRecord;
}

interface QueuedCallResult {
  queue_name: string;
  call_control_id: string;
  queued_call: JsonRecord;
}

interface QueuedCallListResult {
  queue_name: string;
  count: number;
  queued_calls: JsonRecord[];
  meta: JsonRecord;
}

export async function createCallQueueCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const queueName = requiredStringFlag(flags, "queue-name", "call queue name", jsonOutput);
  const args = ["queues", "create", "--queue-name", queueName];
  addPositiveIntegerFlag(args, flags, "max-size", jsonOutput);

  try {
    const result = normalizeQueue(await telnyxCli(args), queueName);
    presentQueue("Call queue created!", result, jsonOutput);
  } catch (error) {
    fail(errorMessage(error), jsonOutput);
  }
}

export async function listCallQueuesCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const args = ["queues", "list"];
  addPositiveIntegerFlag(args, flags, "page-number", jsonOutput);
  addPositiveIntegerFlag(args, flags, "page-size", jsonOutput);
  const maxItems = maxItemsFlag(flags, jsonOutput);

  try {
    const response = await telnyxCli(args, { format: "raw" });
    const page = normalizeListPage(response, maxItems);
    const result: CallQueueListResult = {
      count: page.items.length,
      call_queues: page.items,
      meta: page.meta,
    };
    presentQueueList(result, jsonOutput);
  } catch (error) {
    fail(errorMessage(error), jsonOutput);
  }
}

export async function getCallQueueCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const queueName = requiredStringFlag(flags, "queue-name", "call queue name", jsonOutput);

  try {
    const result = normalizeQueue(await telnyxCli([
      "queues", "retrieve", "--queue-name", queueName,
    ]), queueName);
    presentQueue("Call queue retrieved!", result, jsonOutput);
  } catch (error) {
    fail(errorMessage(error), jsonOutput);
  }
}

export async function listQueuedCallsCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const queueName = requiredStringFlag(flags, "queue-name", "call queue name", jsonOutput);
  const args = ["queues:calls", "list", "--queue-name", queueName];
  addPositiveIntegerFlag(args, flags, "page-number", jsonOutput);
  addPositiveIntegerFlag(args, flags, "page-size", jsonOutput);
  const maxItems = maxItemsFlag(flags, jsonOutput);

  try {
    const response = await telnyxCli(args, { format: "raw" });
    const page = normalizeListPage(response, maxItems);
    const result: QueuedCallListResult = {
      queue_name: queueName,
      count: page.items.length,
      queued_calls: page.items,
      meta: page.meta,
    };
    presentQueuedCallList(result, jsonOutput);
  } catch (error) {
    fail(errorMessage(error), jsonOutput);
  }
}

export async function getQueuedCallCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const queueName = requiredStringFlag(flags, "queue-name", "call queue name", jsonOutput);
  const callControlId = requiredStringFlag(flags, "call-control-id", "queued call control ID", jsonOutput);

  try {
    const response = await telnyxCli([
      "queues:calls", "retrieve",
      "--queue-name", queueName,
      "--call-control-id", callControlId,
    ]);
    const queuedCall = responseData(response);
    const result: QueuedCallResult = {
      queue_name: queueName,
      call_control_id: stringValue(queuedCall.call_control_id) || callControlId,
      queued_call: queuedCall,
    };
    presentQueuedCall("Queued call retrieved!", result, jsonOutput);
  } catch (error) {
    fail(errorMessage(error), jsonOutput);
  }
}

export async function removeQueuedCallCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const queueName = requiredStringFlag(flags, "queue-name", "call queue name", jsonOutput);
  const callControlId = requiredStringFlag(flags, "call-control-id", "queued call control ID", jsonOutput);
  if (flags.confirm !== true) {
    fail("--confirm is required to remove a queued call", jsonOutput);
  }

  try {
    await telnyxCli([
      "queues:calls", "remove",
      "--queue-name", queueName,
      "--call-control-id", callControlId,
    ]);
    const result = { queue_name: queueName, call_control_id: callControlId, removed: true };
    if (jsonOutput) {
      outputJson(result);
    } else {
      printSuccess("Queued call removed!", {
        "Queue Name": queueName,
        "Call Control ID": callControlId,
        Removed: true,
      });
    }
  } catch (error) {
    fail(errorMessage(error), jsonOutput);
  }
}

function normalizeQueue(response: unknown, fallbackName: string): CallQueueResult {
  const queue = responseData(response);
  return {
    queue_name: stringValue(queue.queue_name) || fallbackName,
    call_queue: queue,
  };
}

function normalizeListPage(response: unknown, maxItems: number): { items: JsonRecord[]; meta: JsonRecord } {
  const envelope = asRecord(response);
  const allItems = Array.isArray(envelope.data)
    ? envelope.data.filter(
        (item): item is JsonRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item),
      )
    : [];
  return {
    items: maxItems < 0 ? allItems : allItems.slice(0, maxItems),
    meta: asRecord(envelope.meta),
  };
}

function responseData(response: unknown): JsonRecord {
  const envelope = asRecord(response);
  return asRecord(envelope.data ?? response);
}

function presentQueue(message: string, result: CallQueueResult, jsonOutput: boolean): void {
  if (jsonOutput) {
    outputJson(result);
    return;
  }
  printSuccess(message, {
    "Queue Name": result.queue_name,
    "Maximum Size": valueOrFallback(result.call_queue.max_size),
    "Current Size": valueOrFallback(result.call_queue.current_size),
  });
}

function presentQueueList(result: CallQueueListResult, jsonOutput: boolean): void {
  if (jsonOutput) {
    outputJson(result);
    return;
  }
  printSuccess("Call queues retrieved!", { Count: result.count });
  for (const queue of result.call_queues) {
    const name = stringValue(queue.queue_name) || "(unnamed)";
    const details = [queue.current_size, queue.max_size]
      .map((value) => value === undefined ? "" : String(value))
      .filter(Boolean)
      .join(" / ");
    console.log(`  • ${name}${details ? ` — ${details} calls (current / max)` : ""}`);
  }
  if (result.count === 0) console.log("  (no call queues returned)");
  console.log();
}

function presentQueuedCall(message: string, result: QueuedCallResult, jsonOutput: boolean): void {
  if (jsonOutput) {
    outputJson(result);
    return;
  }
  printSuccess(message, {
    "Queue Name": result.queue_name,
    "Call Control ID": result.call_control_id,
    "Call Leg ID": stringValue(result.queued_call.call_leg_id) || "(not returned)",
    "Enqueued At": stringValue(result.queued_call.enqueue_time) || "(not returned)",
  });
}

function presentQueuedCallList(result: QueuedCallListResult, jsonOutput: boolean): void {
  if (jsonOutput) {
    outputJson(result);
    return;
  }
  printSuccess("Queued calls retrieved!", { "Queue Name": result.queue_name, Count: result.count });
  for (const call of result.queued_calls) {
    const id = stringValue(call.call_control_id) || "(unknown)";
    const details = [call.call_leg_id, call.enqueue_time].map(stringValue).filter(Boolean).join(" · ");
    console.log(`  • ${id}${details ? ` — ${details}` : ""}`);
  }
  if (result.count === 0) console.log("  (no queued calls returned)");
  console.log();
}

function addPositiveIntegerFlag(
  args: string[],
  flags: Flags,
  key: "max-size" | "page-number" | "page-size",
  jsonOutput: boolean,
): void {
  const raw = flags[key];
  if (raw === undefined) return;
  if (typeof raw !== "string" || !/^\d+$/.test(raw)) {
    fail(`--${key} must be a positive safe integer`, jsonOutput);
  }
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    fail(`--${key} must be a positive safe integer`, jsonOutput);
  }
  args.push(`--${key}`, raw);
}

function maxItemsFlag(flags: Flags, jsonOutput: boolean): number {
  const raw = flags["max-items"];
  if (raw === undefined) return -1;
  if (typeof raw !== "string" || !/^(?:-1|\d+)$/.test(raw)) {
    fail("--max-items must be -1 or a non-negative safe integer", jsonOutput);
  }
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed)) {
    fail("--max-items must be -1 or a non-negative safe integer", jsonOutput);
  }
  return parsed;
}

function requiredStringFlag(flags: Flags, key: string, label: string, jsonOutput: boolean): string {
  const value = flags[key];
  if (typeof value !== "string" || value.length === 0) {
    fail(`--${key} is required (${label})`, jsonOutput);
  }
  return value;
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function stringValue(value: unknown): string {
  return value === undefined || value === null ? "" : String(value);
}

function valueOrFallback(value: unknown): string | number {
  return typeof value === "string" || typeof value === "number" ? value : "(not returned)";
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
