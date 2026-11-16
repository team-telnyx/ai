/**
 * Direct AI assistant lifecycle, execution, and validation actions backed by the
 * Stainless-generated Go CLI.
 *
 * List requests use raw output so the Go CLI returns one parseable `{ data, meta }`
 * envelope instead of streaming one JSON document per resource. Instruction enhancement
 * instead preserves the raw body because its response is not a JSON contract.
 */

import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { outputJson, printError, printSuccess } from "../utils/output.ts";

type Flags = Record<string, string | boolean>;
type Occurrences = Record<string, Array<string | boolean>>;
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

export interface AiAssistantTestResult {
  test_id: string;
  test: JsonRecord;
}

export interface AiAssistantTestListResult {
  count: number;
  tests: JsonRecord[];
  meta: JsonRecord;
}

export interface AiAssistantTestSuiteListResult {
  count: number;
  test_suites: string[];
}

export interface AiAssistantVersionResult {
  assistant_id: string;
  version_id: string;
  version: JsonRecord;
}

export interface AiAssistantVersionListResult {
  assistant_id: string;
  count: number;
  versions: JsonRecord[];
}

export interface DeleteAiAssistantTestResult {
  test_id: string;
  deleted: true;
}

export interface DeleteAiAssistantVersionResult {
  assistant_id: string;
  version_id: string;
  deleted: true;
}

export interface AiAssistantToolTestResult {
  assistant_id: string;
  tool_id: string;
  tool_test: JsonRecord;
}

const AI_ASSISTANT_INSTRUCTION_ENHANCE_MINIMUM_CLI_VERSION = "0.30.0";
const AI_ASSISTANT_V032_CONTROLS_MINIMUM_CLI_VERSION = "0.32.0";

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

export async function createAiAssistantCommand(
  flags: Flags,
  occurrences: Occurrences = {},
): Promise<void> {
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

  addAssistantFields(args, flags, jsonOutput, undefined, occurrences);

  try {
    const response = await telnyxCli(
      args,
      usesAiAssistantV032Controls(flags)
        ? { minimumVersion: AI_ASSISTANT_V032_CONTROLS_MINIMUM_CLI_VERSION }
        : undefined,
    );
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

export async function updateAiAssistantCommand(
  flags: Flags,
  occurrences: Occurrences = {},
): Promise<void> {
  const jsonOutput = flags.json === true;
  const assistantId = assistantIdFlag(flags, jsonOutput);
  const args = ["ai:assistants", "update", "--assistant-id", assistantId];
  const requestBody: JsonRecord = {};

  addAssistantFields(args, flags, jsonOutput, requestBody, occurrences);
  addMappedFlag(args, flags, "name", "--name");
  addMappedFlag(args, flags, "instructions", "--instructions");
  addMappedFlag(args, flags, "version-name", "--version-name");
  addBooleanFlag(args, flags, "promote-to-main", "--promote-to-main", jsonOutput);

  if (args.length === 4 && Object.keys(requestBody).length === 0) {
    fail("at least one AI assistant field must be supplied for update", jsonOutput);
  }

  try {
    const options: { stdin?: string; minimumVersion?: string } = Object.keys(requestBody).length > 0
      ? { stdin: JSON.stringify(requestBody) }
      : {};
    if (usesAiAssistantV032Controls(flags)) {
      options.minimumVersion = AI_ASSISTANT_V032_CONTROLS_MINIMUM_CLI_VERSION;
    }
    const response = await telnyxCli(args, Object.keys(options).length > 0 ? options : undefined);
    presentAssistant("AI assistant updated!", normalizeAssistant(response, assistantId), jsonOutput);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

/**
 * Request an instruction enhancement without changing the assistant. The upstream
 * endpoint returns a generated body rather than a stable JSON schema, so this
 * command emits that buffered body exactly as received.
 */
export async function enhanceAiAssistantInstructionsCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const assistantId = requiredStringFlag(flags, "assistant-id", jsonOutput);
  const args = ["ai:assistants:instructions", "enhance", "--assistant-id", assistantId];
  addOptionalStringFlag(args, flags, "enhancement-prompt", "--enhancement-prompt", jsonOutput);
  addOptionalStringFlag(args, flags, "instructions", "--instructions", jsonOutput);

  try {
    const response = await telnyxCli(args, {
      format: "raw",
      rawResponse: true,
      minimumVersion: AI_ASSISTANT_INSTRUCTION_ENHANCE_MINIMUM_CLI_VERSION,
    });
    if (jsonOutput) {
      outputJson({ assistant_id: assistantId, response, applied: false });
    } else {
      process.stdout.write(response);
    }
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
  // Note: the Go CLI's --stream flag is intentionally not exposed. Streaming
  // returns server-sent events, which this wrapper's JSON envelope parsing
  // cannot consume; agents always receive the complete response.

  try {
    const response = await telnyxCli(args);
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

/** Create a reusable assistant evaluation definition. */
export async function createAiAssistantTestCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const args = [
    "ai:assistants:tests", "create",
    "--destination", requiredStringFlag(flags, "destination", jsonOutput),
    "--instructions", requiredStringFlag(flags, "instructions", jsonOutput),
    "--name", requiredStringFlag(flags, "name", jsonOutput),
  ];
  addJsonObjectArrayFlag(args, flags, "rubric", "--rubric", true, jsonOutput);
  addMappedFlag(args, flags, "description", "--description");
  addPositiveIntegerFlag(args, flags, "max-duration-seconds", "--max-duration-seconds", jsonOutput);
  addTestChannelFlag(args, flags, jsonOutput);
  addMappedFlag(args, flags, "test-suite", "--test-suite");
  addMappedFlag(args, flags, "idempotency-key", "--idempotency-key");

  try {
    const response = await telnyxCli(args);
    presentTest("AI assistant test created!", response, jsonOutput);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

/** Retrieve one assistant evaluation definition. */
export async function getAiAssistantTestCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const testId = requiredStringFlag(flags, "test-id", jsonOutput);
  try {
    const response = await telnyxCli(["ai:assistants:tests", "retrieve", "--test-id", testId]);
    presentTest("AI assistant test retrieved!", response, jsonOutput, testId);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

/** Update one assistant evaluation definition without triggering it. */
export async function updateAiAssistantTestCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const testId = requiredStringFlag(flags, "test-id", jsonOutput);
  const args = ["ai:assistants:tests", "update", "--test-id", testId];
  addMappedFlag(args, flags, "description", "--description");
  addMappedFlag(args, flags, "destination", "--destination");
  addMappedFlag(args, flags, "instructions", "--instructions");
  addPositiveIntegerFlag(args, flags, "max-duration-seconds", "--max-duration-seconds", jsonOutput);
  addMappedFlag(args, flags, "name", "--name");
  addJsonObjectArrayFlag(args, flags, "rubric", "--rubric", false, jsonOutput);
  addTestChannelFlag(args, flags, jsonOutput);
  addMappedFlag(args, flags, "test-suite", "--test-suite");
  if (args.length === 4) fail("at least one AI assistant test field must be supplied for update", jsonOutput);

  try {
    const response = await telnyxCli(args);
    presentTest("AI assistant test updated!", response, jsonOutput, testId);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

/** List assistant evaluation definitions in one parseable API envelope. */
export async function listAiAssistantTestsCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const args = ["ai:assistants:tests", "list"];
  addMappedFlag(args, flags, "destination", "--destination");
  addPositiveIntegerFlag(args, flags, "page-number", "--page-number", jsonOutput);
  addPositiveIntegerFlag(args, flags, "page-size", "--page-size", jsonOutput);
  addTestChannelFlag(args, flags, jsonOutput);
  addMappedFlag(args, flags, "test-suite", "--test-suite");
  const maxItems = addMaxItemsFlag(args, flags, jsonOutput);

  try {
    const response = await telnyxCli(args, { format: "raw" });
    const allTests = responseDataRecords(response);
    const tests = maxItems === undefined || maxItems === -1 ? allTests : allTests.slice(0, maxItems);
    const result: AiAssistantTestListResult = {
      count: tests.length,
      tests,
      meta: asRecord(asRecord(response).meta),
    };
    presentTestList("AI assistant tests retrieved!", result, jsonOutput);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

/** Delete an assistant test only after explicit acknowledgement. */
export async function deleteAiAssistantTestCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const testId = requiredStringFlag(flags, "test-id", jsonOutput);
  if (!booleanFlagIsTrue(flags, "confirm")) fail("--confirm is required to delete an AI assistant test", jsonOutput);
  try {
    await telnyxCli(["ai:assistants:tests", "delete", "--test-id", testId]);
    const result: DeleteAiAssistantTestResult = { test_id: testId, deleted: true };
    if (jsonOutput) outputJson(result);
    else printSuccess("AI assistant test deleted!", { "Test ID": testId });
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

/** List the distinct evaluation-suite names available to the account. */
export async function listAiAssistantTestSuitesCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  try {
    const response = await telnyxCli(["ai:assistants:tests:test-suites", "list"], { format: "raw" });
    const data = Array.isArray(response) ? response : asRecord(response).data;
    const testSuites = Array.isArray(data) ? data.filter((item): item is string => typeof item === "string") : [];
    const result: AiAssistantTestSuiteListResult = { count: testSuites.length, test_suites: testSuites };
    if (jsonOutput) outputJson(result);
    else {
      printSuccess("AI assistant test suites retrieved!", { Count: result.count });
      for (const suite of testSuites) console.log(`  • ${suite}`);
      if (testSuites.length === 0) console.log("  (no test suites returned)");
      console.log();
    }
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

/** Retrieve a saved, immutable assistant version. */
export async function getAiAssistantVersionCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const assistantId = assistantIdFlag(flags, jsonOutput);
  const versionId = requiredStringFlag(flags, "version-id", jsonOutput);
  const args = ["ai:assistants:versions", "retrieve", "--assistant-id", assistantId, "--version-id", versionId];
  addBooleanFlag(args, flags, "include-mcp-servers", "--include-mcp-servers", jsonOutput);
  try {
    const response = await telnyxCli(args);
    presentVersion("AI assistant version retrieved!", assistantId, response, jsonOutput, versionId);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

/** List all saved versions for an assistant. */
export async function listAiAssistantVersionsCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const assistantId = assistantIdFlag(flags, jsonOutput);
  try {
    const response = await telnyxCli([
      "ai:assistants:versions", "list", "--assistant-id", assistantId,
    ], { format: "raw" });
    const versions = responseDataRecords(response);
    const result: AiAssistantVersionListResult = { assistant_id: assistantId, count: versions.length, versions };
    if (jsonOutput) outputJson(result);
    else {
      printSuccess("AI assistant versions retrieved!", { "Assistant ID": assistantId, Count: result.count });
      for (const version of versions) {
        const id = stringValue(version.id) || stringValue(version.version_id) || "(unknown)";
        console.log(`  • ${stringValue(version.name) || id} — ${id}`);
      }
      if (versions.length === 0) console.log("  (no versions returned)");
      console.log();
    }
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

/** Update a non-main saved assistant version. */
export async function updateAiAssistantVersionCommand(
  flags: Flags,
  occurrences: Occurrences = {},
): Promise<void> {
  const jsonOutput = flags.json === true;
  const assistantId = assistantIdFlag(flags, jsonOutput);
  const versionId = requiredStringFlag(flags, "version-id", jsonOutput);
  const args = [
    "ai:assistants:versions", "update", "--assistant-id", assistantId, "--version-id", versionId,
  ];
  addAssistantFields(args, flags, jsonOutput, undefined, occurrences);
  addMappedFlag(args, flags, "name", "--name");
  addMappedFlag(args, flags, "instructions", "--instructions");
  addMappedFlag(args, flags, "version-name", "--version-name");
  if (args.length === 6) fail("at least one AI assistant version field must be supplied for update", jsonOutput);

  try {
    const response = await telnyxCli(
      args,
      usesAiAssistantV032Controls(flags)
        ? { minimumVersion: AI_ASSISTANT_V032_CONTROLS_MINIMUM_CLI_VERSION }
        : undefined,
    );
    presentVersion("AI assistant version updated!", assistantId, response, jsonOutput, versionId);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

/** Delete a non-main saved assistant version after explicit acknowledgement. */
export async function deleteAiAssistantVersionCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const assistantId = assistantIdFlag(flags, jsonOutput);
  const versionId = requiredStringFlag(flags, "version-id", jsonOutput);
  if (!booleanFlagIsTrue(flags, "confirm")) fail("--confirm is required to delete an AI assistant version", jsonOutput);
  try {
    await telnyxCli([
      "ai:assistants:versions", "delete", "--assistant-id", assistantId, "--version-id", versionId,
    ]);
    const result: DeleteAiAssistantVersionResult = { assistant_id: assistantId, version_id: versionId, deleted: true };
    if (jsonOutput) outputJson(result);
    else printSuccess("AI assistant version deleted!", { "Assistant ID": assistantId, "Version ID": versionId });
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

/** Make a saved assistant version the production/main version. */
export async function promoteAiAssistantVersionCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const assistantId = assistantIdFlag(flags, jsonOutput);
  const versionId = requiredStringFlag(flags, "version-id", jsonOutput);
  if (!booleanFlagIsTrue(flags, "confirm")) {
    fail("--confirm is required to promote an AI assistant version to production", jsonOutput);
  }
  try {
    const response = await telnyxCli([
      "ai:assistants:versions", "promote", "--assistant-id", assistantId, "--version-id", versionId,
    ]);
    presentVersion("AI assistant version promoted!", assistantId, response, jsonOutput, versionId);
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

function presentTest(
  title: string,
  response: unknown,
  jsonOutput: boolean,
  fallbackTestId = "",
): void {
  const test = responseDataRecord(response);
  const result: AiAssistantTestResult = {
    test_id: stringValue(test.id) || stringValue(test.test_id) || fallbackTestId,
    test,
  };
  if (jsonOutput) {
    outputJson(result);
    return;
  }
  printSuccess(title, {
    "Test ID": result.test_id || "(not returned)",
    Name: stringValue(test.name) || "(not returned)",
    "Test Suite": stringValue(test.test_suite) || "(none)",
  });
}

function presentTestList(title: string, result: AiAssistantTestListResult, jsonOutput: boolean): void {
  if (jsonOutput) {
    outputJson(result);
    return;
  }
  printSuccess(title, { Count: result.count });
  for (const test of result.tests) {
    const id = stringValue(test.id) || stringValue(test.test_id) || "(unknown)";
    console.log(`  • ${stringValue(test.name) || id} — ${id}`);
  }
  if (result.count === 0) console.log("  (no AI assistant tests returned)");
  console.log();
}

function presentVersion(
  title: string,
  assistantId: string,
  response: unknown,
  jsonOutput: boolean,
  fallbackVersionId = "",
): void {
  const version = responseDataRecord(response);
  const result: AiAssistantVersionResult = {
    assistant_id: assistantId,
    version_id: stringValue(version.id) || stringValue(version.version_id) || fallbackVersionId,
    version,
  };
  if (jsonOutput) {
    outputJson(result);
    return;
  }
  printSuccess(title, {
    "Assistant ID": assistantId,
    "Version ID": result.version_id || "(not returned)",
    Name: stringValue(version.name) || stringValue(version.version_name) || "(not returned)",
  });
}

function addTestChannelFlag(args: string[], flags: Flags, jsonOutput: boolean): void {
  const value = flags["telnyx-conversation-channel"];
  if (value === undefined) return;
  if (
    typeof value !== "string"
    || !["phone_call", "web_call", "sms_chat", "web_chat"].includes(value)
  ) {
    fail("--telnyx-conversation-channel must be one of: phone_call, web_call, sms_chat, web_chat", jsonOutput);
  }
  args.push("--telnyx-conversation-channel", value);
}

function addAssistantFields(
  args: string[],
  flags: Flags,
  jsonOutput: boolean,
  requestBody?: JsonRecord,
  occurrences: Occurrences = {},
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
  addRepeatableJsonObjectOrClearFlag(
    args,
    flags,
    occurrences,
    "a2a-agent",
    "--a2a-agent",
    "clear-a2a-agents",
    "a2a_agents",
    requestBody,
    jsonOutput,
  );
  addRequiredStringFlag(
    args,
    flags,
    "fallback-destination",
    "--telephony-settings.fallback-destination",
    jsonOutput,
  );
  addMappedFlag(args, flags, "voice", "--voice-settings.voice");
  addMappedFlag(args, flags, "transcription-model", "--transcription.model");
  addMappedFlag(args, flags, "transcription-language", "--transcription.language");
}

function usesAiAssistantV032Controls(flags: Flags): boolean {
  return flags["a2a-agent"] !== undefined
    || flags["clear-a2a-agents"] !== undefined
    || flags["fallback-destination"] !== undefined;
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

function addOptionalStringFlag(
  args: string[],
  flags: Flags,
  source: string,
  target: string,
  jsonOutput: boolean,
): void {
  const value = flags[source];
  if (value === undefined) return;
  if (typeof value !== "string") fail(`--${source} requires a value`, jsonOutput);
  args.push(target, value);
}

function addRequiredStringFlag(
  args: string[],
  flags: Flags,
  source: string,
  target: string,
  jsonOutput: boolean,
): void {
  const value = flags[source];
  if (value === undefined) return;
  if (typeof value !== "string" || value.length === 0) {
    fail(`--${source} requires a non-empty value`, jsonOutput);
  }
  args.push(target, value);
}

function addJsonObjectArrayFlag(
  args: string[],
  flags: Flags,
  source: string,
  target: string,
  required: boolean,
  jsonOutput: boolean,
): void {
  const value = optionalStringFlag(flags, source);
  if (value === undefined) {
    if (required) fail(`--${source} is required and must be a JSON array of objects`, jsonOutput);
    if (flags[source] !== undefined) fail(`--${source} must be a JSON array of objects`, jsonOutput);
    return;
  }
  let entries: unknown[];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed) || parsed.length === 0 || parsed.some(
      (item) => !item || typeof item !== "object" || Array.isArray(item),
    )) throw new Error();
    entries = parsed;
  } catch {
    fail(`--${source} must be a non-empty JSON array of objects`, jsonOutput);
  }
  for (const entry of entries) args.push(target, JSON.stringify(entry));
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

function addRepeatableJsonObjectOrClearFlag(
  args: string[],
  flags: Flags,
  occurrences: Occurrences,
  source: string,
  target: string,
  clearSource: string,
  bodyField: string,
  requestBody: JsonRecord | undefined,
  jsonOutput: boolean,
): void {
  const values = occurrences[source] ?? (flags[source] === undefined ? [] : [flags[source]]);
  const clearValue = flags[clearSource];
  if (clearValue !== undefined) {
    if (clearValue !== true) {
      fail(`--${clearSource} is a boolean flag and does not take a value`, jsonOutput);
    }
    if (!requestBody) {
      fail(`--${clearSource} is only valid for update-ai-assistant`, jsonOutput);
    }
    if (values.length > 0) {
      fail(`--${source} and --${clearSource} cannot be used together`, jsonOutput);
    }
    requestBody[bodyField] = [];
    return;
  }

  for (const value of values) {
    if (typeof value !== "string") {
      fail(`--${source} must be a JSON object`, jsonOutput);
    }
    try {
      const parsed = JSON.parse(value);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    } catch {
      fail(`--${source} must be a JSON object`, jsonOutput);
    }
    // Preserve the supplied JSON exactly for the generated CLI's repeatable flag.
    args.push(target, value);
  }
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
  if (value === undefined) {
    if (flags[source] !== undefined) fail(`--${source} must be a positive integer`, jsonOutput);
    return;
  }
  if (!/^\d+$/.test(value) || Number(value) < 1) {
    fail(`--${source} must be a positive integer`, jsonOutput);
  }
  args.push(target, value);
}

function addMaxItemsFlag(args: string[], flags: Flags, jsonOutput: boolean): number | undefined {
  const value = optionalStringFlag(flags, "max-items");
  if (value === undefined) {
    if (flags["max-items"] !== undefined) fail("--max-items must be -1 or a non-negative integer", jsonOutput);
    return undefined;
  }
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
