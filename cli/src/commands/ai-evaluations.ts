/**
 * AI evaluator workflow actions backed by the Telnyx Go CLI v0.35+ test framework.
 *
 * These commands deliberately cover the operational evaluation loop rather than
 * administrative CRUD: choose a caller personality, connect an assistant to a
 * test agent, define or generate scenarios, run them, and inspect/rerun batches.
 */
import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { failWith, outputJson, printError, printSuccess } from "../utils/output.ts";

type Flags = Record<string, string | boolean>;
type Occurrences = Record<string, Array<string | boolean>>;
type JsonRecord = Record<string, unknown>;

const MINIMUM_CLI_VERSION = "0.35.0";
const ROOT = "ai:tests:test-framework:v1";
const AGENTS = `${ROOT}:aiagents`;
const SCENARIOS = `${ROOT}:scenarios`;
const RESULTS = `${ROOT}:results`;
const METRICS = `${ROOT}:metrics`;

export async function listAiEvaluationPersonalitiesCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  try {
    const response = await run([ROOT, "retrieve-personalities"]);
    const data = responseData(response);
    const personalities = Array.isArray(data) ? data : Array.isArray(asRecord(data).personalities)
      ? asRecord(data).personalities as unknown[]
      : Array.isArray(asRecord(response).personalities) ? asRecord(response).personalities as unknown[] : [];
    const result = { count: personalities.length, personalities };
    if (jsonOutput) outputJson(result);
    else printSuccess("Evaluation personalities retrieved!", { Count: result.count });
  } catch (err) {
    fail(errorMessage(err), jsonOutput);
  }
}

export async function createAiEvaluationAgentCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const agentName = requiredString(flags, "agent-name", jsonOutput);
  const assistantId = requiredString(flags, "assistant-id", jsonOutput);
  const args = [AGENTS, "create", "--agent-name", agentName, "--assistant-id", assistantId];
  addOptionalString(args, flags, "description");
  addOptionalString(args, flags, "contact-number");
  addOptionalString(args, flags, "language");
  addOptionalString(args, flags, "llm-model");
  addOptionalString(args, flags, "llm-system-prompt");
  addOptionalString(args, flags, "sip-endpoint");
  addPositiveInteger(args, flags, "llm-max-tokens", jsonOutput);
  addNumber(args, flags, "llm-temperature", jsonOutput);
  addBoolean(args, flags, "inbound", jsonOutput);
  addBoolean(args, flags, "outbound-auto-call", jsonOutput);
  addBoolean(args, flags, "auto-fetch-calls-enabled", jsonOutput);
  addBoolean(args, flags, "auto-sync-prompt-enabled", jsonOutput);
  addBoolean(args, flags, "auto-update-dropoff-nodes", jsonOutput);
  addBoolean(args, flags, "auto-update-topic-nodes", jsonOutput);
  await executeObject("Evaluation agent created!", args, jsonOutput, "evaluation_agent");
}

export async function createAiEvaluationScenarioCommand(flags: Flags, occurrences: Occurrences = {}): Promise<void> {
  const jsonOutput = flags.json === true;
  const name = requiredString(flags, "name", jsonOutput);
  const personalityId = requiredPositiveInteger(flags, "personality-id", jsonOutput);
  const agentId = requiredPositiveInteger(flags, "agent-id", jsonOutput);
  const args = [
    SCENARIOS, "create",
    "--name", name,
    "--personality", personalityId,
    "--agent", agentId,
  ];
  addOptionalString(args, flags, "expected-outcome-prompt");
  addOptionalString(args, flags, "first-message");
  addOptionalString(args, flags, "instructions");
  addOptionalString(args, flags, "folder-path");
  addPositiveInteger(args, flags, "test-profile", jsonOutput);
  addRepeatedPositiveIntegers(args, flags, occurrences, "metric-id", "--metric", jsonOutput);
  addRepeatedStrings(args, flags, occurrences, "tag", "--tag", jsonOutput);
  await executeObject("Evaluation scenario created!", args, jsonOutput, "evaluation_scenario");
}

export async function generateAiEvaluationScenariosCommand(flags: Flags, occurrences: Occurrences = {}): Promise<void> {
  const jsonOutput = flags.json === true;
  const agentId = requiredPositiveInteger(flags, "agent-id", jsonOutput);
  const numScenarios = requiredPositiveInteger(flags, "num-scenarios", jsonOutput);
  const args = [SCENARIOS, "generate-bg", "--agent-id", agentId, "--num-scenarios", numScenarios];
  addOptionalString(args, flags, "extra-instructions");
  addOptionalString(args, flags, "first-message");
  addOptionalString(args, flags, "folder-path");
  addOptionalString(args, flags, "scenario-type");
  addPositiveInteger(args, flags, "inbound-phone-number", jsonOutput);
  addPositiveInteger(args, flags, "test-profile", jsonOutput);
  addBoolean(args, flags, "generate-expected-outcomes", jsonOutput);
  addRepeatedPositiveIntegers(args, flags, occurrences, "personality-id", "--personality", jsonOutput);
  addRepeatedStrings(args, flags, occurrences, "tag", "--tag", jsonOutput);
  addRepeatedStrings(args, flags, occurrences, "tool-id", "--tool-id", jsonOutput);
  await executeObject("Evaluation scenario generation started!", args, jsonOutput, "generation");
}

export async function getAiEvaluationScenarioGenerationProgressCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const progressId = requiredString(flags, "progress-id", jsonOutput);
  const args = [SCENARIOS, "retrieve-generate-progress", "--progress-id", progressId];
  await executeObject("Evaluation scenario generation progress retrieved!", args, jsonOutput, "progress", { progress_id: progressId });
}

export async function runAiEvaluationScenariosCommand(flags: Flags, occurrences: Occurrences = {}): Promise<void> {
  const jsonOutput = flags.json === true;
  const agentId = requiredPositiveInteger(flags, "agent-id", jsonOutput);
  const scenarios = scenarioSelection(flags, jsonOutput);
  const args = [SCENARIOS, "run-scenarios", "--agent-id", agentId, "--scenarios", scenarios];
  addOptionalString(args, flags, "name");
  addOptionalString(args, flags, "agent-number");
  addOptionalString(args, flags, "assistant-id");
  addOptionalString(args, flags, "outbound-phone-number");
  addEnum(args, flags, "mode", ["same_number", "different_numbers"], jsonOutput);
  addPositiveInteger(args, flags, "concurrency-limit", jsonOutput);
  addPositiveInteger(args, flags, "frequency", jsonOutput);
  addRepeatedPositiveIntegers(args, flags, occurrences, "personality-id", "--personality-id", jsonOutput);
  addRepeatedPositiveIntegers(args, flags, occurrences, "test-profile-id", "--test-profile-id", jsonOutput);
  addRepeatedStrings(args, flags, occurrences, "tag", "--tag", jsonOutput);
  await executeObject("Evaluation scenarios started!", args, jsonOutput, "run");
}

export async function getAiEvaluationResultCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const resultId = requiredPositiveInteger(flags, "result-id", jsonOutput);
  const args = [RESULTS, "retrieve", "--id", resultId];
  await executeObject("Evaluation result retrieved!", args, jsonOutput, "result", { result_id: resultId });
}

export async function listAiEvaluationResultsCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const args = [RESULTS, "list"];
  addPositiveInteger(args, flags, "agent-id", jsonOutput);
  addPositiveInteger(args, flags, "page", jsonOutput);
  addPositiveInteger(args, flags, "page-size", jsonOutput);
  addOptionalString(args, flags, "search");
  addCsvPositiveIntegers(args, flags, "scenario-ids", "--scenarios", jsonOutput);

  try {
    const response = await run(args, "raw");
    const envelope = asRecord(response);
    const data = Array.isArray(response) ? response : envelope.data;
    const results = Array.isArray(data) ? data : [];
    const result = { count: results.length, results, meta: asRecord(envelope.meta) };
    if (jsonOutput) outputJson(result);
    else printSuccess("Evaluation result batches retrieved!", { Count: result.count });
  } catch (err) {
    fail(errorMessage(err), jsonOutput);
  }
}

export async function rerunAiEvaluationResultCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const resultId = requiredPositiveInteger(flags, "result-id", jsonOutput);
  const args = [RESULTS, "rerun", "--id", resultId];
  await executeObject("Evaluation result batch rerun started!", args, jsonOutput, "run", { source_result_id: resultId });
}

export async function createAiEvaluationMetricCommand(flags: Flags, occurrences: Occurrences = {}): Promise<void> {
  const jsonOutput = flags.json === true;
  const name = requiredString(flags, "name", jsonOutput);
  const args = [METRICS, "create", "--name", name];
  addOptionalString(args, flags, "description");
  addOptionalString(args, flags, "prompt");
  addEnum(args, flags, "type", ["custom_code", "llm_judge"], jsonOutput);
  addEnum(args, flags, "eval-type", ["numeric", "continuous_qualitative", "binary_workflow_adherence"], jsonOutput);
  addPositiveInteger(args, flags, "display-order", jsonOutput);
  addOptionalString(args, flags, "assistant-id");
  addRepeatedPositiveIntegers(args, flags, occurrences, "agent-id", "--agent", jsonOutput);
  addRepeatedStrings(args, flags, occurrences, "enum-value", "--enum-value", jsonOutput);
  addBoolean(args, flags, "add-to-new-agents", jsonOutput);
  addBoolean(args, flags, "audio-enabled", jsonOutput);
  addBoolean(args, flags, "observability-enabled", jsonOutput);
  addBoolean(args, flags, "sampling-enabled", jsonOutput);
  addBoolean(args, flags, "simulation-enabled", jsonOutput);
  await executeObject("Evaluation metric created!", args, jsonOutput, "metric");
}

export async function generateAiEvaluationMetricsCommand(flags: Flags, occurrences: Occurrences = {}): Promise<void> {
  const jsonOutput = flags.json === true;
  const agentId = requiredPositiveInteger(flags, "agent-id", jsonOutput);
  const numMetrics = requiredPositiveInteger(flags, "num-metrics", jsonOutput);
  const args = [METRICS, "generate-metrics", "--agent-id", agentId, "--num-metrics", numMetrics];
  addRepeatedPositiveIntegers(args, flags, occurrences, "scenario-id", "--scenario", jsonOutput);
  await executeObject("Evaluation metric generation started!", args, jsonOutput, "generation");
}

export async function getAiEvaluationMetricGenerationProgressCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const progressId = requiredString(flags, "progress-id", jsonOutput);
  const args = [METRICS, "retrieve-generate-metrics-progress", "--progress-id", progressId];
  await executeObject("Evaluation metric generation progress retrieved!", args, jsonOutput, "progress", { progress_id: progressId });
}

async function executeObject(
  title: string,
  args: string[],
  jsonOutput: boolean,
  field: string,
  extra: JsonRecord = {},
): Promise<void> {
  try {
    const response = await run(args);
    const object = asRecord(responseData(response));
    const result = { ...extra, [field]: object };
    if (jsonOutput) outputJson(result);
    else printSuccess(title, { ID: stringValue(object.id) || stringValue(object.progress_id) || "(not returned)" });
  } catch (err) {
    fail(errorMessage(err), jsonOutput);
  }
}

function run(args: string[], format: "json" | "raw" = "json"): Promise<unknown> {
  return telnyxCli(args, { format, minimumVersion: MINIMUM_CLI_VERSION });
}

function requiredString(flags: Flags, key: string, jsonOutput: boolean): string {
  const value = flags[key];
  if (typeof value !== "string" || value.trim().length === 0) failWith(`--${key} is required`, jsonOutput);
  return value;
}

function requiredPositiveInteger(flags: Flags, key: string, jsonOutput: boolean): string {
  const value = flags[key];
  if (typeof value !== "string" || !isPositiveInteger(value)) {
    failWith(`--${key} is required and must be a positive integer`, jsonOutput);
  }
  return value;
}

function addOptionalString(args: string[], flags: Flags, key: string): void {
  const value = flags[key];
  if (typeof value === "string" && value.length > 0) args.push(`--${key}`, value);
  else if (value === true) failWith(`--${key} requires a value`, flags.json === true);
}

function addPositiveInteger(args: string[], flags: Flags, key: string, jsonOutput: boolean): void {
  const value = flags[key];
  if (value === undefined) return;
  if (typeof value !== "string" || !isPositiveInteger(value)) {
    failWith(`--${key} must be a positive integer`, jsonOutput);
  }
  args.push(`--${key}`, value);
}

function addNumber(args: string[], flags: Flags, key: string, jsonOutput: boolean): void {
  const value = flags[key];
  if (value === undefined) return;
  if (typeof value !== "string" || value.trim() === "" || !Number.isFinite(Number(value))) {
    failWith(`--${key} must be a finite number`, jsonOutput);
  }
  args.push(`--${key}`, value);
}

function addEnum(args: string[], flags: Flags, key: string, values: string[], jsonOutput: boolean): void {
  const value = flags[key];
  if (value === undefined) return;
  if (typeof value !== "string" || !values.includes(value)) {
    failWith(`--${key} must be one of: ${values.join(", ")}`, jsonOutput);
  }
  args.push(`--${key}`, value);
}

function addBoolean(args: string[], flags: Flags, key: string, jsonOutput: boolean): void {
  const value = flags[key];
  if (value === undefined) return;
  if (value === true || value === "true" || value === "false") {
    args.push(`--${key}=${value === true ? "true" : value}`);
    return;
  }
  failWith(`--${key} must be true or false`, jsonOutput);
}

function addRepeatedPositiveIntegers(
  args: string[], flags: Flags, occurrences: Occurrences, key: string, target: string, jsonOutput: boolean,
): void {
  for (const value of occurrences[key] ?? (flags[key] === undefined ? [] : [flags[key]])) {
    if (typeof value !== "string" || !isPositiveInteger(value)) {
      failWith(`--${key} must be a positive integer`, jsonOutput);
    }
    args.push(target, value);
  }
}

function addRepeatedStrings(
  args: string[], flags: Flags, occurrences: Occurrences, key: string, target: string, jsonOutput: boolean,
): void {
  for (const value of occurrences[key] ?? (flags[key] === undefined ? [] : [flags[key]])) {
    if (typeof value !== "string" || value.length === 0) failWith(`--${key} requires a value`, jsonOutput);
    args.push(target, value);
  }
}

function addCsvPositiveIntegers(args: string[], flags: Flags, key: string, target: string, jsonOutput: boolean): void {
  const value = flags[key];
  if (value === undefined) return;
  if (typeof value !== "string") failWith(`--${key} must be a comma-separated list of positive integers`, jsonOutput);
  const ids = value.split(",").map((id) => id.trim());
  if (ids.length === 0 || ids.some((id) => !isPositiveInteger(id))) {
    failWith(`--${key} must be a comma-separated list of positive integers`, jsonOutput);
  }
  args.push(target, ids.join(","));
}

function scenarioSelection(flags: Flags, jsonOutput: boolean): string {
  const value = flags.scenarios;
  if (typeof value !== "string" || value.length === 0) {
    failWith("--scenarios is required (a comma-separated list of positive IDs or 'all')", jsonOutput);
  }
  if (value === "all") return value;
  const ids = value.split(",").map((id) => id.trim());
  if (ids.length === 0 || ids.some((id) => !isPositiveInteger(id))) {
    failWith("--scenarios must be a comma-separated list of positive IDs or 'all'", jsonOutput);
  }
  return ids.join(",");
}

function isPositiveInteger(value: string): boolean {
  return /^\d+$/.test(value) && Number(value) > 0 && Number.isSafeInteger(Number(value));
}

function responseData(response: unknown): unknown {
  const record = asRecord(response);
  return record.data ?? response;
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function stringValue(value: unknown): string {
  return value === undefined || value === null ? "" : String(value);
}

function errorMessage(err: unknown): string {
  if (err instanceof TelnyxCLIError) return err.stderr || err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}

function fail(message: string, jsonOutput: boolean): never {
  if (jsonOutput) outputJson({ error: message });
  else printError(message);
  process.exit(1);
}
