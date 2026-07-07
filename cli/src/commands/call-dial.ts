/**
 * telnyx-agent call-dial — Make an outbound call via Telnyx Call Control.
 *
 * Wraps the Go CLI's `calls dial` subcommand. Returns the new call-control-id so
 * the agent can immediately drive the call with `call-control`.
 */

import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { printSuccess, printError, outputJson } from "../utils/output.ts";

interface CallDialResult {
  call_control_id: string;
  call_leg_id?: string;
  call_session_id?: string;
  is_alive?: boolean;
}

/** E.164: a leading '+' then 1-15 digits, country code must not start with 0. */
const E164_RE = /^\+[1-9]\d{1,14}$/;

/** Valid HTTP methods for --webhook-url-method. */
const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

export async function callDialCommand(flags: Record<string, string | boolean>): Promise<void> {
  const jsonOutput = flags.json === true;
  const connectionId = flags["connection-id"] as string | undefined;
  const from = flags["from"] as string | undefined;
  const to = flags["to"] as string | undefined;
  const answeringMachineDetection = flags["answering-machine-detection"] === true;
  const deepfakeDetection = flags["deepfake-detection"] === true;
  const record = flags.record === true;
  const webhookUrl = flags["webhook-url"] as string | undefined;
  const audioUrl = flags["audio-url"] as string | undefined;
  const timeoutSecs = flags["timeout-secs"] as string | undefined;
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

  const args: string[] = [
    "calls", "dial",
    "--connection-id", connectionId,
    "--from", from,
    "--to", to,
  ];
  if (answeringMachineDetection) args.push("--answering-machine-detection");
  if (deepfakeDetection) args.push("--deepfake-detection");
  if (record) args.push("--record");
  if (webhookUrl) args.push("--webhook-url", webhookUrl);
  if (audioUrl) args.push("--audio-url", audioUrl);
  if (timeoutSecs) args.push("--timeout-secs", timeoutSecs);
  if (privacy) args.push("--privacy", privacy);
  if (fromDisplayName) args.push("--from-display-name", fromDisplayName);
  if (timeLimitSecs) args.push("--time-limit-secs", timeLimitSecs);
  if (transcription) args.push("--transcription");
  if (mediaEncryption) args.push("--media-encryption", mediaEncryption);
  if (clientState) args.push("--client-state", clientState);
  if (commandId) args.push("--command-id", commandId);
  if (webhookUrlMethod) args.push("--webhook-url-method", webhookUrlMethod);
  if (webhookUrls) args.push("--webhook-urls", webhookUrls);

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

    const res = await telnyxCli(args);
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
      if (answeringMachineDetection) details["AMD"] = "enabled";
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
  if (err instanceof TelnyxCLIError) return err.stderr || err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}
