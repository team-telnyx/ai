/**
 * Fax discovery backed by the Stainless-generated Go CLI `faxes list` command.
 *
 * Raw output preserves the API's single `{ data, meta }` list envelope for a
 * stable agent-facing result. The generated fax command exposes date,
 * direction, from, and to filters.
 */

import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { outputJson, printError, printSuccess } from "../utils/output.ts";

type Flags = Record<string, string | boolean>;
type JsonRecord = Record<string, unknown>;

interface FaxListResult {
  count: number;
  faxes: JsonRecord[];
  meta: JsonRecord;
}

const FILTERS = ["direction", "from", "to"] as const;

/** List inbound and outbound faxes, with generated API filters and pagination. */
export async function listFaxesCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const args = ["faxes", "list"];

  addJsonObjectFlag(args, flags, "created-at", "--filter.created-at", jsonOutput);
  for (const name of FILTERS) {
    addEqualityFilter(args, flags, name, jsonOutput);
  }
  addPositiveIntegerFlag(args, flags, "page-number", jsonOutput);
  addPositiveIntegerFlag(args, flags, "page-size", jsonOutput);
  addMaxItemsFlag(args, flags, jsonOutput);

  try {
    const envelope = asRecord(await telnyxCli(args, { format: "raw" }));
    const faxes = objectArray(envelope.data);

    presentFaxList({ count: faxes.length, faxes, meta: asRecord(envelope.meta) }, jsonOutput);
  } catch (error) {
    fail(errorMessage(error), jsonOutput);
  }
}

function presentFaxList(result: FaxListResult, jsonOutput: boolean): void {
  if (jsonOutput) {
    outputJson(result);
    return;
  }

  printSuccess("Faxes retrieved!", { Count: result.count });
  for (const fax of result.faxes) {
    const id = stringValue(fax.id) || "(unknown)";
    const details = [fax.direction, fax.status, fax.from, fax.to, fax.created_at]
      .map(stringValue)
      .filter(Boolean)
      .join(" · ");
    console.log(`  • ${id}${details ? ` — ${details}` : ""}`);
  }
  if (result.count === 0) console.log("  (no faxes returned)");
  console.log();
}

function addEqualityFilter(
  args: string[],
  flags: Flags,
  name: typeof FILTERS[number],
  jsonOutput: boolean,
): void {
  const value = optionalStringFlag(flags, name, jsonOutput);
  if (value !== undefined) args.push(`--filter.${name}`, JSON.stringify({ eq: value }));
}

function addJsonObjectFlag(
  args: string[],
  flags: Flags,
  source: "created-at",
  target: string,
  jsonOutput: boolean,
): void {
  const value = optionalStringFlag(flags, source, jsonOutput);
  if (value === undefined) return;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      fail(`--${source} must be a JSON object`, jsonOutput);
    }
    args.push(target, JSON.stringify(parsed));
  } catch (error) {
    fail(`--${source} must be a JSON object: ${error instanceof Error ? error.message : String(error)}`, jsonOutput);
  }
}

function addPositiveIntegerFlag(
  args: string[],
  flags: Flags,
  source: "page-number" | "page-size",
  jsonOutput: boolean,
): void {
  const raw = flags[source];
  if (raw === undefined) return;
  if (typeof raw !== "string") fail(`--${source} must be a positive safe integer`, jsonOutput);
  const parsed = Number(raw);
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(parsed) || parsed < 1) {
    fail(`--${source} must be a positive safe integer`, jsonOutput);
  }
  args.push(`--${source}`, raw);
}

function addMaxItemsFlag(args: string[], flags: Flags, jsonOutput: boolean): void {
  const raw = flags["max-items"];
  if (raw === undefined) return;
  if (typeof raw !== "string") fail("--max-items must be -1 or a non-negative safe integer", jsonOutput);
  const parsed = Number(raw);
  if (!/^(?:-1|\d+)$/.test(raw) || !Number.isSafeInteger(parsed)) {
    fail("--max-items must be -1 or a non-negative safe integer", jsonOutput);
  }
  args.push("--max-items", raw);
}

function optionalStringFlag(flags: Flags, key: string, jsonOutput: boolean): string | undefined {
  const value = flags[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.trim() === "") {
    fail(`--${key} requires a non-empty value`, jsonOutput);
  }
  return value;
}

function objectArray(value: unknown): JsonRecord[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is JsonRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item),
      )
    : [];
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function stringValue(value: unknown): string {
  return value === undefined || value === null ? "" : String(value);
}

function errorMessage(error: unknown): string {
  if (error instanceof TelnyxCLIError) return error.stderr || error.message;
  if (error instanceof Error) return error.message;
  return String(error);
}

function fail(message: string, jsonOutput: boolean): never {
  if (jsonOutput) outputJson({ error: message });
  else printError(message);
  process.exit(1);
}
