/**
 * Agent Gateway lifecycle and configuration wrappers backed by the
 * Stainless-generated Telnyx Go CLI.
 *
 * The wrapper deliberately preserves the generated CLI's resource and flag
 * spellings. It adds only local input validation and an explicit --confirm
 * acknowledgement for destructive actions.
 */

import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { failWith, outputJson, printError, printSuccess } from "../utils/output.ts";

type Flags = Record<string, string | boolean>;
type Occurrences = Record<string, Array<string | boolean>>;
type GatewayAction =
  | "create"
  | "get"
  | "list"
  | "delete"
  | "retrieve-models"
  | "api-create"
  | "api-update"
  | "api-list"
  | "api-delete"
  | "mcp-server-create"
  | "mcp-server-update"
  | "mcp-server-list"
  | "mcp-server-delete";

// Agent Gateway resources were added after the v0.32 CLI bundled with this
// package, so every generated Agent Gateway action must verify its CLI first.
const MINIMUM_CLI_VERSION = "0.37.0";

const ACTIONS: Record<GatewayAction, { command: string[]; list?: boolean; destructive?: boolean }> = {
  create: { command: ["agent-gateways", "create"] },
  get: { command: ["agent-gateways", "retrieve"] },
  list: { command: ["agent-gateways", "list"], list: true },
  delete: { command: ["agent-gateways", "delete"], destructive: true },
  "retrieve-models": { command: ["agent-gateways", "retrieve-models"] },
  "api-create": { command: ["agent-gateways:apis", "create"] },
  "api-update": { command: ["agent-gateways:apis", "update"] },
  "api-list": { command: ["agent-gateways:apis", "list"], list: true },
  "api-delete": { command: ["agent-gateways:apis", "delete"], destructive: true },
  "mcp-server-create": { command: ["agent-gateways:mcp-servers", "create"] },
  "mcp-server-update": { command: ["agent-gateways:mcp-servers", "update"] },
  "mcp-server-list": { command: ["agent-gateways:mcp-servers", "list"], list: true },
  "mcp-server-delete": { command: ["agent-gateways:mcp-servers", "delete"], destructive: true },
};

export const createAgentGatewayCommand = commandFor("create");
export const getAgentGatewayCommand = commandFor("get");
export const listAgentGatewaysCommand = commandFor("list");
export const deleteAgentGatewayCommand = commandFor("delete");
export const retrieveAgentGatewayModelsCommand = commandFor("retrieve-models");
export const createAgentGatewayApiCommand = commandFor("api-create");
export const updateAgentGatewayApiCommand = commandFor("api-update");
export const listAgentGatewayApisCommand = commandFor("api-list");
export const deleteAgentGatewayApiCommand = commandFor("api-delete");
export const createAgentGatewayMcpServerCommand = commandFor("mcp-server-create");
export const updateAgentGatewayMcpServerCommand = commandFor("mcp-server-update");
export const listAgentGatewayMcpServersCommand = commandFor("mcp-server-list");
export const deleteAgentGatewayMcpServerCommand = commandFor("mcp-server-delete");

function commandFor(action: GatewayAction): (flags: Flags, occurrences?: Occurrences) => Promise<void> {
  return async (flags, occurrences = {}) => {
    const jsonOutput = flags.json === true;
    const definition = ACTIONS[action];
    const args = [...definition.command];

    try {
      appendActionFlags(action, args, flags, occurrences, jsonOutput);
      if (definition.destructive && !isTrue(flags.confirm)) {
        failWith("--confirm is required to delete an Agent Gateway resource", jsonOutput);
      }

      const response = await telnyxCli(args, {
        minimumVersion: MINIMUM_CLI_VERSION,
        ...(definition.list ? { format: "raw" } : {}),
      });
      if (jsonOutput) {
        outputJson(response);
      } else {
        printSuccess("Agent Gateway request completed!", { Action: action });
      }
    } catch (err) {
      failWith(errorMessage(err), jsonOutput);
    }
  };
}

function appendActionFlags(
  action: GatewayAction,
  args: string[],
  flags: Flags,
  occurrences: Occurrences,
  jsonOutput: boolean,
): void {
  switch (action) {
    case "create":
      appendRequired(args, flags, "wireguard-interface-id", jsonOutput);
      appendOptional(args, flags, "name", jsonOutput);
      return;
    case "get":
    case "delete":
    case "retrieve-models":
      appendRequired(args, flags, "instance-id", jsonOutput);
      return;
    case "list":
      appendOptional(args, flags, "page-number", jsonOutput);
      appendOptional(args, flags, "page-size", jsonOutput);
      appendOptional(args, flags, "max-items", jsonOutput);
      return;
    case "api-create":
      appendRequired(args, flags, "instance-id", jsonOutput);
      appendRequired(args, flags, "name", jsonOutput);
      appendRequired(args, flags, "spec-url", jsonOutput);
      appendGatewayConfigFields(args, flags, occurrences, jsonOutput);
      return;
    case "api-update":
      appendRequired(args, flags, "instance-id", jsonOutput);
      appendRequired(args, flags, "api-id", jsonOutput);
      appendGatewayConfigFields(args, flags, occurrences, jsonOutput, true);
      return;
    case "api-list":
      appendRequired(args, flags, "instance-id", jsonOutput);
      return;
    case "api-delete":
      appendRequired(args, flags, "instance-id", jsonOutput);
      appendRequired(args, flags, "api-id", jsonOutput);
      return;
    case "mcp-server-create":
      appendRequired(args, flags, "instance-id", jsonOutput);
      appendRequired(args, flags, "name", jsonOutput);
      appendRequired(args, flags, "url", jsonOutput);
      appendGatewayConfigFields(args, flags, occurrences, jsonOutput);
      appendOptional(args, flags, "transport", jsonOutput);
      return;
    case "mcp-server-update":
      appendRequired(args, flags, "instance-id", jsonOutput);
      appendRequired(args, flags, "server-id", jsonOutput);
      appendGatewayConfigFields(args, flags, occurrences, jsonOutput);
      appendOptional(args, flags, "transport", jsonOutput);
      appendOptional(args, flags, "url", jsonOutput);
      return;
    case "mcp-server-list":
      appendRequired(args, flags, "instance-id", jsonOutput);
      return;
    case "mcp-server-delete":
      appendRequired(args, flags, "instance-id", jsonOutput);
      appendRequired(args, flags, "server-id", jsonOutput);
      return;
  }
}

function appendGatewayConfigFields(
  args: string[],
  flags: Flags,
  occurrences: Occurrences,
  jsonOutput: boolean,
  includeSpecUrl = false,
): void {
  appendJsonObject(args, flags, "auth", jsonOutput);
  appendOptional(args, flags, "base-url", jsonOutput);
  appendRepeated(args, flags, occurrences, "forwarded-header", jsonOutput);
  appendBoolean(args, flags, "open-to-every-key", jsonOutput);
  if (includeSpecUrl) appendOptional(args, flags, "name", jsonOutput);
  if (includeSpecUrl) appendOptional(args, flags, "spec-url", jsonOutput);
  appendJsonObject(args, flags, "static-headers", jsonOutput);
  appendRepeated(args, flags, occurrences, "tool", jsonOutput);
}

function appendRequired(args: string[], flags: Flags, name: string, jsonOutput: boolean): void {
  const value = stringFlag(flags, name);
  if (!value) failWith(`--${name} is required`, jsonOutput);
  args.push(`--${name}`, value);
}

function appendOptional(args: string[], flags: Flags, name: string, jsonOutput: boolean): void {
  const value = flags[name];
  if (value === undefined) return;
  if (typeof value !== "string" || value.length === 0) {
    failWith(`--${name} requires a value`, jsonOutput);
  }
  args.push(`--${name}`, value);
}

function appendRepeated(
  args: string[], flags: Flags, occurrences: Occurrences, name: string, jsonOutput: boolean,
): void {
  const values = occurrences[name] ?? (flags[name] === undefined ? [] : [flags[name]]);
  for (const value of values) {
    if (typeof value !== "string" || value.length === 0) {
      failWith(`--${name} requires a value`, jsonOutput);
    }
    args.push(`--${name}`, value);
  }
}

function appendJsonObject(args: string[], flags: Flags, name: string, jsonOutput: boolean): void {
  const value = flags[name];
  if (value === undefined) return;
  if (typeof value !== "string") failWith(`--${name} must be a JSON object`, jsonOutput);
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
  } catch {
    failWith(`--${name} must be a JSON object`, jsonOutput);
  }
  args.push(`--${name}`, value);
}

function appendBoolean(args: string[], flags: Flags, name: string, jsonOutput: boolean): void {
  const value = flags[name];
  if (value === undefined) return;
  if (value !== true && value !== false) {
    failWith(`--${name} must be true or false`, jsonOutput);
  }
  args.push(`--${name}`, String(value));
}

function stringFlag(flags: Flags, name: string): string | undefined {
  const value = flags[name];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function isTrue(value: string | boolean | undefined): boolean {
  return value === true || value === "true";
}

function errorMessage(err: unknown): string {
  if (err instanceof TelnyxCLIError) return err.stderr || err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}
