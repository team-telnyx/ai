/**
 * Direct AI conversation lifecycle actions backed by the Stainless-generated
 * Telnyx Go CLI. These commands create and manage the conversation IDs needed
 * by chat-ai-assistant instead of requiring callers to obtain them elsewhere.
 */

import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { outputJson, printError, printSuccess } from "../utils/output.ts";

type Flags = Record<string, string | boolean>;
type JsonRecord = Record<string, unknown>;

interface ConversationResult {
  conversation_id: string;
  ai_conversation: JsonRecord;
}

interface ConversationListResult {
  count: number;
  ai_conversations: JsonRecord[];
  meta: JsonRecord;
}

interface AddMessageResult {
  conversation_id: string;
  message: JsonRecord;
}

interface DeleteConversationResult {
  conversation_id: string;
  deleted: true;
}

export async function createAiConversationCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const args = ["ai:conversations", "create"];
  addOptionalStringFlag(args, flags, "name", "--name", jsonOutput, true);
  addJsonObjectFlag(args, flags, "metadata", "--metadata", jsonOutput);
  addOptionalStringFlag(args, flags, "idempotency-key", "--idempotency-key", jsonOutput);

  try {
    const response = await telnyxCli(args);
    presentConversation("AI conversation created!", normalizeConversation(response), jsonOutput);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function getAiConversationCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const conversationId = conversationIdFlag(flags, jsonOutput);

  try {
    const response = await telnyxCli(["ai:conversations", "retrieve", "--conversation-id", conversationId]);
    presentConversation("AI conversation retrieved!", normalizeConversation(response, conversationId), jsonOutput);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function listAiConversationsCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const args = ["ai:conversations", "list"];
  addOptionalStringFlag(args, flags, "id", "--id", jsonOutput);
  addOptionalStringFlag(args, flags, "name", "--name", jsonOutput);
  addOptionalStringFlag(args, flags, "created-at", "--created-at", jsonOutput);
  addOptionalStringFlag(args, flags, "last-message-at", "--last-message-at", jsonOutput);
  addPositiveIntegerFlag(args, flags, "limit", "--limit", jsonOutput);
  addOptionalStringFlag(args, flags, "order", "--order", jsonOutput);

  try {
    // The generated list command streams individual JSON documents in json mode;
    // raw preserves the API's single { data, meta } envelope.
    const response = await telnyxCli(args, { format: "raw" });
    const result = normalizeConversationList(response);
    if (jsonOutput) {
      outputJson(result);
      return;
    }
    printSuccess("AI conversations retrieved!", { Count: result.count });
    for (const conversation of result.ai_conversations) {
      const id = stringValue(conversation.id) || "(unknown)";
      const name = stringValue(conversation.name) || "(unnamed)";
      console.log(`  • ${name} — ${id}`);
    }
    if (result.count === 0) console.log("  (no AI conversations returned)");
    console.log();
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function updateAiConversationCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const conversationId = conversationIdFlag(flags, jsonOutput);
  const args = ["ai:conversations", "update", "--conversation-id", conversationId];
  addJsonObjectFlag(args, flags, "metadata", "--metadata", jsonOutput);

  if (args.length === 4) {
    fail("--metadata is required to update an AI conversation", jsonOutput);
  }

  try {
    const response = await telnyxCli(args);
    presentConversation("AI conversation updated!", normalizeConversation(response, conversationId), jsonOutput);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function addAiConversationMessageCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const conversationId = conversationIdFlag(flags, jsonOutput);
  const role = requiredStringFlag(flags, "role", jsonOutput);
  const content = optionalStringFlag(flags, "content");
  if (content === undefined && flags.content !== undefined) {
    fail("--content requires a value", jsonOutput);
  }
  const args = [
    "ai:conversations", "add-message",
    "--conversation-id", conversationId,
    "--role", role,
    "--content", content ?? "",
  ];
  addOptionalStringFlag(args, flags, "name", "--name", jsonOutput, true);
  addJsonObjectFlag(args, flags, "metadata", "--metadata", jsonOutput);
  addOptionalStringFlag(args, flags, "sent-at", "--sent-at", jsonOutput);
  addOptionalStringFlag(args, flags, "tool-call-id", "--tool-call-id", jsonOutput);
  addJsonArrayFlag(args, flags, "tool-call", "--tool-call", jsonOutput);
  addJsonValueFlag(args, flags, "tool-choice", "--tool-choice", jsonOutput);
  addOptionalStringFlag(args, flags, "idempotency-key", "--idempotency-key", jsonOutput);

  try {
    const response = await telnyxCli(args);
    const result: AddMessageResult = {
      conversation_id: conversationId,
      message: responseDataRecord(response),
    };
    if (jsonOutput) {
      outputJson(result);
    } else {
      printSuccess("AI conversation message added!", {
        "Conversation ID": conversationId,
        Role: role,
      });
    }
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function deleteAiConversationCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const conversationId = conversationIdFlag(flags, jsonOutput);
  if (!booleanFlagIsTrue(flags, "confirm")) {
    fail("--confirm is required to delete an AI conversation", jsonOutput);
  }

  try {
    await telnyxCli(["ai:conversations", "delete", "--conversation-id", conversationId]);
    const result: DeleteConversationResult = { conversation_id: conversationId, deleted: true };
    if (jsonOutput) {
      outputJson(result);
    } else {
      printSuccess("AI conversation deleted!", { "Conversation ID": conversationId });
    }
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

function normalizeConversation(response: unknown, fallbackId = ""): ConversationResult {
  const conversation = responseDataRecord(response);
  return {
    conversation_id: stringValue(conversation.id) || fallbackId,
    ai_conversation: conversation,
  };
}

function normalizeConversationList(response: unknown): ConversationListResult {
  const envelope = asRecord(response);
  const rawConversations = Array.isArray(response)
    ? response
    : Array.isArray(envelope.data)
      ? envelope.data
      : [];
  const conversations = rawConversations.filter(
    (item): item is JsonRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item),
  );
  return {
    count: conversations.length,
    ai_conversations: conversations,
    meta: asRecord(envelope.meta),
  };
}

function presentConversation(title: string, result: ConversationResult, jsonOutput: boolean): void {
  if (jsonOutput) {
    outputJson(result);
    return;
  }
  printSuccess(title, {
    "Conversation ID": result.conversation_id || "(not returned)",
    Name: stringValue(result.ai_conversation.name) || "(unnamed)",
  });
}

function conversationIdFlag(flags: Flags, jsonOutput: boolean): string {
  const id = nonEmptyStringFlag(flags, "id");
  const conversationId = nonEmptyStringFlag(flags, "conversation-id");
  if (id && conversationId && id !== conversationId) {
    fail("--id and --conversation-id cannot specify different values", jsonOutput);
  }
  const value = conversationId ?? id;
  if (!value) fail("--id is required (AI conversation ID; --conversation-id is also accepted)", jsonOutput);
  return value;
}

function requiredStringFlag(flags: Flags, key: string, jsonOutput: boolean): string {
  const value = nonEmptyStringFlag(flags, key);
  if (!value) fail(`--${key} is required`, jsonOutput);
  return value;
}

function addOptionalStringFlag(
  args: string[],
  flags: Flags,
  source: string,
  target: string,
  jsonOutput: boolean,
  allowEmpty = false,
): void {
  const value = flags[source];
  if (value === undefined) return;
  if (typeof value !== "string" || (!allowEmpty && value.length === 0)) {
    fail(`--${source} requires a value`, jsonOutput);
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
  const value = optionalStringFlag(flags, source);
  if (value === undefined) {
    if (flags[source] !== undefined) fail(`--${source} must be a JSON object`, jsonOutput);
    return;
  }
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
  } catch {
    fail(`--${source} must be a JSON object`, jsonOutput);
  }
  args.push(target, value);
}

function addJsonArrayFlag(
  args: string[],
  flags: Flags,
  source: string,
  target: string,
  jsonOutput: boolean,
): void {
  const value = optionalStringFlag(flags, source);
  if (value === undefined) {
    if (flags[source] !== undefined) fail(`--${source} must be a JSON array`, jsonOutput);
    return;
  }
  try {
    if (!Array.isArray(JSON.parse(value))) throw new Error();
  } catch {
    fail(`--${source} must be a JSON array`, jsonOutput);
  }
  args.push(target, value);
}

function addJsonValueFlag(
  args: string[],
  flags: Flags,
  source: string,
  target: string,
  jsonOutput: boolean,
): void {
  const value = optionalStringFlag(flags, source);
  if (value === undefined) {
    if (flags[source] !== undefined) fail(`--${source} must be valid JSON`, jsonOutput);
    return;
  }
  try {
    JSON.parse(value);
  } catch {
    fail(`--${source} must be valid JSON`, jsonOutput);
  }
  args.push(target, value);
}

function addPositiveIntegerFlag(
  args: string[],
  flags: Flags,
  source: string,
  target: string,
  jsonOutput: boolean,
): void {
  const value = optionalStringFlag(flags, source);
  if (value === undefined) {
    if (flags[source] !== undefined) fail(`--${source} must be a positive integer`, jsonOutput);
    return;
  }
  if (!/^\d+$/.test(value) || Number(value) < 1) {
    fail(`--${source} must be a positive integer`, jsonOutput);
  }
  args.push(target, value);
}

function responseDataRecord(response: unknown): JsonRecord {
  const envelope = asRecord(response);
  return asRecord(envelope.data ?? response);
}

function booleanFlagIsTrue(flags: Flags, key: string): boolean {
  return flags[key] === true || flags[key] === "true";
}

function optionalStringFlag(flags: Flags, key: string): string | undefined {
  const value = flags[key];
  return typeof value === "string" ? value : undefined;
}

function nonEmptyStringFlag(flags: Flags, key: string): string | undefined {
  const value = optionalStringFlag(flags, key);
  return value && value.length > 0 ? value : undefined;
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
