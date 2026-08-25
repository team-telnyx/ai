/**
 * Direct porting-order management actions backed by the generated Go CLI.
 *
 * List operations request raw output so each response remains one parseable
 * `{ data, meta }` envelope. Additional documents are already-uploaded Telnyx
 * document resources; this surface therefore calls the operation "attach"
 * rather than implying that it uploads local file bytes.
 */

import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { outputJson, printError, printSuccess } from "../utils/output.ts";

type Flags = Record<string, string | boolean>;
type JsonRecord = Record<string, unknown>;
type PortingAction = "submit" | "cancel";

const DOCUMENT_TYPES = ["loa", "invoice", "csr", "other"] as const;
const DOCUMENT_TYPE_SET = new Set<string>(DOCUMENT_TYPES);

interface PortingOrderListResult {
  count: number;
  porting_orders: JsonRecord[];
  meta: JsonRecord;
}

interface PortingOrderResult {
  porting_order_id: string;
  porting_order: JsonRecord;
}

interface PortingActionResult extends PortingOrderResult {
  action: PortingAction;
  status: string;
}

interface ActivatePortingOrderResult {
  porting_order_id: string;
  action: "activate";
  status: string;
  activation_job_id: string;
  activation_job: JsonRecord;
}

interface PortingDocumentListResult {
  porting_order_id: string;
  count: number;
  documents: JsonRecord[];
  meta: JsonRecord;
}

interface AttachPortingDocumentResult {
  porting_order_id: string;
  attached_count: number;
  documents: JsonRecord[];
}

export async function listPortingOrdersCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const args = ["porting-orders", "list"];

  addMappedFlag(args, flags, "customer-reference", "--filter.customer-reference");
  addMappedFlag(args, flags, "customer-group-reference", "--filter.customer-group-reference");
  addMappedFlag(args, flags, "parent-support-key", "--filter.parent-support-key");

  const phoneNumberFilter: JsonRecord = {};
  const countryCode = stringFlag(flags, "country-code");
  const carrierName = stringFlag(flags, "carrier-name");
  const phoneNumber = stringFlag(flags, "phone-number");
  if (countryCode) phoneNumberFilter.country_code = countryCode;
  if (carrierName) phoneNumberFilter.carrier_name = carrierName;
  if (phoneNumber) phoneNumberFilter.phone_number = { contains: phoneNumber };
  if (Object.keys(phoneNumberFilter).length > 0) {
    args.push("--filter.phone-numbers", JSON.stringify(phoneNumberFilter));
  }

  const portType = stringFlag(flags, "port-type");
  if (portType) {
    validateChoice("port-type", portType, ["full", "partial"], jsonOutput);
    args.push("--filter.misc", JSON.stringify({ type: portType }));
  }

  const activationFilter: JsonRecord = {};
  const fastPortEligible = booleanFlag(flags, "fast-port-eligible", jsonOutput);
  if (fastPortEligible !== undefined) activationFilter.fast_port_eligible = fastPortEligible;
  const focAfter = stringFlag(flags, "foc-after");
  const focBefore = stringFlag(flags, "foc-before");
  if (focAfter) validateDateTime("foc-after", focAfter, jsonOutput);
  if (focBefore) validateDateTime("foc-before", focBefore, jsonOutput);
  if (focAfter || focBefore) {
    activationFilter.foc_datetime_requested = {
      ...(focAfter ? { gt: focAfter } : {}),
      ...(focBefore ? { lt: focBefore } : {}),
    };
  }
  if (Object.keys(activationFilter).length > 0) {
    args.push("--filter.activation-settings", JSON.stringify(activationFilter));
  }

  addBooleanFlag(args, flags, "include-phone-numbers", "--include-phone-numbers", jsonOutput);
  addPositiveIntegerFlag(args, flags, "page-number", "--page-number", jsonOutput);
  addPositiveIntegerFlag(args, flags, "page-size", "--page-size", jsonOutput);
  addMappedFlag(args, flags, "sort", "--sort.value");

  try {
    const response = await telnyxCli(args, { format: "raw" });
    presentPortingOrderList(normalizePortingOrderList(response), jsonOutput);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function getPortingOrderCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const portingOrderId = requireId(flags, jsonOutput);
  const args = ["porting-orders", "retrieve", "--id", portingOrderId];
  addBooleanFlag(args, flags, "include-phone-numbers", "--include-phone-numbers", jsonOutput);

  try {
    const response = await telnyxCli(args);
    presentPortingOrder("Porting order retrieved!", portingOrderId, response, jsonOutput);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function updatePortingOrderCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const portingOrderId = requireId(flags, jsonOutput);
  const args = ["porting-orders", "update", "--id", portingOrderId];

  addMappedFlag(args, flags, "customer-reference", "--customer-reference");
  addMappedFlag(args, flags, "customer-group-reference", "--customer-group-reference");
  addMappedFlag(args, flags, "webhook-url", "--webhook-url");
  addMappedFlag(args, flags, "requirement-group-id", "--requirement-group-id");
  addMappedFlag(args, flags, "loa-document-id", "--documents.loa");
  addMappedFlag(args, flags, "invoice-document-id", "--documents.invoice");

  const focDateTime = stringFlag(flags, "foc-datetime-requested");
  if (focDateTime) {
    validateDateTime("foc-datetime-requested", focDateTime, jsonOutput);
    args.push("--activation-settings.foc-datetime-requested", focDateTime);
  }
  addBooleanFlag(args, flags, "enable-messaging", "--messaging.enable-messaging", jsonOutput);

  addMappedFlag(args, flags, "billing-group-id", "--phone-number-configuration.billing-group-id");
  addMappedFlag(args, flags, "connection-id", "--phone-number-configuration.connection-id");
  addMappedFlag(args, flags, "emergency-address-id", "--phone-number-configuration.emergency-address-id");
  addMappedFlag(args, flags, "messaging-profile-id", "--phone-number-configuration.messaging-profile-id");
  addCsvFlag(args, flags, "tags", "--phone-number-configuration.tags", jsonOutput);

  const portType = stringFlag(flags, "port-type");
  const remainingAction = stringFlag(flags, "remaining-numbers-action");
  const newBillingPhoneNumber = stringFlag(flags, "new-billing-phone-number");
  if (portType) validateChoice("port-type", portType, ["full", "partial"], jsonOutput);
  if (remainingAction) {
    validateChoice("remaining-numbers-action", remainingAction, ["keep", "disconnect"], jsonOutput);
  }
  if (portType === "full" && (remainingAction || newBillingPhoneNumber)) {
    fail("--remaining-numbers-action and --new-billing-phone-number cannot be used with --port-type full", jsonOutput);
  }
  if (remainingAction === "keep" && !newBillingPhoneNumber) {
    fail("--new-billing-phone-number is required when --remaining-numbers-action is keep", jsonOutput);
  }
  if (portType) args.push("--misc.type", portType);
  if (remainingAction) args.push("--misc.remaining-numbers-action", remainingAction);
  if (newBillingPhoneNumber) args.push("--misc.new-billing-phone-number", newBillingPhoneNumber);

  if (args.length === 4) {
    fail("update-porting-order requires at least one update flag", jsonOutput);
  }

  try {
    const response = await telnyxCli(args);
    presentPortingOrder("Porting order updated!", portingOrderId, response, jsonOutput);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function submitPortingOrderCommand(flags: Flags): Promise<void> {
  await runPortingAction("submit", "confirm", flags);
}

export async function cancelPortingOrderCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  if (flags.confirm !== true) {
    fail("cancel-porting-order is destructive; pass --confirm to continue", jsonOutput);
  }
  await runPortingAction("cancel", "cancel", flags);
}

export async function activatePortingOrderCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  // Activation triggers the actual port of every number in the order and
  // cannot be undone, so require the same explicit acknowledgement as cancel.
  if (flags.confirm !== true) {
    fail("activate-porting-order is irreversible; pass --confirm to continue", jsonOutput);
  }
  const portingOrderId = requireId(flags, jsonOutput);
  try {
    const response = await telnyxCli(["porting-orders:actions", "activate", "--id", portingOrderId]);
    const activationJob = responseDataRecord(response);
    const result: ActivatePortingOrderResult = {
      porting_order_id: portingOrderId,
      action: "activate",
      status: statusValue(activationJob.status) || "unknown",
      activation_job_id: stringValue(activationJob.id),
      activation_job: activationJob,
    };
    if (jsonOutput) {
      outputJson(result);
    } else {
      printSuccess("Porting order activation requested!", {
        "Porting Order ID": result.porting_order_id,
        "Activation Job ID": result.activation_job_id || "(not returned)",
        Action: result.action,
        Status: result.status,
      });
    }
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function attachPortingDocumentCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const portingOrderId = requireId(flags, jsonOutput);
  const documentId = stringFlag(flags, "document-id");
  const documentType = stringFlag(flags, "document-type");
  if (!documentId) fail("--document-id is required (an existing Telnyx document ID)", jsonOutput);
  if (!documentType) {
    fail(`--document-type is required (${DOCUMENT_TYPES.join("|")})`, jsonOutput);
  }
  validateChoice("document-type", documentType, DOCUMENT_TYPES, jsonOutput);

  const args = [
    "porting-orders:additional-documents",
    "create",
    "--id",
    portingOrderId,
    "--additional-document.document-id",
    documentId,
    "--additional-document.document-type",
    documentType,
  ];

  try {
    const response = await telnyxCli(args);
    const documents = dataRecords(response);
    const result: AttachPortingDocumentResult = {
      porting_order_id: portingOrderId,
      attached_count: documents.length,
      documents,
    };
    if (jsonOutput) {
      outputJson(result);
    } else {
      printSuccess("Porting document attached!", {
        "Porting Order ID": portingOrderId,
        "Document ID": documentId,
        "Document Type": documentType,
        "Attached Records": result.attached_count,
      });
    }
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function listPortingDocumentsCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const portingOrderId = requireId(flags, jsonOutput);
  const args = ["porting-orders:additional-documents", "list", "--id", portingOrderId];

  const documentTypes = csvValues(flags, "document-type", jsonOutput);
  if (documentTypes) {
    for (const documentType of documentTypes) {
      if (!DOCUMENT_TYPE_SET.has(documentType)) {
        fail(`--document-type must contain only ${DOCUMENT_TYPES.join(", ")}`, jsonOutput);
      }
    }
    args.push("--filter.document-type", JSON.stringify(documentTypes));
  }
  addPositiveIntegerFlag(args, flags, "page-number", "--page-number", jsonOutput);
  addPositiveIntegerFlag(args, flags, "page-size", "--page-size", jsonOutput);
  addMappedFlag(args, flags, "sort", "--sort.value");

  try {
    const response = await telnyxCli(args, { format: "raw" });
    const envelope = asRecord(response);
    const result: PortingDocumentListResult = {
      porting_order_id: portingOrderId,
      count: dataRecords(response).length,
      documents: dataRecords(response),
      meta: asRecord(envelope.meta),
    };
    presentPortingDocumentList(result, jsonOutput);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

async function runPortingAction(action: PortingAction, generatedAction: string, flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const portingOrderId = requireId(flags, jsonOutput);
  try {
    const response = await telnyxCli(["porting-orders:actions", generatedAction, "--id", portingOrderId]);
    const portingOrder = responseDataRecord(response);
    const result: PortingActionResult = {
      porting_order_id: stringValue(portingOrder.id) || portingOrderId,
      action,
      status: statusValue(portingOrder.status) || (action === "submit" ? "submitted" : "cancelled"),
      porting_order: portingOrder,
    };
    if (jsonOutput) {
      outputJson(result);
    } else {
      printSuccess(`Porting order ${action === "submit" ? "submitted" : "cancelled"}!`, {
        "Porting Order ID": result.porting_order_id,
        Action: result.action,
        Status: result.status,
      });
    }
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

function normalizePortingOrderList(response: unknown): PortingOrderListResult {
  const envelope = asRecord(response);
  const portingOrders = dataRecords(response);
  return {
    count: portingOrders.length,
    porting_orders: portingOrders,
    meta: asRecord(envelope.meta),
  };
}

function presentPortingOrderList(result: PortingOrderListResult, jsonOutput: boolean): void {
  if (jsonOutput) {
    outputJson(result);
    return;
  }
  printSuccess("Porting orders retrieved!", { Count: result.count });
  for (const order of result.porting_orders) {
    const id = stringValue(order.id) || "(unknown)";
    const details = [statusValue(order.status), order.customer_reference, phoneNumberCount(order)]
      .map(stringValue)
      .filter(Boolean)
      .join(" · ");
    console.log(`  • ${id}${details ? ` — ${details}` : ""}`);
  }
  if (result.count === 0) console.log("  (no porting orders returned)");
  console.log();
}

function presentPortingOrder(title: string, requestedId: string, response: unknown, jsonOutput: boolean): void {
  const portingOrder = responseDataRecord(response);
  const result: PortingOrderResult = {
    porting_order_id: stringValue(portingOrder.id) || requestedId,
    porting_order: portingOrder,
  };
  if (jsonOutput) {
    outputJson(result);
    return;
  }
  printSuccess(title, {
    "Porting Order ID": result.porting_order_id,
    Status: statusValue(portingOrder.status) || "(not returned)",
    "Customer Reference": stringValue(portingOrder.customer_reference) || "(not returned)",
    "Phone Numbers": phoneNumberCount(portingOrder) || "(not returned)",
  });
}

function presentPortingDocumentList(result: PortingDocumentListResult, jsonOutput: boolean): void {
  if (jsonOutput) {
    outputJson(result);
    return;
  }
  printSuccess("Porting documents retrieved!", {
    "Porting Order ID": result.porting_order_id,
    Count: result.count,
  });
  for (const document of result.documents) {
    const id = stringValue(document.id) || stringValue(document.document_id) || "(unknown)";
    const details = [document.document_type, document.filename].map(stringValue).filter(Boolean).join(" · ");
    console.log(`  • ${id}${details ? ` — ${details}` : ""}`);
  }
  if (result.count === 0) console.log("  (no porting documents returned)");
  console.log();
}

function requireId(flags: Flags, jsonOutput: boolean): string {
  const id = stringFlag(flags, "id");
  if (!id) fail("--id is required (porting order ID)", jsonOutput);
  return id;
}

function addMappedFlag(args: string[], flags: Flags, source: string, target: string): void {
  const value = stringFlag(flags, source);
  if (value !== undefined) args.push(target, value);
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
  if (!/^\d+$/.test(value) || Number(value) < 1) fail(`--${source} must be a positive integer`, jsonOutput);
  args.push(target, value);
}

function addBooleanFlag(
  args: string[],
  flags: Flags,
  source: string,
  target: string,
  jsonOutput: boolean,
): void {
  const value = booleanFlag(flags, source, jsonOutput);
  if (value !== undefined) args.push(`${target}=${String(value)}`);
}

function booleanFlag(flags: Flags, key: string, jsonOutput: boolean): boolean | undefined {
  const value = flags[key];
  if (value === undefined) return undefined;
  if (value === true || value === "true") return true;
  if (value === "false") return false;
  fail(`--${key} must be true or false`, jsonOutput);
}

function addCsvFlag(args: string[], flags: Flags, source: string, target: string, jsonOutput: boolean): void {
  const values = csvValues(flags, source, jsonOutput);
  if (values) args.push(target, JSON.stringify(values));
}

function csvValues(flags: Flags, source: string, jsonOutput: boolean): string[] | undefined {
  const value = stringFlag(flags, source);
  if (value === undefined) return undefined;
  const values = value.split(",").map((item) => item.trim()).filter(Boolean);
  if (values.length === 0) fail(`--${source} must contain at least one value`, jsonOutput);
  return values;
}

function validateChoice(
  flag: string,
  value: string,
  choices: readonly string[],
  jsonOutput: boolean,
): void {
  if (!choices.includes(value)) fail(`--${flag} must be one of: ${choices.join(", ")}`, jsonOutput);
}

function validateDateTime(flag: string, value: string, jsonOutput: boolean): void {
  if (!/^\d{4}-\d{2}-\d{2}T/.test(value) || Number.isNaN(Date.parse(value))) {
    fail(`--${flag} must be a valid ISO 8601 date-time`, jsonOutput);
  }
}

function dataRecords(response: unknown): JsonRecord[] {
  const data = asRecord(response).data;
  if (Array.isArray(data)) {
    return data.filter(
      (item): item is JsonRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item),
    );
  }
  const record = asRecord(data);
  return Object.keys(record).length > 0 ? [record] : [];
}

function responseDataRecord(response: unknown): JsonRecord {
  const envelope = asRecord(response);
  return asRecord(envelope.data ?? response);
}

function phoneNumberCount(order: JsonRecord): string {
  if (Array.isArray(order.phone_numbers)) return `${order.phone_numbers.length} phone number(s)`;
  const count = order.porting_phone_numbers_count ?? order.phone_numbers_count;
  return count === undefined || count === null ? "" : `${String(count)} phone number(s)`;
}

function statusValue(value: unknown): string {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return stringValue((value as JsonRecord).value);
  }
  return stringValue(value);
}

function stringFlag(flags: Flags, key: string): string | undefined {
  const value = flags[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
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
