/**
 * Direct AI assistant lifecycle, execution, and validation actions backed by the
 * Stainless-generated Go CLI.
 *
 * List requests use raw output so the Go CLI returns one parseable `{ data, meta }`
 * envelope instead of streaming one JSON document per resource.
 */

import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { outputJson, printError, printSuccess } from "../utils/output.ts";

type Flags = Record<string, string | boolean>;
type JsonRecord = Record<string, unknown>;

interface AssistantListResult {
  count: number;
  ai_assistants: JsonRecord[];
  meta: JsonRecord;
}

interface AssistantResult {
  assistant_id: string;
  ai_assistant: JsonRecord;
}

interface DeleteAssistantResult {
  assistant_id: string;
  deleted: true;
}

export interface AiAssistantChatResult {
  assistant_id: string;
  conversation_id: string;
  content: string;
  chat: JsonRecord;
}

export interface AiAssistantSmsResult {
  assistant_id: string;
  conversation_id: string;
  sms: JsonRecord;
}

export interface AiAssistantTestRunResult {
  test_id: string;
  run_id: string;
  test_run: JsonRecord;
}

export interface AiAssistantTestRunListResult {
  test_id: string;
  count: number;
  test_runs: JsonRecord[];
  meta: JsonRecord;
}

export interface AiAssistantToolTestResult {
  assistant_id: string;
  tool_id: string;
  tool_test: JsonRecord;
}

export async function listAiAssistantsCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;

  try {
    const response = await telnyxCli(["ai:assistants", "list"], { format: "raw" });
    const result = normalizeAssistantList(response);
    if (jsonOutput) {
      outputJson(result);
      return;
    }

    printSuccess("AI assistants retrieved!", { Count: result.count });
    for (const assistant of result.ai_assistants) {
      const id = stringValue(assistant.id) || "(unknown)";
      const name = stringValue(assistant.name) || "(unnamed)";
      const model = stringValue(assistant.model);
      console.log(`  • ${name} — ${id}${model ? ` · ${model}` : ""}`);
    }
    if (result.count === 0) console.log("  (no AI assistants returned)");
    console.log();
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function createAiAssistantCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const name = requiredStringFlag(flags, "name", jsonOutput);
  const instructions = requiredStringFlag(flags, "instructions", jsonOutput);
  const args = [
    "ai:assistants",
    "create",
    "--name",
    name,
    "--instructions",
    instructions,
  ];

  addAssistantFields(args, flags, jsonOutput);

  try {
    const response = await telnyxCli(args);
    presentAssistant("AI assistant created!", normalizeAssistant(response), jsonOutput);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function getAiAssistantCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const assistantId = assistantIdFlag(flags, jsonOutput);
  const args = ["ai:assistants", "retrieve", "--assistant-id", assistantId];

  try {
    const response = await telnyxCli(args);
    presentAssistant("AI assistant retrieved!", normalizeAssistant(response, assistantId), jsonOutput);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function updateAiAssistantCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const assistantId = assistantIdFlag(flags, jsonOutput);
  const args = ["ai:assistants", "update", "--assistant-id", assistantId];
  const requestBody: JsonRecord = {};

  addAssistantFields(args, flags, jsonOutput, requestBody);
  addMappedFlag(args, flags, "name", "--name");
  addMappedFlag(args, flags, "instructions", "--instructions");
  addMappedFlag(args, flags, "version-name", "--version-name");
  addBooleanFlag(args, flags, "promote-to-main", "--promote-to-main", jsonOutput);

  if (args.length === 4 && Object.keys(requestBody).length === 0) {
    fail("at least one AI assistant field must be supplied for update", jsonOutput);
  }

  try {
    const response = await telnyxCli(
      args,
      Object.keys(requestBody).length > 0 ? { stdin: JSON.stringify(requestBody) } : undefined,
    );
    presentAssistant("AI assistant updated!", normalizeAssistant(response, assistantId), jsonOutput);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function deleteAiAssistantCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const assistantId = assistantIdFlag(flags, jsonOutput);
  if (!booleanFlagIsTrue(flags, "confirm")) {
    fail("--confirm is required to delete an AI assistant", jsonOutput);
  }

  try {
    const response = await telnyxCli([
      "ai:assistants",
      "delete",
      "--assistant-id",
      assistantId,
    ]);
    const data = asRecord(asRecord(response).data ?? response);
    const result: DeleteAssistantResult = {
      assistant_id: stringValue(data.id) || assistantId,
      deleted: true,
    };

    if (jsonOutput) {
      outputJson(result);
    } else {
      printSuccess("AI assistant deleted!", { "Assistant ID": result.assistant_id });
    }
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

/** Send one API chat turn through an existing assistant conversation. */
export async function chatAiAssistantCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const assistantId = assistantIdFlag(flags, jsonOutput);
  const content = requiredStringFlag(flags, "content", jsonOutput);
  const conversationId = requiredStringFlag(flags, "conversation-id", jsonOutput);
  const args = [
    "ai:assistants", "chat",
    "--assistant-id", assistantId,
    "--content", content,
    "--conversation-id", conversationId,
  ];
  addMappedFlag(args, flags, "name", "--name");
  addBooleanFlag(args, flags, "stream", "--stream", jsonOutput);

  try {
    // Streaming was added to the generated Go CLI in v0.26. The underlying
    // chat action itself is present in the currently vendored v0.24 release.
    const response = await telnyxCli(
      args,
      flags.stream === undefined ? undefined : { minimumVersion: "0.26.0" },
    );
    const chat = responseDataRecord(response);
    const result: AiAssistantChatResult = {
      assistant_id: assistantId,
      conversation_id: conversationId,
      content: stringValue(chat.content),
      chat,
    };
    if (jsonOutput) outputJson(result);
    else {
      printSuccess("AI assistant replied!", {
        "Assistant ID": assistantId,
        "Conversation ID": conversationId,
        Reply: result.content || "(no content returned)",
      });
    }
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

/** Start or continue assistant messaging over SMS. */
export async function sendAiAssistantSmsCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const assistantId = assistantIdFlag(flags, jsonOutput);
  const from = requiredStringFlag(flags, "from", jsonOutput);
  const to = requiredStringFlag(flags, "to", jsonOutput);
  const args = [
    "ai:assistants", "send-sms",
    "--assistant-id", assistantId,
    "--from", from,
    "--to", to,
  ];
  addMappedFlag(args, flags, "text", "--text", true);
  addJsonObjectFlag(
    args,
    flags,
    "conversation-metadata",
    "--conversation-metadata",
    jsonOutput,
  );
  addBooleanFlag(
    args,
    flags,
    "should-create-conversation",
    "--should-create-conversation",
    jsonOutput,
  );

  try {
    const response = await telnyxCli(args);
    const sms = responseDataRecord(response);
    const result: AiAssistantSmsResult = {
      assistant_id: assistantId,
      conversation_id: stringValue(sms.conversation_id),
      sms,
    };
    if (jsonOutput) outputJson(result);
    else {
      printSuccess("AI assistant SMS sent!", {
        "Assistant ID": assistantId,
        From: from,
        To: to,
        "Conversation ID": result.conversation_id || "(not returned)",
      });
    }
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

/** Trigger an immediate execution of an existing assistant test. */
export async function triggerAiAssistantTestRunCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const testId = requiredStringFlag(flags, "test-id", jsonOutput);
  const args = ["ai:assistants:tests:runs", "trigger", "--test-id", testId];
  addMappedFlag(args, flags, "destination-version-id", "--destination-version-id");

  try {
    const response = await telnyxCli(args);
    presentTestRun("AI assistant test run triggered!", testId, response, jsonOutput);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

/** Retrieve one assistant test run. */
export async function getAiAssistantTestRunCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const testId = requiredStringFlag(flags, "test-id", jsonOutput);
  const runId = requiredStringFlag(flags, "run-id", jsonOutput);
  const args = [
    "ai:assistants:tests:runs", "retrieve",
    "--test-id", testId,
    "--run-id", runId,
  ];

  try {
    const response = await telnyxCli(args);
    presentTestRun("AI assistant test run retrieved!", testId, response, jsonOutput, runId);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

/** List paginated execution history for an assistant test. */
export async function listAiAssistantTestRunsCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const testId = requiredStringFlag(flags, "test-id", jsonOutput);
  const args = ["ai:assistants:tests:runs", "list", "--test-id", testId];
  addPositiveIntegerFlag(args, flags, "page-number", "--page-number", jsonOutput);
  addPositiveIntegerFlag(args, flags, "page-size", "--page-size", jsonOutput);
  addMappedFlag(args, flags, "status", "--status");
  const maxItems = addMaxItemsFlag(args, flags, jsonOutput);

  try {
    const response = await telnyxCli(args, { format: "raw" });
    const envelope = asRecord(response);
    const allRuns = responseDataRecords(response);
    const testRuns = maxItems === undefined || maxItems === -1
      ? allRuns
      : allRuns.slice(0, maxItems);
    const result: AiAssistantTestRunListResult = {
      test_id: testId,
      count: testRuns.length,
      test_runs: testRuns,
      meta: asRecord(envelope.meta),
    };
    if (jsonOutput) outputJson(result);
    else {
      printSuccess("AI assistant test runs retrieved!", {
        "Test ID": testId,
        Count: result.count,
      });
      for (const run of testRuns) {
        const runId = stringValue(run.run_id) || "(unknown)";
        const status = stringValue(run.status);
        console.log(`  • ${runId}${status ? ` — ${status}` : ""}`);
      }
      if (testRuns.length === 0) console.log("  (no test runs returned)");
      console.log();
    }
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

/** Execute a shared webhook tool in an assistant context without a conversation. */
export async function testAiAssistantToolCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const assistantId = assistantIdFlag(flags, jsonOutput);
  const toolId = requiredStringFlag(flags, "tool-id", jsonOutput);
  const args = [
    "ai:assistants:tools", "test",
    "--assistant-id", assistantId,
    "--tool-id", toolId,
  ];
  addJsonObjectFlag(args, flags, "arguments", "--arguments", jsonOutput);
  addJsonObjectFlag(args, flags, "dynamic-variables", "--dynamic-variables", jsonOutput);

  try {
    const response = await telnyxCli(args);
    const toolTest = responseDataRecord(response);
    const result: AiAssistantToolTestResult = {
      assistant_id: assistantId,
      tool_id: toolId,
      tool_test: toolTest,
    };
    if (jsonOutput) outputJson(result);
    else {
      printSuccess("AI assistant tool test completed!", {
        "Assistant ID": assistantId,
        "Tool ID": toolId,
        Success: toolTest.success === undefined ? "(not returned)" : String(toolTest.success),
        "Status Code": stringValue(toolTest.status_code) || "(not returned)",
      });
    }
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

function addAssistantFields(
  args: string[],
  flags: Flags,
  jsonOutput: boolean,
  requestBody?: JsonRecord,
): void {
  addMappedFlag(args, flags, "description", "--description");
  addMappedFlag(args, flags, "model", "--model");
  addMappedFlag(args, flags, "greeting", "--greeting", true);
  addMappedFlag(args, flags, "dynamic-variables-webhook-url", "--dynamic-variables-webhook-url");
  addJsonObjectFlag(args, flags, "dynamic-variables", "--dynamic-variables", jsonOutput);
  addIntegerRangeFlag(
    args,
    flags,
    "dynamic-variables-webhook-timeout-ms",
    "--dynamic-variables-webhook-timeout-ms",
    1,
    10_000,
    jsonOutput,
  );
  addCsvOrClearFlag(
    args,
    flags,
    "tags",
    "--tag",
    "clear-tags",
    "tags",
    requestBody,
    jsonOutput,
  );
  addCsvOrClearFlag(
    args,
    flags,
    "tool-ids",
    "--tool-id",
    "clear-tool-ids",
    "tool_ids",
    requestBody,
    jsonOutput,
  );
  addMappedFlag(args, flags, "voice", "--voice-settings.voice");
  addMappedFlag(args, flags, "transcription-model", "--transcription.model");
  addMappedFlag(args, flags, "transcription-language", "--transcription.language");
}

function normalizeAssistantList(response: unknown): AssistantListResult {
  const envelope = asRecord(response);
  const rawAssistants = Array.isArray(response)
    ? response
    : Array.isArray(envelope.data)
      ? envelope.data
      : [];
  const assistants = rawAssistants.filter(
    (item): item is JsonRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item),
  );
  return {
    count: assistants.length,
    ai_assistants: assistants,
    meta: asRecord(envelope.meta),
  };
}

function normalizeAssistant(response: unknown, fallbackId = ""): AssistantResult {
  const assistant = asRecord(asRecord(response).data ?? response);
  return {
    assistant_id: stringValue(assistant.id) || fallbackId,
    ai_assistant: assistant,
  };
}

function presentAssistant(title: string, result: AssistantResult, jsonOutput: boolean): void {
  if (jsonOutput) {
    outputJson(result);
    return;
  }

  printSuccess(title, {
    "Assistant ID": result.assistant_id || "(not returned)",
    Name: stringValue(result.ai_assistant.name) || "(not returned)",
    Model: stringValue(result.ai_assistant.model) || "(default)",
    Greeting: stringValue(result.ai_assistant.greeting) || "(none)",
  });
}

function assistantIdFlag(flags: Flags, jsonOutput: boolean): string {
  const id = nonEmptyStringFlag(flags, "id");
  const assistantId = nonEmptyStringFlag(flags, "assistant-id");
  if (id && assistantId && id !== assistantId) {
    fail("--id and --assistant-id cannot specify different values", jsonOutput);
  }
  const value = assistantId ?? id;
  if (!value) fail("--id is required (AI assistant ID; --assistant-id is also accepted)", jsonOutput);
  return value;
}

function requiredStringFlag(flags: Flags, key: string, jsonOutput: boolean): string {
  const value = nonEmptyStringFlag(flags, key);
  if (!value) fail(`--${key} is required`, jsonOutput);
  return value;
}

function addMappedFlag(
  args: string[],
  flags: Flags,
  source: string,
  target: string,
  allowEmpty = false,
): void {
  const raw = flags[source];
  const value = typeof raw === "string" && (allowEmpty || raw.length > 0) ? raw : undefined;
  if (value !== undefined) args.push(target, value);
}

function addJsonObjectFlag(
  args: string[],
  flags: Flags,
  source: string,
  target: string,
  jsonOutput: boolean,
): void {
  const value = optionalStringFlag(flags, source);
  if (value === undefined) return;
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
  } catch {
    fail(`--${source} must be a JSON object`, jsonOutput);
  }
  args.push(target, value);
}

function addCsvOrClearFlag(
  args: string[],
  flags: Flags,
  source: string,
  target: string,
  clearSource: string,
  bodyField: string,
  requestBody: JsonRecord | undefined,
  jsonOutput: boolean,
): void {
  const clearValue = flags[clearSource];
  if (clearValue === undefined) {
    addCsvFlag(args, flags, source, target, jsonOutput);
    return;
  }
  if (clearValue !== true) {
    fail(`--${clearSource} is a boolean flag and does not take a value`, jsonOutput);
  }
  if (!requestBody) {
    fail(`--${clearSource} is only valid for update-ai-assistant`, jsonOutput);
  }
  if (flags[source] !== undefined) {
    fail(`--${source} and --${clearSource} cannot be used together`, jsonOutput);
  }
  requestBody[bodyField] = [];
}

function addCsvFlag(
  args: string[],
  flags: Flags,
  source: string,
  target: string,
  jsonOutput: boolean,
): void {
  const raw = flags[source];
  if (raw === undefined) return;
  if (typeof raw !== "string") {
    fail(`--${source} must contain at least one value`, jsonOutput);
  }
  const values = raw.split(",").map((item) => item.trim()).filter(Boolean);
  if (values.length === 0) fail(`--${source} must contain at least one value`, jsonOutput);
  for (const value of values) args.push(target, value);
}

function addIntegerRangeFlag(
  args: string[],
  flags: Flags,
  source: string,
  target: string,
  minimum: number,
  maximum: number,
  jsonOutput: boolean,
): void {
  const value = optionalStringFlag(flags, source);
  if (value === undefined) return;
  if (!/^\d+$/.test(value) || Number(value) < minimum || Number(value) > maximum) {
    fail(`--${source} must be an integer between ${minimum} and ${maximum}`, jsonOutput);
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
  if (value === undefined) return;
  if (!/^\d+$/.test(value) || Number(value) < 1) {
    fail(`--${source} must be a positive integer`, jsonOutput);
  }
  args.push(target, value);
}

function addMaxItemsFlag(args: string[], flags: Flags, jsonOutput: boolean): number | undefined {
  const value = optionalStringFlag(flags, "max-items");
  if (value === undefined) return undefined;
  if (!/^(?:-1|\d+)$/.test(value)) {
    fail("--max-items must be -1 or a non-negative integer", jsonOutput);
  }
  args.push("--max-items", value);
  return Number(value);
}

function responseDataRecord(response: unknown): JsonRecord {
  const envelope = asRecord(response);
  return asRecord(envelope.data ?? response);
}

function responseDataRecords(response: unknown): JsonRecord[] {
  const envelope = asRecord(response);
  const data = Array.isArray(response) ? response : envelope.data;
  if (!Array.isArray(data)) return [];
  return data.filter(
    (item): item is JsonRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item),
  );
}

function presentTestRun(
  title: string,
  requestedTestId: string,
  response: unknown,
  jsonOutput: boolean,
  fallbackRunId = "",
): void {
  const testRun = responseDataRecord(response);
  const result: AiAssistantTestRunResult = {
    test_id: stringValue(testRun.test_id) || requestedTestId,
    run_id: stringValue(testRun.run_id) || fallbackRunId,
    test_run: testRun,
  };
  if (jsonOutput) {
    outputJson(result);
    return;
  }
  printSuccess(title, {
    "Test ID": result.test_id,
    "Run ID": result.run_id || "(not returned)",
    Status: stringValue(testRun.status) || "(not returned)",
  });
}

function addBooleanFlag(
  args: string[],
  flags: Flags,
  source: string,
  target: string,
  jsonOutput: boolean,
): void {
  const value = flags[source];
  if (value === undefined) return;
  if (value === true || value === "true" || value === "false") {
    args.push(`${target}=${value === true ? "true" : value}`);
    return;
  }
  fail(`--${source} must be true or false`, jsonOutput);
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
