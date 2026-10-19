/**
 * Direct IoT SIM card group lifecycle and SIM-to-group assignment commands.
 */

import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { outputJson, printError, printSuccess } from "../utils/output.ts";

type Flags = Record<string, string | boolean>;
type JsonRecord = Record<string, unknown>;
type GroupAction = "create" | "retrieve" | "update" | "list" | "delete";

interface GroupListResult {
  count: number;
  sim_card_groups: JsonRecord[];
  meta: JsonRecord;
}

export async function simCardGroupCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const action = requiredAction(flags, jsonOutput);

  switch (action) {
    case "create":
      await createGroup(flags, jsonOutput);
      return;
    case "retrieve":
      await retrieveGroup(flags, jsonOutput);
      return;
    case "update":
      await updateGroup(flags, jsonOutput);
      return;
    case "list":
      await listGroups(flags, jsonOutput);
      return;
    case "delete":
      await deleteGroup(flags, jsonOutput);
      return;
  }
}

export async function assignSimCardCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const simCardId = requiredString(flags, "sim-card-id", "SIM card ID", jsonOutput);
  const simCardGroupId = requiredString(flags, "sim-card-group-id", "SIM card group ID", jsonOutput);

  try {
    const response = await telnyxCli([
      "sim-cards", "update",
      "--sim-card-id", simCardId,
      "--sim-card-group-id", simCardGroupId,
    ]);
    const simCard = responseData(response);
    const result = {
      sim_card_id: stringValue(simCard.id) || simCardId,
      sim_card_group_id: stringValue(simCard.sim_card_group_id) || simCardGroupId,
      sim_card: simCard,
    };
    if (jsonOutput) outputJson(result);
    else printSuccess("SIM card assigned to group!", {
      "SIM Card ID": result.sim_card_id,
      "SIM Card Group ID": result.sim_card_group_id,
    });
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

async function createGroup(flags: Flags, jsonOutput: boolean): Promise<void> {
  const name = requiredString(flags, "name", "SIM card group name", jsonOutput);
  const args = ["sim-card-groups", "create", "--name", name];
  addDataLimit(args, flags, jsonOutput);
  await runSingleGroup("created", args, jsonOutput);
}

async function retrieveGroup(flags: Flags, jsonOutput: boolean): Promise<void> {
  const id = requiredString(flags, "id", "SIM card group ID", jsonOutput);
  const args = ["sim-card-groups", "retrieve", "--id", id];
  addBooleanFlag(args, flags, "include-iccids", jsonOutput);
  await runSingleGroup("retrieved", args, jsonOutput, id);
}

async function updateGroup(flags: Flags, jsonOutput: boolean): Promise<void> {
  const id = requiredString(flags, "id", "SIM card group ID", jsonOutput);
  const args = ["sim-card-groups", "update", "--id", id];
  const name = optionalString(flags, "name", jsonOutput);
  if (name !== undefined) args.push("--name", name);
  const hasDataLimit = addDataLimit(args, flags, jsonOutput);
  if (name === undefined && !hasDataLimit) {
    fail("--name or both --data-limit-amount and --data-limit-unit are required for update", jsonOutput);
  }
  await runSingleGroup("updated", args, jsonOutput, id);
}

async function listGroups(flags: Flags, jsonOutput: boolean): Promise<void> {
  const args = ["sim-card-groups", "list"];
  addMappedFlag(args, flags, "filter-name", "--filter-name", jsonOutput);
  addMappedFlag(args, flags, "filter-private-wireless-gateway-id", "--filter-private-wireless-gateway-id", jsonOutput);
  addMappedFlag(args, flags, "filter-wireless-blocklist-id", "--filter-wireless-blocklist-id", jsonOutput);
  addPositiveIntegerFlag(args, flags, "page-number", jsonOutput);
  addPositiveIntegerFlag(args, flags, "page-size", jsonOutput);

  try {
    const response = await telnyxCli(args, { format: "raw" });
    const result = normalizeGroupList(response);
    if (jsonOutput) outputJson(result);
    else presentGroupList(result);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

async function deleteGroup(flags: Flags, jsonOutput: boolean): Promise<void> {
  const id = requiredString(flags, "id", "SIM card group ID", jsonOutput);
  if (flags.confirm !== true) fail("--confirm is required to delete a SIM card group", jsonOutput);

  try {
    // --confirm is an agent-local acknowledgement and is deliberately not forwarded.
    const response = await telnyxCli(["sim-card-groups", "delete", "--id", id]);
    const deleted = responseData(response);
    const result = {
      sim_card_group_id: stringValue(deleted.id) || id,
      deleted: true,
      sim_card_group: deleted,
    };
    if (jsonOutput) outputJson(result);
    else printSuccess("SIM card group deleted!", { "SIM Card Group ID": result.sim_card_group_id });
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

async function runSingleGroup(
  verb: "created" | "retrieved" | "updated",
  args: string[],
  jsonOutput: boolean,
  fallbackId = "",
): Promise<void> {
  try {
    const response = await telnyxCli(args);
    const group = responseData(response);
    const result = {
      sim_card_group_id: stringValue(group.id) || fallbackId,
      sim_card_group: group,
    };
    if (jsonOutput) outputJson(result);
    else printSuccess(`SIM card group ${verb}!`, {
      "SIM Card Group ID": result.sim_card_group_id || "(not returned)",
      Name: stringValue(group.name) || "(not returned)",
    });
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

function normalizeGroupList(response: unknown): GroupListResult {
  const envelope = asRecord(response);
  const groups = Array.isArray(envelope.data)
    ? envelope.data.filter(
      (item): item is JsonRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item),
    )
    : [];
  return { count: groups.length, sim_card_groups: groups, meta: asRecord(envelope.meta) };
}

function presentGroupList(result: GroupListResult): void {
  printSuccess("SIM card groups retrieved!", { Count: result.count });
  for (const group of result.sim_card_groups) {
    const id = stringValue(group.id) || "(unknown)";
    const name = stringValue(group.name);
    console.log(`  • ${id}${name ? ` — ${name}` : ""}`);
  }
  if (result.count === 0) console.log("  (no SIM card groups returned)");
  console.log();
}

function requiredAction(flags: Flags, jsonOutput: boolean): GroupAction {
  const action = optionalString(flags, "action", jsonOutput);
  if (action === "create" || action === "retrieve" || action === "update" || action === "list" || action === "delete") return action;
  fail("--action is required and must be create, retrieve, update, list, or delete", jsonOutput);
}

function requiredString(flags: Flags, key: string, label: string, jsonOutput: boolean): string {
  const value = optionalString(flags, key, jsonOutput);
  if (value === undefined) fail(`--${key} is required (${label})`, jsonOutput);
  return value;
}

function optionalString(flags: Flags, key: string, jsonOutput: boolean): string | undefined {
  const value = flags[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.trim().length === 0) fail(`--${key} must be a non-empty value`, jsonOutput);
  return value;
}

function addMappedFlag(args: string[], flags: Flags, source: string, target: string, jsonOutput: boolean): void {
  const value = optionalString(flags, source, jsonOutput);
  if (value !== undefined) args.push(target, value);
}

function addDataLimit(args: string[], flags: Flags, jsonOutput: boolean): boolean {
  const amount = optionalString(flags, "data-limit-amount", jsonOutput);
  const unit = optionalString(flags, "data-limit-unit", jsonOutput);
  if (amount === undefined && unit === undefined) return false;
  if (amount === undefined || unit === undefined) {
    fail("--data-limit-amount and --data-limit-unit must be supplied together", jsonOutput);
  }
  if (!/^\d+(?:\.\d+)?$/.test(amount) || Number(amount) <= 0) {
    fail("--data-limit-amount must be a positive number", jsonOutput);
  }
  if (unit !== "MB" && unit !== "GB") fail("--data-limit-unit must be MB or GB", jsonOutput);
  args.push("--data-limit.amount", amount, "--data-limit.unit", unit);
  return true;
}

function addBooleanFlag(args: string[], flags: Flags, source: string, jsonOutput: boolean): void {
  const value = flags[source];
  if (value === undefined) return;
  if (value === true) {
    args.push(`--${source}=true`);
    return;
  }
  if (value === "true" || value === "false") {
    args.push(`--${source}=${value}`);
    return;
  }
  fail(`--${source} must be true or false`, jsonOutput);
}

function addPositiveIntegerFlag(args: string[], flags: Flags, source: string, jsonOutput: boolean): void {
  const value = optionalString(flags, source, jsonOutput);
  if (value === undefined) return;
  if (!/^\d+$/.test(value) || Number(value) < 1) fail(`--${source} must be a positive integer`, jsonOutput);
  args.push(`--${source}`, value);
}

function responseData(response: unknown): JsonRecord {
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
