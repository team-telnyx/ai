/**
 * Shared AI tool, assistant-tool membership, and MCP-server actions backed by
 * the Stainless-generated Telnyx Go CLI.
 */

import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { outputJson, printError, printSuccess } from "../utils/output.ts";

type Flags = Record<string, string | boolean>;
type JsonRecord = Record<string, unknown>;

const AI_TOOL_MINIMUM_CLI_VERSION = "0.36.0";
const AI_TOOL_CLI_OPTIONS = { minimumVersion: AI_TOOL_MINIMUM_CLI_VERSION };

interface ResourceResult {
  id: string;
  resource: JsonRecord;
}

interface ResourceListResult {
  count: number;
  resources: JsonRecord[];
  meta: JsonRecord;
}

export async function createAiToolCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const displayName = requiredStringFlag(flags, "display-name", jsonOutput);
  const type = requiredStringFlag(flags, "type", jsonOutput);
  const args = ["ai:tools", "create", "--display-name", displayName, "--type", type];
  addAiToolFields(args, flags, jsonOutput, true);

  try {
    const response = await telnyxCli(args, AI_TOOL_CLI_OPTIONS);
    presentResource("AI tool created!", "tool_id", "ai_tool", normalizeResource(response), jsonOutput);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function getAiToolCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const toolId = requiredStringFlag(flags, "tool-id", jsonOutput);

  try {
    const response = await telnyxCli(["ai:tools", "retrieve", "--tool-id", toolId], AI_TOOL_CLI_OPTIONS);
    presentResource("AI tool retrieved!", "tool_id", "ai_tool", normalizeResource(response, toolId), jsonOutput);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function updateAiToolCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const toolId = requiredStringFlag(flags, "tool-id", jsonOutput);
  const args = ["ai:tools", "update", "--tool-id", toolId];
  addAiToolFields(args, flags, jsonOutput, false);
  if (args.length === 4) fail("at least one AI tool field must be supplied for update", jsonOutput);

  try {
    const response = await telnyxCli(args, AI_TOOL_CLI_OPTIONS);
    presentResource("AI tool updated!", "tool_id", "ai_tool", normalizeResource(response, toolId), jsonOutput);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function listAiToolsCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const args = ["ai:tools", "list"];
  addOptionalStringFlag(args, flags, "filter-name", "--filter-name", jsonOutput);
  addOptionalStringFlag(args, flags, "filter-type", "--filter-type", jsonOutput);
  addPositiveIntegerFlag(args, flags, "page-number", "--page-number", jsonOutput);
  addPositiveIntegerFlag(args, flags, "page-size", "--page-size", jsonOutput);
  const maxItems = addMaxItemsFlag(args, flags, jsonOutput);

  try {
    const result = normalizeList(await telnyxCli(args, { ...AI_TOOL_CLI_OPTIONS, format: "raw" }), maxItems);
    presentList("AI tools retrieved!", "ai_tools", result, jsonOutput);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function deleteAiToolCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const toolId = requiredStringFlag(flags, "tool-id", jsonOutput);
  requireConfirm(flags, "delete an AI tool", jsonOutput);

  try {
    await telnyxCli(["ai:tools", "delete", "--tool-id", toolId], AI_TOOL_CLI_OPTIONS);
    presentDeleted("tool_id", toolId, "AI tool deleted!", jsonOutput);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function addAiAssistantToolCommand(flags: Flags): Promise<void> {
  return changeAiAssistantToolMembership(flags, "add", "attached");
}

export async function removeAiAssistantToolCommand(flags: Flags): Promise<void> {
  return changeAiAssistantToolMembership(flags, "remove", "removed");
}

async function changeAiAssistantToolMembership(
  flags: Flags,
  action: "add" | "remove",
  status: "attached" | "removed",
): Promise<void> {
  const jsonOutput = flags.json === true;
  const assistantId = requiredStringFlag(flags, "assistant-id", jsonOutput);
  const toolId = requiredStringFlag(flags, "tool-id", jsonOutput);

  try {
    const response = await telnyxCli([
      "ai:assistants:tools", action,
      "--assistant-id", assistantId,
      "--tool-id", toolId,
    ], AI_TOOL_CLI_OPTIONS);
    const result = {
      assistant_id: assistantId,
      tool_id: toolId,
      [status]: true,
      assistant_tool: responseDataRecord(response),
    };
    if (jsonOutput) outputJson(result);
    else printSuccess(`AI tool ${status} to assistant!`, {
      "Assistant ID": assistantId,
      "Tool ID": toolId,
    });
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function createAiMcpServerCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const name = requiredStringFlag(flags, "name", jsonOutput);
  const type = requiredStringFlag(flags, "type", jsonOutput);
  const url = requiredStringFlag(flags, "url", jsonOutput);
  const args = ["ai:mcp-servers", "create", "--name", name, "--type", type, "--url", url];
  addMcpServerFields(args, flags, jsonOutput, true);

  try {
    const response = await telnyxCli(args, AI_TOOL_CLI_OPTIONS);
    presentResource("AI MCP server created!", "mcp_server_id", "ai_mcp_server", normalizeResource(response), jsonOutput);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function getAiMcpServerCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const mcpServerId = requiredStringFlag(flags, "mcp-server-id", jsonOutput);

  try {
    const response = await telnyxCli(["ai:mcp-servers", "retrieve", "--mcp-server-id", mcpServerId], AI_TOOL_CLI_OPTIONS);
    presentResource("AI MCP server retrieved!", "mcp_server_id", "ai_mcp_server", normalizeResource(response, mcpServerId), jsonOutput);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function updateAiMcpServerCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const mcpServerId = requiredStringFlag(flags, "mcp-server-id", jsonOutput);
  const args = ["ai:mcp-servers", "update", "--mcp-server-id", mcpServerId];
  addMcpServerFields(args, flags, jsonOutput, false);
  if (args.length === 4) fail("at least one AI MCP server field must be supplied for update", jsonOutput);

  try {
    const response = await telnyxCli(args, AI_TOOL_CLI_OPTIONS);
    presentResource("AI MCP server updated!", "mcp_server_id", "ai_mcp_server", normalizeResource(response, mcpServerId), jsonOutput);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function listAiMcpServersCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const args = ["ai:mcp-servers", "list"];
  addPositiveIntegerFlag(args, flags, "page-number", "--page-number", jsonOutput);
  addPositiveIntegerFlag(args, flags, "page-size", "--page-size", jsonOutput);
  addOptionalStringFlag(args, flags, "type", "--type", jsonOutput);
  addOptionalStringFlag(args, flags, "url", "--url", jsonOutput);
  const maxItems = addMaxItemsFlag(args, flags, jsonOutput);

  try {
    const result = normalizeList(await telnyxCli(args, { ...AI_TOOL_CLI_OPTIONS, format: "raw" }), maxItems);
    presentList("AI MCP servers retrieved!", "ai_mcp_servers", result, jsonOutput);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function deleteAiMcpServerCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const mcpServerId = requiredStringFlag(flags, "mcp-server-id", jsonOutput);
  requireConfirm(flags, "delete an AI MCP server", jsonOutput);

  try {
    await telnyxCli(["ai:mcp-servers", "delete", "--mcp-server-id", mcpServerId], AI_TOOL_CLI_OPTIONS);
    presentDeleted("mcp_server_id", mcpServerId, "AI MCP server deleted!", jsonOutput);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

function addAiToolFields(args: string[], flags: Flags, jsonOutput: boolean, creating: boolean): void {
  if (!creating) {
    addOptionalStringFlag(args, flags, "display-name", "--display-name", jsonOutput);
    addOptionalStringFlag(args, flags, "type", "--type", jsonOutput);
  }
  for (const name of [
    "client-side-tool", "function", "handoff", "invite", "pay", "retrieval",
    "update-dynamic-variables", "vision", "webhook",
  ]) {
    addJsonObjectFlag(args, flags, name, `--${name}`, jsonOutput);
  }
  addNonNegativeIntegerFlag(args, flags, "timeout-ms", "--timeout-ms", jsonOutput);
  if (creating) addOptionalStringFlag(args, flags, "idempotency-key", "--idempotency-key", jsonOutput);
}

function addMcpServerFields(args: string[], flags: Flags, jsonOutput: boolean, creating: boolean): void {
  if (!creating) {
    addOptionalStringFlag(args, flags, "id", "--id", jsonOutput);
    addValueFlag(args, flags, "created-at", "--created-at", jsonOutput);
    addOptionalStringFlag(args, flags, "name", "--name", jsonOutput);
    addOptionalStringFlag(args, flags, "type", "--type", jsonOutput);
    addOptionalStringFlag(args, flags, "url", "--url", jsonOutput);
  }
  addValueFlag(args, flags, "allowed-tool", "--allowed-tool", jsonOutput);
  addOptionalStringFlag(args, flags, "api-key-ref", "--api-key-ref", jsonOutput, true);
  if (creating) addOptionalStringFlag(args, flags, "idempotency-key", "--idempotency-key", jsonOutput);
}

function normalizeResource(response: unknown, fallbackId = ""): ResourceResult {
  const resource = responseDataRecord(response);
  return { id: stringValue(resource.id) || fallbackId, resource };
}

function normalizeList(response: unknown, maxItems: number | undefined): ResourceListResult {
  const envelope = asRecord(response);
  const allResources = Array.isArray(response) ? response : envelope.data;
  const resources = (Array.isArray(allResources) ? allResources : [])
    .filter((item): item is JsonRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item));
  const selected = maxItems === undefined || maxItems === -1 ? resources : resources.slice(0, maxItems);
  return { count: selected.length, resources: selected, meta: asRecord(envelope.meta) };
}

function presentResource(
  title: string,
  idKey: "tool_id" | "mcp_server_id",
  resourceKey: "ai_tool" | "ai_mcp_server",
  normalized: ResourceResult,
  jsonOutput: boolean,
): void {
  const result = { [idKey]: normalized.id, [resourceKey]: normalized.resource };
  if (jsonOutput) outputJson(result);
  else printSuccess(title, { [idKey === "tool_id" ? "Tool ID" : "MCP Server ID"]: normalized.id || "(not returned)" });
}

function presentList(title: string, resourceKey: "ai_tools" | "ai_mcp_servers", list: ResourceListResult, jsonOutput: boolean): void {
  const result = { count: list.count, [resourceKey]: list.resources, meta: list.meta };
  if (jsonOutput) {
    outputJson(result);
    return;
  }
  printSuccess(title, { Count: list.count });
  for (const resource of list.resources) {
    console.log(`  • ${stringValue(resource.name) || stringValue(resource.display_name) || "(unnamed)"} — ${stringValue(resource.id) || "(unknown)"}`);
  }
  if (list.count === 0) console.log("  (no resources returned)");
  console.log();
}

function presentDeleted(idKey: "tool_id" | "mcp_server_id", id: string, title: string, jsonOutput: boolean): void {
  const result = { [idKey]: id, deleted: true };
  if (jsonOutput) outputJson(result);
  else printSuccess(title, { [idKey === "tool_id" ? "Tool ID" : "MCP Server ID"]: id });
}

function requireConfirm(flags: Flags, action: string, jsonOutput: boolean): void {
  if (flags.confirm !== true && flags.confirm !== "true") fail(`--confirm is required to ${action}`, jsonOutput);
}

function requiredStringFlag(flags: Flags, key: string, jsonOutput: boolean): string {
  const value = optionalStringFlag(flags, key);
  if (!value) fail(`--${key} is required`, jsonOutput);
  return value;
}

function addOptionalStringFlag(
  args: string[], flags: Flags, source: string, target: string, jsonOutput: boolean, allowEmpty = false,
): void {
  const value = flags[source];
  if (value === undefined) return;
  if (typeof value !== "string" || (!allowEmpty && value.length === 0)) fail(`--${source} requires a value`, jsonOutput);
  args.push(target, value);
}

function addJsonObjectFlag(args: string[], flags: Flags, source: string, target: string, jsonOutput: boolean): void {
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

function addValueFlag(args: string[], flags: Flags, source: string, target: string, jsonOutput: boolean): void {
  const value = optionalStringFlag(flags, source);
  if (value === undefined) return;
  if (value.length === 0) fail(`--${source} requires a value`, jsonOutput);
  args.push(target, value);
}

function addPositiveIntegerFlag(args: string[], flags: Flags, source: string, target: string, jsonOutput: boolean): void {
  const value = optionalStringFlag(flags, source);
  if (value === undefined) return;
  if (!/^\d+$/.test(value) || Number(value) < 1) fail(`--${source} must be a positive integer`, jsonOutput);
  args.push(target, value);
}

function addNonNegativeIntegerFlag(args: string[], flags: Flags, source: string, target: string, jsonOutput: boolean): void {
  const value = optionalStringFlag(flags, source);
  if (value === undefined) return;
  if (!/^\d+$/.test(value)) fail(`--${source} must be a non-negative integer`, jsonOutput);
  args.push(target, value);
}

function addMaxItemsFlag(args: string[], flags: Flags, jsonOutput: boolean): number | undefined {
  const value = optionalStringFlag(flags, "max-items");
  if (value === undefined) return undefined;
  if (!/^(?:-1|\d+)$/.test(value)) fail("--max-items must be -1 or a non-negative integer", jsonOutput);
  args.push("--max-items", value);
  return Number(value);
}

function optionalStringFlag(flags: Flags, key: string): string | undefined {
  return typeof flags[key] === "string" ? flags[key] : undefined;
}

function responseDataRecord(response: unknown): JsonRecord {
  const envelope = asRecord(response);
  return asRecord(envelope.data ?? response);
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
