/**
 * Direct IoT SIM actions backed by the Stainless-generated Go CLI.
 *
 * List requests use raw output so the Go CLI returns one parseable
 * `{ data, meta }` response instead of streaming one JSON document per SIM.
 */

import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { outputJson, printError, printSuccess } from "../utils/output.ts";

type Flags = Record<string, string | boolean>;
type JsonRecord = Record<string, unknown>;
type SimAction = "enable" | "disable";

interface SimListResult {
  count: number;
  sim_cards: JsonRecord[];
  meta: JsonRecord;
}

interface SimRetrieveResult {
  sim_card_id: string;
  sim_card: JsonRecord;
}

interface SimActionResult {
  action_id: string;
  sim_card_id: string;
  action: SimAction;
  status: string;
}

interface SimActionRetrieveResult {
  action_id: string;
  sim_card_action: JsonRecord;
}

interface SimActionListResult {
  count: number;
  sim_card_actions: JsonRecord[];
  meta: JsonRecord;
}

export async function listSimCardsCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const args = ["sim-cards", "list"];

  addMappedFlag(args, flags, "iccid", "--filter.iccid");
  addMappedFlag(args, flags, "msisdn", "--filter.msisdn");
  addCsvFlag(args, flags, "status", "--filter.status", jsonOutput);
  addCsvFlag(args, flags, "tags", "--filter.tags", jsonOutput);
  addMappedFlag(args, flags, "sim-card-group-id", "--filter-sim-card-group-id");
  addBooleanFlag(args, flags, "include-sim-card-group", jsonOutput);
  addPositiveIntegerFlag(args, flags, "page-number", "--page-number", jsonOutput);
  addPositiveIntegerFlag(args, flags, "page-size", "--page-size", jsonOutput);
  addMappedFlag(args, flags, "sort", "--sort");

  try {
    const response = await telnyxCli(args, { format: "raw" });
    presentSimList(normalizeSimList(response), jsonOutput);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function retrieveSimCardCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const simCardId = stringFlag(flags, "id");
  if (!simCardId) fail("--id is required (SIM card ID)", jsonOutput);

  const args = ["sim-cards", "retrieve", "--id", simCardId];
  addBooleanFlag(args, flags, "include-sim-card-group", jsonOutput);

  try {
    const response = await telnyxCli(args);
    const simCard = asRecord(asRecord(response).data ?? response);
    const result: SimRetrieveResult = {
      sim_card_id: stringValue(simCard.id) || simCardId,
      sim_card: simCard,
    };

    if (jsonOutput) {
      outputJson(result);
    } else {
      printSuccess("SIM card retrieved!", {
        "SIM Card ID": result.sim_card_id,
        ICCID: stringValue(simCard.iccid) || "(not returned)",
        MSISDN: stringValue(simCard.msisdn) || "(not assigned)",
        Status: simStatus(simCard) || "(not returned)",
      });
    }
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function retrieveSimCardActionCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const actionId = stringFlag(flags, "id");
  if (!actionId) fail("--id is required (SIM card action ID)", jsonOutput);

  try {
    const response = await telnyxCli(["sim-cards:actions", "retrieve", "--id", actionId]);
    const action = asRecord(asRecord(response).data ?? response);
    const result: SimActionRetrieveResult = {
      action_id: stringValue(action.id) || actionId,
      sim_card_action: action,
    };

    if (jsonOutput) {
      outputJson(result);
    } else {
      printSuccess("SIM card action retrieved!", {
        "Action ID": result.action_id,
        "SIM Card ID": stringValue(action.sim_card_id) || "(not returned)",
        "Action Type": stringValue(action.action_type) || "(not returned)",
        Status: simStatus(action) || "(not returned)",
      });
    }
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function listSimCardActionsCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const args = ["sim-cards:actions", "list"];

  addMappedFlag(args, flags, "sim-card-id", "--filter.sim-card-id");
  addMappedFlag(args, flags, "status", "--filter.status");
  addMappedFlag(args, flags, "bulk-sim-card-action-id", "--filter.bulk-sim-card-action-id");
  addMappedFlag(args, flags, "action-type", "--filter.action-type");
  addPositiveIntegerFlag(args, flags, "page-number", "--page-number", jsonOutput);
  addPositiveIntegerFlag(args, flags, "page-size", "--page-size", jsonOutput);

  try {
    const response = await telnyxCli(args, { format: "raw" });
    presentSimActionList(normalizeSimActionList(response), jsonOutput);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function enableSimCardCommand(flags: Flags): Promise<void> {
  await runSimAction("enable", flags);
}

export async function disableSimCardCommand(flags: Flags): Promise<void> {
  await runSimAction("disable", flags);
}

async function runSimAction(action: SimAction, flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const simCardId = stringFlag(flags, "id");
  if (!simCardId) fail("--id is required (SIM card ID)", jsonOutput);

  try {
    const response = await telnyxCli(["sim-cards:actions", action, "--id", simCardId]);
    const data = asRecord(asRecord(response).data ?? response);
    const result: SimActionResult = {
      action_id: stringValue(data.id),
      sim_card_id: stringValue(data.sim_card_id) || simCardId,
      action,
      status: simStatus(data) || "pending",
    };

    if (jsonOutput) {
      outputJson(result);
    } else {
      printSuccess(`SIM card ${action} requested!`, {
        "SIM Card ID": result.sim_card_id,
        "Action ID": result.action_id || "(not returned)",
        Action: result.action,
        Status: result.status,
      });
    }
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

function normalizeSimList(response: unknown): SimListResult {
  const envelope = asRecord(response);
  const simCards = Array.isArray(envelope.data)
    ? envelope.data.filter(
        (item): item is JsonRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item),
      )
    : [];
  return {
    count: simCards.length,
    sim_cards: simCards,
    meta: asRecord(envelope.meta),
  };
}

function normalizeSimActionList(response: unknown): SimActionListResult {
  const envelope = asRecord(response);
  const actions = Array.isArray(envelope.data)
    ? envelope.data.filter(
        (item): item is JsonRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item),
      )
    : [];
  return {
    count: actions.length,
    sim_card_actions: actions,
    meta: asRecord(envelope.meta),
  };
}

function presentSimList(result: SimListResult, jsonOutput: boolean): void {
  if (jsonOutput) {
    outputJson(result);
    return;
  }

  printSuccess("SIM cards retrieved!", { Count: result.count });
  for (const simCard of result.sim_cards) {
    const id = stringValue(simCard.id) || "(unknown)";
    const details = [simCard.iccid, simCard.msisdn, simStatus(simCard)]
      .map(stringValue)
      .filter(Boolean)
      .join(" · ");
    console.log(`  • ${id}${details ? ` — ${details}` : ""}`);
  }
  if (result.count === 0) console.log("  (no SIM cards returned)");
  console.log();
}

function presentSimActionList(result: SimActionListResult, jsonOutput: boolean): void {
  if (jsonOutput) {
    outputJson(result);
    return;
  }

  printSuccess("SIM card actions retrieved!", { Count: result.count });
  for (const action of result.sim_card_actions) {
    const id = stringValue(action.id) || "(unknown)";
    const details = [action.action_type, action.sim_card_id, simStatus(action)]
      .map(stringValue)
      .filter(Boolean)
      .join(" · ");
    console.log(`  • ${id}${details ? ` — ${details}` : ""}`);
  }
  if (result.count === 0) console.log("  (no SIM card actions returned)");
  console.log();
}

function simStatus(simCard: JsonRecord): string {
  const status = simCard.status;
  if (status && typeof status === "object" && !Array.isArray(status)) {
    return stringValue((status as JsonRecord).value);
  }
  return stringValue(status);
}

function addMappedFlag(args: string[], flags: Flags, source: string, target: string): void {
  const value = stringFlag(flags, source);
  if (value !== undefined) args.push(target, value);
}

function addCsvFlag(
  args: string[],
  flags: Flags,
  source: string,
  target: string,
  jsonOutput: boolean,
): void {
  const value = stringFlag(flags, source);
  if (value === undefined) return;
  const values = value.split(",").map((item) => item.trim()).filter(Boolean);
  if (values.length === 0) fail(`--${source} must contain at least one value`, jsonOutput);
  args.push(target, JSON.stringify(values));
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

function addPositiveIntegerFlag(
  args: string[],
  flags: Flags,
  source: string,
  target: string,
  jsonOutput: boolean,
): void {
  const value = stringFlag(flags, source);
  if (value === undefined) return;
  if (!/^\d+$/.test(value) || Number(value) < 1) {
    fail(`--${source} must be a positive integer`, jsonOutput);
  }
  args.push(target, value);
}

function stringFlag(flags: Flags, key: string): string | undefined {
  const value = flags[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
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
