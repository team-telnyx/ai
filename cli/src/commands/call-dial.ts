/**
 * telnyx-agent call-dial — Make an outbound call via Telnyx Call Control.
 *
 * Direct REST call to POST /v2/calls (AIF-327).
 *
 * The pinned Go CLI's `calls dial` subcommand mangled the `--to` value: a valid
 * +E.164 number (e.g. +94771280314) was rejected with 422 error 10016
 * ("'to' must be a phone number in +E164 format or a SIP endpoint") even though
 * the CLI echoed the value correctly. The identical payload via raw POST /v2/calls
 * succeeds, so we bypass the Go CLI and call the REST API directly. Returns the
 * new call-control-id so the agent can immediately drive the call with
 * `call-control`.
 */

import { TelnyxClient, TelnyxAPIError } from "../client.ts";
import { printSuccess, printError, outputJson } from "../utils/output.ts";

interface CallDialResult {
  call_control_id: string;
  call_leg_id?: string;
  call_session_id?: string;
  is_alive?: boolean;
}

/** E.164: a leading '+' then 1-15 digits, country code must not start with 0. */
const E164_RE = /^\+[1-9]\d{1,14}$/;

/** Valid AMD modes (Go CLI accepts these as the --answering-machine-detection value). */
const AMD_MODES = ["premium", "detect", "detect_beep", "detect_words", "greeting_end", "disabled"] as const;

/** Valid HTTP methods for --webhook-url-method (Voice API only accepts GET/POST). */
const HTTP_METHODS = ["GET", "POST"] as const;

export async function callDialCommand(flags: Record<string, string | boolean>): Promise<void> {
  const jsonOutput = flags.json === true;
  const connectionId = flags["connection-id"] as string | undefined;
  const from = flags["from"] as string | undefined;
  const to = flags["to"] as string | undefined;
  // --answering-machine-detection [mode] — bare flag enables standard detection ("detect").
  const amdRaw = flags["answering-machine-detection"];
  const answeringMachineDetection = amdRaw === true ? "detect" : (amdRaw as string | undefined);
  const deepfakeDetection = flags["deepfake-detection"] === true;
  const record = flags.record === true;
  const webhookUrl = flags["webhook-url"] as string | undefined;
  const audioUrl = flags["audio-url"] as string | undefined;
  const timeoutSecs = flags["timeout-secs"] as string | undefined;
  const retryOnTimeout = flags["retry-on-timeout"];
  const routeToMobile = flags["route-to-mobile"];
  // New flags (number masking + advanced dial options).
  const privacy = flags["privacy"] as string | undefined;
  const fromDisplayName = flags["from-display-name"] as string | undefined;
  const timeLimitSecs = flags["time-limit-secs"] as string | undefined;
  const transcription = flags["transcription"] === true;
  const mediaEncryption = flags["media-encryption"] as string | undefined;
  const clientState = flags["client-state"] as string | undefined;
  const commandId = flags["command-id"] as string | undefined;
  const webhookUrlMethod = flags["webhook-url-method"] as string | undefined;
  const webhookUrls = flags["webhook-urls"] as string | undefined;

  // Validate required flags
  if (!connectionId) {
    printError("--connection-id is required (the Call Control connection to dial from)");
    process.exit(1);
  }
  if (!from) {
    printError("--from is required (E.164 number to call from, e.g. +13125550000)");
    process.exit(1);
  }
  if (!E164_RE.test(from)) {
    printError(`Invalid --from number: ${from}. Must be E.164 (e.g. +13125550000)`);
    process.exit(1);
  }
  if (!to) {
    printError("--to is required (E.164 number to call, e.g. +13125551234)");
    process.exit(1);
  }
  if (!E164_RE.test(to)) {
    printError(`Invalid --to number: ${to}. Must be E.164 (e.g. +13125551234)`);
    process.exit(1);
  }
  if (timeoutSecs !== undefined && (!/^\d+$/.test(timeoutSecs) || Number(timeoutSecs) <= 0)) {
    printError(`Invalid --timeout-secs: ${timeoutSecs}. Must be a positive integer`);
    process.exit(1);
  }
  if (
    retryOnTimeout !== undefined
    && retryOnTimeout !== true
    && retryOnTimeout !== false
    && retryOnTimeout !== "true"
    && retryOnTimeout !== "false"
  ) {
    printError(`Invalid --retry-on-timeout: ${String(retryOnTimeout)}. Must be true or false`);
    process.exit(1);
  }
  if (
    routeToMobile !== undefined
    && routeToMobile !== true
    && routeToMobile !== false
    && routeToMobile !== "true"
    && routeToMobile !== "false"
  ) {
    printError(`Invalid --route-to-mobile: ${String(routeToMobile)}. Must be true or false`);
    process.exit(1);
  }
  if (privacy !== undefined && !["id", "none"].includes(privacy)) {
    printError(`Invalid --privacy: ${privacy}. Must be 'id' (number masking) or 'none'`);
    process.exit(1);
  }
  if (timeLimitSecs !== undefined && (!/^\d+$/.test(timeLimitSecs) || Number(timeLimitSecs) <= 0)) {
    printError(`Invalid --time-limit-secs: ${timeLimitSecs}. Must be a positive integer`);
    process.exit(1);
  }
  if (webhookUrlMethod !== undefined && !HTTP_METHODS.includes(webhookUrlMethod.toUpperCase() as (typeof HTTP_METHODS)[number])) {
    printError(`Invalid --webhook-url-method: ${webhookUrlMethod}. Must be one of ${HTTP_METHODS.join(", ")}`);
    process.exit(1);
  }

  if (answeringMachineDetection !== undefined && !AMD_MODES.includes(answeringMachineDetection as (typeof AMD_MODES)[number])) {
    printError(`Invalid --answering-machine-detection mode: ${answeringMachineDetection}. Must be one of: ${AMD_MODES.join(", ")}`);
    process.exit(1);
  }

  // Build the REST request body (snake_case, per POST /v2/calls).
  const body: Record<string, unknown> = {
    connection_id: connectionId,
    from,
    to,
  };
  if (answeringMachineDetection) body.answering_machine_detection = answeringMachineDetection;
  // deepfake_detection is an object on the API.
  if (deepfakeDetection) body.deepfake_detection = { enabled: true };
  // `record` takes the event to record from (default: record-from-answer).
  if (record) body.record = "record-from-answer";
  if (webhookUrl) body.webhook_url = webhookUrl;
  if (audioUrl) body.audio_url = audioUrl;
  if (timeoutSecs) body.timeout_secs = Number(timeoutSecs);
  if (retryOnTimeout !== undefined) {
    body.retry_on_timeout = retryOnTimeout === true || retryOnTimeout === "true";
  }
  if (routeToMobile !== undefined) {
    body.route_to_mobile = routeToMobile === true || routeToMobile === "true";
  }
  if (privacy) body.privacy = privacy;
  if (fromDisplayName) body.from_display_name = fromDisplayName;
  if (timeLimitSecs) body.time_limit_secs = Number(timeLimitSecs);
  if (transcription) body.transcription = true;
  if (mediaEncryption) body.media_encryption = mediaEncryption;
  if (clientState) body.client_state = clientState;
  if (commandId) body.command_id = commandId;
  // Forward the normalized uppercase value so the API receives POST/GET, not post/get.
  if (webhookUrlMethod) body.webhook_url_method = webhookUrlMethod.toUpperCase();
  // The Dial API defines `webhook_urls` as an object map of event types to
  // URLs (not a plain string). Parse/validate the flag as JSON so per-event
  // webhook routing reaches the API as the correct type instead of 422-ing.
  if (webhookUrls) {
    try {
      const parsed = JSON.parse(webhookUrls);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        throw new Error("not an object");
      }
      body.webhook_urls = parsed;
    } catch {
      printError("--webhook-urls must be a JSON object mapping event types to URLs, e.g. '{\"call.answered\":\"https://example.com/hook\"}'");
      process.exit(1);
    }
  }

  try {
    if (!jsonOutput) {
      console.log("\n📞 Dialing outbound call...");
      console.log(`  From:           ${from}`);
      console.log(`  To:             ${to}`);
      console.log(`  Connection ID:  ${connectionId}`);
      if (privacy === "id") console.log(`  Privacy:        number masking (caller ID hidden)`);
      if (fromDisplayName) console.log(`  Caller ID Name: ${fromDisplayName}`);
      console.log();
    }

    const client = new TelnyxClient();
    const res = await client.post("/calls", body);
    const data = (res?.data ?? res ?? {}) as Record<string, unknown>;
    const callControlId = String(data.call_control_id ?? "");

    const result: CallDialResult = {
      call_control_id: callControlId,
      call_leg_id: data.call_leg_id as string | undefined,
      call_session_id: data.call_session_id as string | undefined,
      is_alive: data.is_alive as boolean | undefined,
    };

    if (jsonOutput) {
      outputJson(result);
    } else {
      const details: Record<string, string | number | boolean> = {
        "Call Control ID": callControlId,
        "From": from,
        "To": to,
        "Connection ID": connectionId,
      };
      if (privacy === "id") details["Privacy"] = "number masking (caller ID hidden)";
      if (fromDisplayName) details["Caller ID Name"] = fromDisplayName;
      if (answeringMachineDetection) details["AMD"] = answeringMachineDetection;
      if (deepfakeDetection) details["Deepfake Detection"] = "enabled";
      if (record) details["Recording"] = "enabled";
      if (transcription) details["Transcription"] = "enabled";
      printSuccess("Outbound call placed!", details);
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
