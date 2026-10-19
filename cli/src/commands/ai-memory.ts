/**
 * Direct AI memory operations backed by the generated Telnyx Go CLI.
 *
 * Memory writes run asynchronously; callers should use ai-memory-operation with
 * the returned operation ID before relying on a newly ingested or remembered fact.
 */

import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { outputJson, printError, printSuccess } from "../utils/output.ts";

type Flags = Record<string, string | boolean>;
type JsonRecord = Record<string, unknown>;

const AI_MEMORY_MINIMUM_CLI_VERSION = "0.33.0";
const CLI_OPTIONS = { minimumVersion: AI_MEMORY_MINIMUM_CLI_VERSION } as const;

export async function ingestAiMemoryCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const namespace = requiredStringFlag(flags, "namespace", jsonOutput);
  const profileId = requiredStringFlag(flags, "profile-id", jsonOutput);
  const body = requiredJsonObjectFlag(flags, "body", jsonOutput);
  const args = [
    "ai:memory:namespaces:profiles", "ingest",
    "--namespace", namespace,
    "--profile-id", profileId,
    "--body", body,
  ];
  addSessionIdFlag(args, flags, jsonOutput);
  await execute("AI memory session ingested!", args, jsonOutput);
}

export async function rememberAiMemoryCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const namespace = requiredStringFlag(flags, "namespace", jsonOutput);
  const profileId = requiredStringFlag(flags, "profile-id", jsonOutput);
  const text = requiredStringFlag(flags, "text", jsonOutput);
  await execute("AI memory fact remembered!", [
    "ai:memory:namespaces:profiles", "remember",
    "--namespace", namespace,
    "--profile-id", profileId,
    "--text", text,
  ], jsonOutput);
}

export async function recallAiMemoryCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const namespace = requiredStringFlag(flags, "namespace", jsonOutput);
  const profileId = requiredStringFlag(flags, "profile-id", jsonOutput);
  const query = requiredStringFlag(flags, "query", jsonOutput);
  const args = [
    "ai:memory:namespaces:profiles", "recall",
    "--namespace", namespace,
    "--profile-id", profileId,
    "--query", query,
  ];
  addPositiveIntegerFlag(args, flags, "top-k", jsonOutput);
  await execute("AI memories recalled!", args, jsonOutput);
}

export async function getAiMemoryOperationCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const namespace = requiredStringFlag(flags, "namespace", jsonOutput);
  const operationId = requiredStringFlag(flags, "operation-id", jsonOutput);
  await execute("AI memory operation retrieved!", [
    "ai:memory:namespaces", "retrieve",
    "--namespace", namespace,
    "--operation-id", operationId,
  ], jsonOutput);
}

export async function getAiMemorySummaryCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const namespace = requiredStringFlag(flags, "namespace", jsonOutput);
  const profileId = requiredStringFlag(flags, "profile-id", jsonOutput);
  await execute("AI memory summary retrieved!", [
    "ai:memory:namespaces:profiles", "retrieve-summary",
    "--namespace", namespace,
    "--profile-id", profileId,
  ], jsonOutput);
}

async function execute(title: string, args: string[], jsonOutput: boolean): Promise<void> {
  try {
    const response = await telnyxCli(args, CLI_OPTIONS);
    // Keep the generated API envelope intact for agents rather than discarding
    // operation state, memory scores, or summary fields.
    if (jsonOutput) {
      outputJson(response);
      return;
    }
    printSuccess(title, humanDetails(response));
  } catch (err) {
    fail(errorMessage(err), jsonOutput);
  }
}

function requiredStringFlag(flags: Flags, key: string, jsonOutput: boolean): string {
  const value = flags[key];
  if (typeof value !== "string" || value.length === 0) {
    fail(`--${key} is required and must be a non-empty string`, jsonOutput);
  }
  return value;
}

function requiredJsonObjectFlag(flags: Flags, key: string, jsonOutput: boolean): string {
  const value = requiredStringFlag(flags, key, jsonOutput);
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || Object.keys(parsed).length === 0) {
      throw new Error();
    }
  } catch {
    fail(`--${key} must be a non-empty JSON object`, jsonOutput);
  }
  return value;
}

function addSessionIdFlag(args: string[], flags: Flags, jsonOutput: boolean): void {
  if (flags["session-id"] === undefined) return;
  const sessionId = requiredStringFlag(flags, "session-id", jsonOutput);
  if (/\s|[\x00-\x1F/\\#?%]/.test(sessionId)) {
    fail("--session-id cannot contain whitespace, control characters, /, \\, #, ?, or %", jsonOutput);
  }
  args.push("--session-id", sessionId);
}

function addPositiveIntegerFlag(args: string[], flags: Flags, key: string, jsonOutput: boolean): void {
  if (flags[key] === undefined) return;
  const value = requiredStringFlag(flags, key, jsonOutput);
  if (!/^\d+$/.test(value) || BigInt(value) < 1n) {
    fail(`--${key} must be a positive integer`, jsonOutput);
  }
  args.push(`--${key}`, value);
}

function humanDetails(response: unknown): Record<string, string> {
  const envelope = asRecord(response);
  const data = asRecord(envelope.data ?? response);
  const operationId = stringValue(data.operation_id);
  const status = stringValue(data.status);
  return {
    ...(operationId ? { "Operation ID": operationId } : {}),
    ...(status ? { Status: status } : {}),
  };
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
