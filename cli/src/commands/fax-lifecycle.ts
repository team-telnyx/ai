/**
 * Fax lifecycle commands backed by the Stainless-generated Go CLI.
 *
 * These are direct wrappers over `faxes retrieve` and the
 * `faxes:actions cancel|refresh` action group.
 */

import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { outputJson, printError, printSuccess } from "../utils/output.ts";

type Flags = Record<string, string | boolean>;
type JsonRecord = Record<string, unknown>;

export interface FaxStatusResult {
  fax_id: string;
  status: string;
  direction?: string;
  connection_id?: string;
  from?: string;
  to?: string;
  page_count?: number;
  created_at?: string;
  updated_at?: string;
  completed_at?: string;
  failure_reason?: string;
  media_url?: string;
}

export interface FaxCancelResult {
  fax_id: string;
  result: string;
  cancelled: true;
}

export interface FaxRefreshResult {
  fax_id: string;
  result: string;
  media_url?: string;
  refreshed: true;
}

/** Retrieve the latest server-side state for one fax. */
export async function faxStatusCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const id = requireFaxId(flags, jsonOutput);

  try {
    const response = await telnyxCli(["faxes", "retrieve", "--id", id]);
    const data = responseData(response);
    const result = normalizeFaxStatus(data, id);

    if (jsonOutput) {
      outputJson(result);
    } else {
      const details: Record<string, string | number | boolean> = {
        "Fax ID": result.fax_id,
        Status: result.status,
      };
      addDetail(details, "Direction", result.direction);
      addDetail(details, "Connection ID", result.connection_id);
      addDetail(details, "From", result.from);
      addDetail(details, "To", result.to);
      addDetail(details, "Pages", result.page_count);
      addDetail(details, "Created At", result.created_at);
      addDetail(details, "Updated At", result.updated_at);
      addDetail(details, "Completed At", result.completed_at);
      addDetail(details, "Failure Reason", result.failure_reason);
      addDetail(details, "Media URL", result.media_url);
      printSuccess("Fax status retrieved!", details);
    }
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

/** Request cancellation of an outbound fax that is still in a cancellable state. */
export async function faxCancelCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const id = requireFaxId(flags, jsonOutput);

  try {
    const response = await telnyxCli(["faxes:actions", "cancel", "--id", id]);
    const data = responseData(response);
    const result: FaxCancelResult = {
      fax_id: stringValue(data.id) || id,
      result: stringValue(data.result) || "cancel_requested",
      cancelled: true,
    };

    if (jsonOutput) {
      outputJson(result);
    } else {
      printSuccess("Fax cancellation requested!", {
        "Fax ID": result.fax_id,
        Result: result.result,
      });
    }
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

/** Refresh an expired temporary media URL for an inbound fax. */
export async function faxRefreshCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const id = requireFaxId(flags, jsonOutput);

  try {
    const response = await telnyxCli(["faxes:actions", "refresh", "--id", id]);
    const data = responseData(response);
    const mediaUrl = stringValue(data.media_url) || undefined;
    const result: FaxRefreshResult = {
      fax_id: stringValue(data.id) || id,
      result: stringValue(data.result) || "refresh_requested",
      ...(mediaUrl ? { media_url: mediaUrl } : {}),
      refreshed: true,
    };

    if (jsonOutput) {
      outputJson(result);
    } else {
      const details: Record<string, string | number | boolean> = {
        "Fax ID": result.fax_id,
        Result: result.result,
      };
      addDetail(details, "Media URL", result.media_url);
      printSuccess("Fax media URL refreshed!", details);
    }
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

function normalizeFaxStatus(data: JsonRecord, fallbackId: string): FaxStatusResult {
  const direction = optionalString(data.direction);
  const connectionId = optionalString(data.connection_id);
  const from = optionalString(data.from);
  const to = optionalString(data.to);
  const pageCount = numberValue(data.page_count);
  const createdAt = optionalString(data.created_at);
  const updatedAt = optionalString(data.updated_at);
  const completedAt = optionalString(data.completed_at);
  const failureReason = optionalString(data.failure_reason);
  const mediaUrl = optionalString(data.media_url);

  return {
    fax_id: stringValue(data.id) || fallbackId,
    status: stringValue(data.status) || "unknown",
    ...(direction ? { direction } : {}),
    ...(connectionId ? { connection_id: connectionId } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(pageCount !== undefined ? { page_count: pageCount } : {}),
    ...(createdAt ? { created_at: createdAt } : {}),
    ...(updatedAt ? { updated_at: updatedAt } : {}),
    ...(completedAt ? { completed_at: completedAt } : {}),
    ...(failureReason ? { failure_reason: failureReason } : {}),
    ...(mediaUrl ? { media_url: mediaUrl } : {}),
  };
}

function requireFaxId(flags: Flags, jsonOutput: boolean): string {
  const value = flags.id;
  if (typeof value !== "string" || value.length === 0) {
    fail("--id is required (fax ID)", jsonOutput);
  }
  return value;
}

function responseData(response: unknown): JsonRecord {
  const envelope = asRecord(response);
  return asRecord(envelope.data ?? response);
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function optionalString(value: unknown): string | undefined {
  const text = stringValue(value);
  return text || undefined;
}

function stringValue(value: unknown): string {
  return value === undefined || value === null ? "" : String(value);
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function addDetail(
  details: Record<string, string | number | boolean>,
  label: string,
  value: string | number | undefined,
): void {
  if (value !== undefined && value !== "") details[label] = value;
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
