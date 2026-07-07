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

/** Valid answering_machine_detection modes accepted by the Dial API. */
const AMD_MODES = ["premium", "detect", "detect_beep", "detect_words", "greeting_end", "disabled"] as const;

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
  if (answeringMachineDetection !== undefined && !AMD_MODES.includes(answeringMachineDetection as (typeof AMD_MODES)[number])) {
    printError(`Invalid --answering-machine-detection mode: ${answeringMachineDetection}. Must be one of: ${AMD_MODES.join(", ")}`);
    process.exit(1);
  }

  const args: string[] = [
    "calls", "dial",
    "--connection-id", connectionId,
    "--from", from,
    "--to", to,
  ];
  // The Go CLI's --answering-machine-detection flag takes a mode value (default "disabled").
  if (answeringMachineDetection) args.push("--answering-machine-detection", answeringMachineDetection);
  // deepfake_detection is an object in the Dial API; the Go CLI exposes it via inner flags.
  if (deepfakeDetection) args.push("--deepfake-detection.enabled");
  // The Go CLI's --record flag takes the event to record from, not a boolean.
  if (record) args.push("--record", "record-from-answer");
  if (webhookUrl) args.push("--webhook-url", webhookUrl);
  if (audioUrl) args.push("--audio-url", audioUrl);
  if (timeoutSecs) args.push("--timeout-secs", timeoutSecs);

  try {
    if (!jsonOutput) {
      console.log("\n📞 Dialing outbound call...");
      console.log(`  From:           ${from}`);
      console.log(`  To:             ${to}`);
      console.log(`  Connection ID:  ${connectionId}`);
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
      if (answeringMachineDetection) details["AMD"] = answeringMachineDetection;
      if (deepfakeDetection) details["Deepfake Detection"] = "enabled";
      if (record) details["Recording"] = "enabled";
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
