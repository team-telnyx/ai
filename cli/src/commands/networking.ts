/**
 * Direct private-network and WireGuard lifecycle wrappers.
 *
 * These compact commands map agent-friendly flags to the generated Telnyx Go
 * CLI. JSON output deliberately preserves the generated response envelope;
 * human output is a concise summary of the same response.
 */
import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { failWith, outputJson, printError, printSuccess } from "../utils/output.ts";

type Flags = Record<string, string | boolean>;
type JsonRecord = Record<string, unknown>;

type Resource = "network" | "wireguard-interface" | "wireguard-peer";

const ACTIONS: Record<Resource, readonly string[]> = {
  network: ["create", "retrieve", "update", "list", "delete", "list-interfaces"],
  "wireguard-interface": ["create", "retrieve", "list", "delete"],
  "wireguard-peer": ["create", "retrieve", "update", "list", "delete"],
};

export async function networkCommand(flags: Flags): Promise<void> {
  await runLifecycleCommand("network", flags);
}

export async function wireguardInterfaceCommand(flags: Flags): Promise<void> {
  await runLifecycleCommand("wireguard-interface", flags);
}

export async function wireguardPeerCommand(flags: Flags): Promise<void> {
  await runLifecycleCommand("wireguard-peer", flags);
}

async function runLifecycleCommand(resource: Resource, flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const action = requiredAction(resource, flags, jsonOutput);
  const maxItems = isListAction(action) ? listMaxItems(flags, jsonOutput) : undefined;
  const args = buildArgs(resource, action, flags, jsonOutput, maxItems);

  try {
    const response = await telnyxCli(args, isListAction(action) ? { format: "raw" } : undefined);
    present(resource, action, truncateListResponse(response, maxItems), jsonOutput);
  } catch (err) {
    failWith(errorMsg(err), jsonOutput);
  }
}

function requiredAction(resource: Resource, flags: Flags, jsonOutput: boolean): string {
  const value = flags.action;
  if (typeof value !== "string" || value.length === 0) {
    failWith(`--action is required. Valid actions: ${ACTIONS[resource].join(", ")}`, jsonOutput);
  }
  if (!ACTIONS[resource].includes(value)) {
    failWith(`Unknown --action: ${value}. Valid actions: ${ACTIONS[resource].join(", ")}`, jsonOutput);
  }
  return value;
}

function buildArgs(
  resource: Resource,
  action: string,
  flags: Flags,
  jsonOutput: boolean,
  maxItems: number | undefined,
): string[] {
  switch (resource) {
    case "network":
      return buildNetworkArgs(action, flags, jsonOutput, maxItems);
    case "wireguard-interface":
      return buildWireguardInterfaceArgs(action, flags, jsonOutput, maxItems);
    case "wireguard-peer":
      return buildWireguardPeerArgs(action, flags, jsonOutput, maxItems);
  }
}

function buildNetworkArgs(action: string, flags: Flags, jsonOutput: boolean, maxItems: number | undefined): string[] {
  switch (action) {
    case "create":
      return ["networks", "create", "--network-create", JSON.stringify({ name: requiredString(flags, "name", "network name", jsonOutput) })];
    case "retrieve":
      return ["networks", "retrieve", "--id", requiredString(flags, "id", "network ID", jsonOutput)];
    case "update":
      return [
        "networks", "update",
        "--network-id", requiredString(flags, "id", "network ID", jsonOutput),
        "--network-create", JSON.stringify({ name: requiredString(flags, "name", "network name", jsonOutput) }),
      ];
    case "list":
      return addListFlags(["networks", "list"], flags, jsonOutput, { name: "--filter.name" }, maxItems);
    case "delete":
      requireBareConfirm(flags, "deleting a network", jsonOutput);
      return ["networks", "delete", "--id", requiredString(flags, "id", "network ID", jsonOutput)];
    case "list-interfaces":
      return addListFlags(
        ["networks", "list-interfaces", "--id", requiredString(flags, "id", "network ID", jsonOutput)],
        flags,
        jsonOutput,
        { name: "--filter.name", status: "--filter.status", type: "--filter.type" },
        maxItems,
      );
    default:
      throw new Error(`unsupported network action: ${action}`);
  }
}

function buildWireguardInterfaceArgs(
  action: string,
  flags: Flags,
  jsonOutput: boolean,
  maxItems: number | undefined,
): string[] {
  switch (action) {
    case "create":
      return [
        "wireguard-interfaces", "create", "--body", JSON.stringify({
          network_id: requiredString(flags, "network-id", "network ID", jsonOutput),
          region_code: requiredString(flags, "region-code", "WireGuard interface region", jsonOutput),
          name: requiredString(flags, "name", "WireGuard interface name", jsonOutput),
        }),
      ];
    case "retrieve":
      return ["wireguard-interfaces", "retrieve", "--id", requiredString(flags, "id", "WireGuard interface ID", jsonOutput)];
    case "list":
      return addListFlags(
        ["wireguard-interfaces", "list"],
        flags,
        jsonOutput,
        { "network-id": "--filter.network-id" },
        maxItems,
      );
    case "delete":
      requireBareConfirm(flags, "deleting a WireGuard interface", jsonOutput);
      return ["wireguard-interfaces", "delete", "--id", requiredString(flags, "id", "WireGuard interface ID", jsonOutput)];
    default:
      throw new Error(`unsupported WireGuard interface action: ${action}`);
  }
}

function buildWireguardPeerArgs(action: string, flags: Flags, jsonOutput: boolean, maxItems: number | undefined): string[] {
  switch (action) {
    case "create": {
      const body: JsonRecord = {
        wireguard_interface_id: requiredString(flags, "wireguard-interface-id", "WireGuard interface ID", jsonOutput),
      };
      const publicKey = optionalString(flags, "public-key", jsonOutput);
      if (publicKey !== undefined) body.public_key = publicKey;
      return ["wireguard-peers", "create", "--body", JSON.stringify(body)];
    }
    case "retrieve":
      return ["wireguard-peers", "retrieve", "--id", requiredString(flags, "id", "WireGuard peer ID", jsonOutput)];
    case "update": {
      const args = ["wireguard-peers", "update", "--id", requiredString(flags, "id", "WireGuard peer ID", jsonOutput)];
      const publicKey = optionalString(flags, "public-key", jsonOutput);
      if (publicKey !== undefined) args.push("--public-key", publicKey);
      return args;
    }
    case "list":
      return addListFlags(
        ["wireguard-peers", "list"],
        flags,
        jsonOutput,
        { "wireguard-interface-id": "--filter.wireguard-interface-id" },
        maxItems,
      );
    case "delete":
      requireBareConfirm(flags, "deleting a WireGuard peer", jsonOutput);
      return ["wireguard-peers", "delete", "--id", requiredString(flags, "id", "WireGuard peer ID", jsonOutput)];
    default:
      throw new Error(`unsupported WireGuard peer action: ${action}`);
  }
}

function addListFlags(
  args: string[],
  flags: Flags,
  jsonOutput: boolean,
  mappings: Record<string, string>,
  maxItems: number | undefined,
): string[] {
  for (const [source, target] of Object.entries(mappings)) {
    const value = optionalString(flags, source, jsonOutput);
    if (value !== undefined) args.push(target, value);
  }
  for (const key of ["page-number", "page-size"] as const) {
    const value = optionalString(flags, key, jsonOutput);
    if (value !== undefined) args.push(`--${key}`, value);
  }
  if (maxItems !== undefined) args.push("--max-items", String(maxItems));
  return args;
}

function listMaxItems(flags: Flags, jsonOutput: boolean): number | undefined {
  const value = optionalString(flags, "max-items", jsonOutput);
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!/^(?:-1|\d+)$/.test(value) || !Number.isSafeInteger(parsed)) {
    failWith("--max-items must be -1 or a non-negative safe integer", jsonOutput);
  }
  return parsed;
}

function requiredString(flags: Flags, key: string, label: string, jsonOutput: boolean): string {
  const value = optionalString(flags, key, jsonOutput);
  if (value === undefined) failWith(`--${key} is required (${label})`, jsonOutput);
  return value;
}

function optionalString(flags: Flags, key: string, jsonOutput: boolean): string | undefined {
  const value = flags[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.length === 0) {
    failWith(`--${key} requires a non-empty value`, jsonOutput);
  }
  return value;
}

function requireBareConfirm(flags: Flags, description: string, jsonOutput: boolean): void {
  if (flags.confirm !== true) {
    failWith(`${description} is destructive; pass a bare --confirm to continue`, jsonOutput);
  }
}

function isListAction(action: string): boolean {
  return action === "list" || action === "list-interfaces";
}

function truncateListResponse(response: unknown, maxItems: number | undefined): unknown {
  if (maxItems === undefined || maxItems === -1) return response;
  const envelope = asRecord(response);
  if (!Array.isArray(envelope.data)) return response;
  return { ...envelope, data: envelope.data.slice(0, maxItems) };
}

function present(resource: Resource, action: string, response: unknown, jsonOutput: boolean): void {
  if (jsonOutput) {
    outputJson(response);
    return;
  }

  const envelope = asRecord(response);
  const data = asRecord(envelope.data ?? response);
  if (isListAction(action)) {
    const items = Array.isArray(envelope.data) ? envelope.data.filter(isRecord) : [];
    printSuccess(`${resourceLabel(resource)} ${action.replace("-", " ")} complete!`, { Count: items.length });
    for (const item of items) {
      const id = stringValue(item.id) || "(unknown)";
      const summary = [item.name, item.status, item.type, item.network_id, item.wireguard_interface_id]
        .map(stringValue)
        .filter(Boolean)
        .join(" · ");
      console.log(`  • ${id}${summary ? ` — ${summary}` : ""}`);
    }
    if (items.length === 0) console.log("  (no resources returned)");
    console.log();
    return;
  }

  const details: Record<string, string | number | boolean> = { Action: action };
  addDetail(details, "ID", stringValue(data.id));
  addDetail(details, "Name", stringValue(data.name));
  addDetail(details, "Status", stringValue(data.status));
  addDetail(details, "Network ID", stringValue(data.network_id));
  addDetail(details, "WireGuard Interface ID", stringValue(data.wireguard_interface_id));
  printSuccess(`${resourceLabel(resource)} ${action} complete!`, details);
}

function resourceLabel(resource: Resource): string {
  if (resource === "network") return "Network";
  if (resource === "wireguard-interface") return "WireGuard interface";
  return "WireGuard peer";
}

function addDetail(details: Record<string, string | number | boolean>, label: string, value: string): void {
  if (value) details[label] = value;
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: unknown): string {
  return value === undefined || value === null ? "" : String(value);
}

function errorMsg(err: unknown): string {
  if (err instanceof TelnyxCLIError) return err.stderr || err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}
