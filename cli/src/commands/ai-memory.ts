/**
 * Persistent AI memory actions backed by the Stainless-generated Telnyx Go CLI.
 *
 * Ingest and remember are asynchronous. They return an operation ID; callers
 * must explicitly retrieve that namespace operation before relying on newly
 * written memories. No client-side polling loop is invented here.
 */

import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { outputJson, printError, printSuccess } from "../utils/output.ts";

type Flags = Record<string, string | boolean>;
type JsonRecord = Record<string, unknown>;
const MINIMUM_AI_MEMORY_CLI_VERSION = "0.36.0";
const AI_MEMORY_CLI_OPTIONS = { minimumVersion: MINIMUM_AI_MEMORY_CLI_VERSION } as const;

export async function createAiMemoryNamespaceCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const name = requiredFlag(flags, "name", jsonOutput);

  try {
    const response = await memoryCli(["ai:memory:namespaces", "create", "--name", name]);
    const namespace = responseDataRecord(response);
    if (jsonOutput) {
      outputJson({ namespace });
      return;
    }
    printSuccess("AI memory namespace created!", { Name: stringValue(namespace.name) || name });
  } catch (err) {
    fail(errorMessage(err), jsonOutput);
  }
}

export async function listAiMemoryNamespacesCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;

  try {
    // The generated CLI streams JSON records for list commands. Raw output keeps
    // the REST envelope as a single parseable value.
    const response = await memoryCli(["ai:memory:namespaces", "list"], "raw");
    const envelope = asRecord(response);
    const namespaces = recordArray(envelope.data);
    const result = { namespaces, meta: asRecord(envelope.meta) };
    if (jsonOutput) {
      outputJson(result);
      return;
    }
    printSuccess("AI memory namespaces retrieved!", { Count: namespaces.length });
    for (const namespace of namespaces) console.log(`  • ${stringValue(namespace.name) || "(unnamed)"}`);
    if (namespaces.length === 0) console.log("  (no namespaces returned)");
    console.log();
  } catch (err) {
    fail(errorMessage(err), jsonOutput);
  }
}

/** Retrieve one asynchronous memory write operation; this is the upstream polling endpoint. */
export async function getAiMemoryOperationStatusCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const namespace = requiredFlag(flags, "namespace", jsonOutput);
  const operationId = requiredFlag(flags, "operation-id", jsonOutput);

  try {
    const response = await memoryCli([
      "ai:memory:namespaces", "retrieve", "--namespace", namespace, "--operation-id", operationId,
    ]);
    const operation = responseDataRecord(response);
    presentOperation("AI memory operation status retrieved!", namespace, operation, jsonOutput, { fallbackOperationId: operationId });
  } catch (err) {
    fail(errorMessage(err), jsonOutput);
  }
}

export async function ingestAiMemoryProfileCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const namespace = requiredFlag(flags, "namespace", jsonOutput);
  const profileId = requiredFlag(flags, "profile-id", jsonOutput);
  const body = requiredFlag(flags, "body", jsonOutput);
  const args = [
    "ai:memory:namespaces:profiles", "ingest", "--namespace", namespace,
    "--profile-id", profileId, "--body", body,
  ];
  addOptionalFlag(args, flags, "session-id", jsonOutput);

  try {
    const response = await memoryCli(args);
    presentOperation("AI memory profile ingest started!", namespace, responseDataRecord(response), jsonOutput, { profileId });
  } catch (err) {
    fail(errorMessage(err), jsonOutput);
  }
}

export async function rememberAiMemoryProfileCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const namespace = requiredFlag(flags, "namespace", jsonOutput);
  const profileId = requiredFlag(flags, "profile-id", jsonOutput);
  const text = requiredFlag(flags, "text", jsonOutput);

  try {
    const response = await memoryCli([
      "ai:memory:namespaces:profiles", "remember", "--namespace", namespace,
      "--profile-id", profileId, "--text", text,
    ]);
    presentOperation("AI memory profile write started!", namespace, responseDataRecord(response), jsonOutput, { profileId });
  } catch (err) {
    fail(errorMessage(err), jsonOutput);
  }
}

export async function recallAiMemoryProfileCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const namespace = requiredFlag(flags, "namespace", jsonOutput);
  const profileId = requiredFlag(flags, "profile-id", jsonOutput);
  const query = requiredFlag(flags, "query", jsonOutput);
  const args = [
    "ai:memory:namespaces:profiles", "recall", "--namespace", namespace,
    "--profile-id", profileId, "--query", query,
  ];
  addPositiveIntegerFlag(args, flags, "top-k", jsonOutput);

  try {
    const response = await memoryCli(args);
    const envelope = asRecord(response);
    const result = {
      namespace,
      profile_id: profileId,
      memories: recordArray(envelope.data),
      meta: asRecord(envelope.meta),
    };
    if (jsonOutput) {
      outputJson(result);
      return;
    }
    printSuccess("AI memory profile recall completed!", { Namespace: namespace, "Profile ID": profileId, Results: result.memories.length });
    for (const memory of result.memories) {
      console.log(`  • ${stringValue(memory.text) || stringValue(memory.content) || "(memory text not returned)"}`);
    }
    if (result.memories.length === 0) console.log("  (no matching memories returned)");
    console.log();
  } catch (err) {
    fail(errorMessage(err), jsonOutput);
  }
}

export async function getAiMemoryProfileSummaryCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const namespace = requiredFlag(flags, "namespace", jsonOutput);
  const profileId = requiredFlag(flags, "profile-id", jsonOutput);

  try {
    const response = await memoryCli([
      "ai:memory:namespaces:profiles", "retrieve-summary", "--namespace", namespace, "--profile-id", profileId,
    ]);
    const summary = responseDataRecord(response);
    const result = { namespace, profile_id: profileId, summary };
    if (jsonOutput) {
      outputJson(result);
      return;
    }
    printSuccess("AI memory profile summary retrieved!", { Namespace: namespace, "Profile ID": profileId });
    const text = stringValue(summary.summary) || stringValue(summary.text) || stringValue(summary.content);
    if (text) console.log(`  ${text}\n`);
  } catch (err) {
    fail(errorMessage(err), jsonOutput);
  }
}

function presentOperation(
  title: string,
  namespace: string,
  operation: JsonRecord,
  jsonOutput: boolean,
  context: { profileId?: string; fallbackOperationId?: string } = {},
): void {
  const operationId = stringValue(operation.operation_id) || stringValue(operation.id);
  const result = {
    namespace,
    ...(context.profileId ? { profile_id: context.profileId } : {}),
    operation_id: operationId || context.fallbackOperationId || "",
    operation,
  };
  if (jsonOutput) {
    outputJson(result);
    return;
  }
  printSuccess(title, {
    Namespace: namespace,
    "Operation ID": result.operation_id,
    Status: stringValue(operation.status) || "(not returned)",
  });
  if (!operationId) {
    console.log("  The response did not include an operation ID; use the returned operation data to determine the next step.\n");
  } else if (title !== "AI memory operation status retrieved!") {
    console.log("  The write is asynchronous. Use get-ai-memory-operation-status with this operation ID before recalling it.\n");
  }
}

async function memoryCli(args: string[], format: "json" | "raw" = "json"): Promise<unknown> {
  return telnyxCli(args, { ...AI_MEMORY_CLI_OPTIONS, format });
}

function requiredFlag(flags: Flags, key: string, jsonOutput: boolean): string {
  const value = flags[key];
  if (typeof value !== "string" || value.length === 0) fail(`--${key} is required`, jsonOutput);
  return value;
}

function addOptionalFlag(args: string[], flags: Flags, key: string, jsonOutput: boolean): void {
  const value = flags[key];
  if (value === undefined) return;
  if (typeof value !== "string" || value.length === 0) fail(`--${key} requires a value`, jsonOutput);
  args.push(`--${key}`, value);
}

function addPositiveIntegerFlag(args: string[], flags: Flags, key: string, jsonOutput: boolean): void {
  const value = flags[key];
  if (value === undefined) return;
  if (typeof value !== "string" || !/^\d+$/.test(value) || Number(value) < 1) {
    fail(`--${key} must be a positive integer`, jsonOutput);
  }
  args.push(`--${key}`, value);
}

function responseDataRecord(response: unknown): JsonRecord {
  const envelope = asRecord(response);
  return asRecord(envelope.data ?? response);
}

function recordArray(value: unknown): JsonRecord[] {
  return Array.isArray(value)
    ? value.filter((item): item is JsonRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    : [];
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

function errorMessage(err: unknown): string {
  if (err instanceof TelnyxCLIError) return err.stderr || err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}
