/**
 * Direct phone-number actions backed by the Stainless-generated Go CLI.
 *
 * The list commands deliberately request `--format raw`: current Go CLI list
 * commands stream multiple JSON documents in JSON mode, while raw mode returns
 * the API's single `{ data, meta }` envelope.
 */

import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { outputJson, printError, printSuccess } from "../utils/output.ts";

type Flags = Record<string, string | boolean>;
type JsonRecord = Record<string, unknown>;

interface NumberListResult {
  count: number;
  phone_numbers: JsonRecord[];
  meta: JsonRecord;
}

interface BuyNumberResult {
  order_id: string;
  status: string;
  phone_number: string;
}

interface LookupNumberResult {
  phone_number: string;
  country_code: unknown;
  national_format: unknown;
  carrier: unknown;
  caller_name: unknown;
}

export async function listPhoneNumbersCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const args = ["phone-numbers", "list"];

  addMappedFlag(args, flags, "phone-number", "--filter.phone-number");
  addMappedFlag(args, flags, "status", "--filter.status");
  addMappedFlag(args, flags, "country", "--filter.country-iso-alpha2");
  addMappedFlag(args, flags, "connection-id", "--filter.connection-id");
  addMappedFlag(args, flags, "tag", "--filter.tag");
  addMappedFlag(args, flags, "source", "--filter.source");
  addMappedFlag(args, flags, "billing-group-id", "--filter.billing-group-id");
  addMappedFlag(args, flags, "customer-reference", "--filter.customer-reference");

  const numberType = stringFlag(flags, "number-type");
  if (numberType) {
    // The current Go CLI models this filter as map[string]any, not a scalar.
    args.push("--filter.number-type", JSON.stringify({ eq: numberType }));
  }

  addIntegerFlag(args, flags, "page-number", "--page-number", jsonOutput);
  addIntegerFlag(args, flags, "page-size", "--page-size", jsonOutput);
  addMappedFlag(args, flags, "sort", "--sort");

  try {
    const response = await telnyxCli(args, { format: "raw" });
    presentNumberList("Owned phone numbers", normalizeNumberList(response), jsonOutput);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function searchPhoneNumbersCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const country = stringFlag(flags, "country") ?? "US";
  const args = ["available-phone-numbers", "list", "--filter.country-code", country];

  addMappedFlag(args, flags, "type", "--filter.phone-number-type");
  addMappedFlag(args, flags, "locality", "--filter.locality");
  addMappedFlag(args, flags, "administrative-area", "--filter.administrative-area");

  const areaCode = stringFlag(flags, "area-code");
  const nationalDestinationCode = stringFlag(flags, "national-destination-code");
  if (areaCode && nationalDestinationCode && areaCode !== nationalDestinationCode) {
    fail("--area-code and --national-destination-code cannot specify different values", jsonOutput);
  }
  const destinationCode = nationalDestinationCode ?? areaCode;
  if (destinationCode) {
    args.push("--filter.national-destination-code", destinationCode);
  }

  const features = stringFlag(flags, "features");
  if (features) {
    const values = features.split(",").map((value) => value.trim()).filter(Boolean);
    if (values.length === 0) fail("--features must contain at least one feature", jsonOutput);
    // Current Go CLI type: InnerFlag[[]string]. It expects an array value.
    args.push("--filter.features", JSON.stringify(values));
  }

  const pattern: JsonRecord = {};
  const contains = stringFlag(flags, "contains");
  const startsWith = stringFlag(flags, "starts-with");
  const endsWith = stringFlag(flags, "ends-with");
  if (contains) pattern.contains = contains;
  if (startsWith) pattern.starts_with = startsWith;
  if (endsWith) pattern.ends_with = endsWith;
  if (Object.keys(pattern).length > 0) {
    // Current Go CLI type: InnerFlag[map[string]any].
    args.push("--filter.phone-number", JSON.stringify(pattern));
  }

  addIntegerFlag(args, flags, "limit", "--filter.limit", jsonOutput);

  try {
    const response = await telnyxCli(args, { format: "raw" });
    presentNumberList("Available phone numbers", normalizeNumberList(response), jsonOutput);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function buyPhoneNumberCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const phoneNumber = stringFlag(flags, "phone-number");
  if (!phoneNumber) fail("--phone-number is required (E.164 format, e.g., +131****0000)", jsonOutput);

  // Current Go CLI type: Flag[[]map[string]any]. A scalar --phone-number is
  // invalid; the generated inner field must be used for a single-number order.
  const args = ["number-orders", "create", "--phone-number.phone-number", phoneNumber];
  addMappedFlag(args, flags, "connection-id", "--connection-id");
  addMappedFlag(args, flags, "messaging-profile-id", "--messaging-profile-id");
  addMappedFlag(args, flags, "billing-group-id", "--billing-group-id");
  addMappedFlag(args, flags, "customer-reference", "--customer-reference");
  addMappedFlag(args, flags, "bundle-id", "--phone-number.bundle-id");
  addMappedFlag(args, flags, "requirement-group-id", "--phone-number.requirement-group-id");

  try {
    const response = await telnyxCli(args, { timeout: 120_000 });
    const data = asRecord(asRecord(response).data ?? response);
    const result: BuyNumberResult = {
      order_id: stringValue(data.id),
      status: stringValue(data.status),
      phone_number: phoneNumber,
    };

    if (jsonOutput) {
      outputJson(result);
    } else {
      printSuccess("Phone number order created!", {
        "Phone Number": result.phone_number,
        "Order ID": result.order_id || "(not returned)",
        Status: result.status || "(not returned)",
      });
    }
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

export async function lookupNumberCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const phoneNumber = stringFlag(flags, "phone-number");
  const lookupType = stringFlag(flags, "type");
  if (!phoneNumber) fail("--phone-number is required (E.164 format, e.g., +131****0000)", jsonOutput);
  if (lookupType && lookupType !== "carrier" && lookupType !== "caller-name") {
    fail('--type must be "carrier" or "caller-name"', jsonOutput);
  }

  const args = ["number-lookup", "retrieve", "--phone-number", phoneNumber];
  if (lookupType) args.push("--type", lookupType);

  try {
    const response = await telnyxCli(args);
    const data = asRecord(asRecord(response).data ?? response);
    const result: LookupNumberResult = {
      phone_number: stringValue(data.phone_number) || phoneNumber,
      country_code: data.country_code ?? null,
      national_format: data.national_format ?? null,
      carrier: data.carrier ?? null,
      caller_name: data.caller_name ?? null,
    };

    if (jsonOutput) {
      outputJson(result);
    } else {
      const carrier = asRecord(result.carrier);
      const callerName = asRecord(result.caller_name);
      printSuccess("Number lookup complete!", {
        "Phone Number": result.phone_number,
        Country: stringValue(result.country_code) || "(not returned)",
        "National Format": stringValue(result.national_format) || "(not returned)",
        Carrier: stringValue(carrier.name) || "(not returned)",
        "Line Type": stringValue(carrier.type) || "(not returned)",
        "Caller Name": stringValue(callerName.caller_name) || "(not returned)",
      });
    }
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

function normalizeNumberList(response: unknown): NumberListResult {
  const envelope = asRecord(response);
  const data = Array.isArray(envelope.data)
    ? envelope.data.filter((item): item is JsonRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    : [];
  return {
    count: data.length,
    phone_numbers: data,
    meta: asRecord(envelope.meta),
  };
}

function presentNumberList(title: string, result: NumberListResult, jsonOutput: boolean): void {
  if (jsonOutput) {
    outputJson(result);
    return;
  }

  printSuccess(`${title} retrieved!`, { Count: result.count });
  for (const number of result.phone_numbers) {
    const phoneNumber = stringValue(number.phone_number) || "(unknown)";
    const details = [number.status, number.phone_number_type, number.locality]
      .map(stringValue)
      .filter(Boolean)
      .join(" · ");
    console.log(`  • ${phoneNumber}${details ? ` — ${details}` : ""}`);
  }
  if (result.count === 0) console.log("  (no phone numbers returned)");
  console.log();
}

function addMappedFlag(args: string[], flags: Flags, source: string, target: string): void {
  const value = stringFlag(flags, source);
  if (value !== undefined) args.push(target, value);
}

function addIntegerFlag(
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
