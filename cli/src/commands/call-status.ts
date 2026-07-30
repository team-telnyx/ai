/**
 * telnyx-agent call-status — Get the status of a call via Telnyx Call Control.
 *
 * Uses the Telnyx REST API directly: GET /v2/calls/{call_control_id}.
 *
 * Why direct REST (AIF-334):
 * The Go CLI's `calls retrieve-status` and the underlying endpoint return only
 * `is_alive` (plus call/leg/session IDs) — there is NO `call_status` string in the
 * response. The previous implementation read a non-existent `call_status` field and
 * always fell back to "unknown", even for live calls. We now call the endpoint
 * directly and derive an explicit status from `is_alive`.
 */

import { TelnyxClient, TelnyxAPIError } from "../client.ts";
import { printSuccess, printError, outputJson } from "../utils/output.ts";

interface CallStatusData {
  record_type?: string;
  call_control_id?: string;
  call_leg_id?: string;
  call_session_id?: string;
  is_alive?: boolean;
  [key: string]: unknown;
}

/**
 * Derive a human-readable status from `is_alive`.
 * The retrieve-status endpoint does not return a call_status enum, so this is the
 * only reliable signal: an alive call is in progress; a non-alive call has ended.
 */
function deriveCallStatus(isAlive: boolean): string {
  return isAlive ? "active" : "ended";
}

export async function callStatusCommand(flags: Record<string, string | boolean>): Promise<void> {
  const jsonOutput = flags.json === true;
  const callControlId = flags["call-control-id"] as string | undefined;

  if (!callControlId) {
    printError("--call-control-id is required");
    process.exit(1);
  }

  try {
    const apiKey = process.env.TELNYX_API_KEY;
    if (!apiKey) throw new Error("TELNYX_API_KEY environment variable is required");
    const client = new TelnyxClient(apiKey);

    if (!jsonOutput) console.log(`\n📞 Retrieving call status for ${callControlId}...`);

    const res = await client.get(`/calls/${encodeURIComponent(callControlId)}`);
    const data = (res?.data ?? res ?? {}) as CallStatusData;

    const ccId = String(data.call_control_id ?? callControlId);
    const isAlive = data.is_alive === true;
    const callStatus = deriveCallStatus(isAlive);

    if (jsonOutput) {
      outputJson({
        call_control_id: ccId,
        call_status: callStatus,
        is_alive: isAlive,
        ...data,
      });
    } else {
      printSuccess("Call status retrieved", {
        "Call Control ID": ccId,
        "Call Status": callStatus,
        "Is Alive": isAlive ? "yes" : "no",
        ...(data.call_session_id ? { "Call Session ID": String(data.call_session_id) } : {}),
        ...(data.call_leg_id ? { "Call Leg ID": String(data.call_leg_id) } : {}),
      });
    }
  } catch (err) {
    const msg = errorMsg(err);
    if (jsonOutput) {
      outputJson({ error: msg });
    } else {
      printError(msg);
    }
    process.exit(1);
  }
}

function errorMsg(err: unknown): string {
  if (err instanceof TelnyxAPIError) return err.detail || err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}
