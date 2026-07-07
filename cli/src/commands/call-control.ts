/**
 * telnyx-agent call-control — Call Control actions for an in-progress call.
 *
 * A single command with a `--action` flag dispatches to the Go CLI's
 * `calls:actions <sub>` subcommands, so the command registry stays small while
 * still exposing the full Call Control surface.
 *
 * Supported actions:
 *   answer, hangup, transfer, dtmf, start-recording, stop-recording,
 *   start-noise-suppression, stop-noise-suppression, speak, bridge, refer, reject,
 *   gather, stop-gather, start-playback, stop-playback, start-transcription,
 *   stop-transcription, pause-recording, resume-recording, start-forking,
 *   stop-forking, start-siprec, stop-siprec, start-streaming, stop-streaming,
 *   enqueue, leave-queue, send-sip-info, update-client-state
 */

import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { printSuccess, printError, outputJson } from "../utils/output.ts";

const ACTIONS = [
  "answer", "hangup", "transfer", "dtmf",
  "start-recording", "stop-recording",
  "start-noise-suppression", "stop-noise-suppression",
  "speak", "bridge", "refer", "reject",
  "gather", "stop-gather",
  "start-playback", "stop-playback",
  "start-transcription", "stop-transcription",
  "pause-recording", "resume-recording",
  "start-forking", "stop-forking",
  "start-siprec", "stop-siprec",
  "start-streaming", "stop-streaming",
  "enqueue", "leave-queue",
  "send-sip-info", "update-client-state",
] as const;
type Action = (typeof ACTIONS)[number];

/** E.164: a leading '+' then 1-15 digits, country code must not start with 0. */
const E164_RE = /^\+[1-9]\d{1,14}$/;

/** Valid causes for the Reject API (required by POST /calls/{id}/actions/reject). */
const REJECT_CAUSES = ["CALL_REJECTED", "USER_BUSY"] as const;

interface CallControlResult {
  action: string;
  call_control_id: string | null;
  result: unknown;
}

export async function callControlCommand(flags: Record<string, string | boolean>): Promise<void> {
  const jsonOutput = flags.json === true;
  const action = flags.action as string | undefined;
  const callControlId = flags["call-control-id"] as string | undefined;
  const to = flags.to as string | undefined;
  const digits = flags.digits as string | undefined;
  const payload = flags.payload as string | undefined;
  const voice = (flags.voice as string | undefined) || "female";
  const callControlId2 = flags["call-control-id-2"] as string | undefined;
  const sipAddress = flags["sip-address"] as string | undefined;
  const channels = flags.channels as string | undefined;
  const format = flags.format as string | undefined;
  const deepfakeDetection = flags["deepfake-detection"] === true;
  const record = flags.record === true;
  const webhookUrl = flags["webhook-url"] as string | undefined;
  // --cause defaults to CALL_REJECTED, the generic rejection cause.
  const cause = (typeof flags.cause === "string" ? flags.cause : undefined) ?? "CALL_REJECTED";

  if (!action) {
    printError(`--action is required. Valid actions: ${ACTIONS.join(", ")}`);
    process.exit(1);
  }
  if (!ACTIONS.includes(action as Action)) {
    printError(`Unknown --action: ${action}. Valid actions: ${ACTIONS.join(", ")}`);
    process.exit(1);
  }
  const act = action as Action;

  // Every action needs a call-control-id (bridge uses it as the first leg).
  if (!callControlId) {
    printError("--call-control-id is required");
    process.exit(1);
  }

  // Action-specific flag validation
  if (act === "transfer") {
    if (!to) {
      printError("--to is required for transfer (E.164 destination number)");
      process.exit(1);
    }
    if (!E164_RE.test(to)) {
      printError(`Invalid --to number: ${to}. Must be E.164 (e.g. +13125559999)`);
      process.exit(1);
    }
  }
  if (act === "dtmf" && !digits) {
    printError("--digits is required for dtmf (e.g. 1234 or *,#)");
    process.exit(1);
  }
  if (act === "speak" && !payload) {
    printError("--payload is required for speak (text to synthesize)");
    process.exit(1);
  }
  if (act === "bridge" && !callControlId2) {
    printError("--call-control-id-2 is required for bridge (the second call to bridge with)");
    process.exit(1);
  }
  if (act === "refer" && !sipAddress) {
    printError("--sip-address is required for refer (e.g. sip:user@example.com)");
    process.exit(1);
  }
  if (act === "reject" && !REJECT_CAUSES.includes(cause as (typeof REJECT_CAUSES)[number])) {
    printError(`Invalid --cause: ${cause}. Must be one of: ${REJECT_CAUSES.join(", ")}`);
    process.exit(1);
  }
  if (act === "start-recording") {
    if (channels !== undefined && !["single", "dual"].includes(channels)) {
      printError(`Invalid --channels: ${channels}. Must be 'single' or 'dual'`);
      process.exit(1);
    }
    if (format !== undefined && !["mp3", "wav"].includes(format)) {
      printError(`Invalid --format: ${format}. Must be 'mp3' or 'wav'`);
      process.exit(1);
    }
  }
  // gather accepts optional client-state/command-id; forward only if provided.
  if (act === "start-playback" && !audioUrl) {
    printError("--audio-url is required for start-playback (URL of audio to play)");
    process.exit(1);
  }
  if (act === "enqueue" && !queueName) {
    printError("--queue-name is required for enqueue");
    process.exit(1);
  }
  if (act === "send-sip-info") {
    if (!body) {
      printError("--body is required for send-sip-info (SIP INFO body content)");
      process.exit(1);
    }
    if (!contentType) {
      printError("--content-type is required for send-sip-info (e.g. application/dtmf-relay)");
      process.exit(1);
    }
  }
  if (act === "update-client-state" && !clientState) {
    printError("--client-state is required for update-client-state");
    process.exit(1);
  }
  // start-forking requires either a target or both rx+tx (the Voice API
  // rejects fork_start without a destination).
  if (act === "start-forking" && !forkTarget && !(forkRx && forkTx)) {
    printError("--fork-target (or both --fork-rx and --fork-tx) is required for start-forking");
    process.exit(1);
  }

  const args = buildActionArgs(act, {
    callControlId,
    callControlId2,
    to,
    digits,
    payload,
    voice,
    sipAddress,
    channels,
    format,
    deepfakeDetection,
    record,
    webhookUrl,
    cause,
  });

  try {
    if (!jsonOutput) console.log(`\n📞 Call Control: ${act}...`);
    const res = await telnyxCli(args);
    const data = res?.data ?? res;

    const result: CallControlResult = {
      action: act,
      call_control_id: callControlId,
      result: data,
    };

    if (jsonOutput) {
      outputJson(result);
    } else {
      const details: Record<string, string | number | boolean> = {
        "Action": act,
        "Call Control ID": callControlId,
      };
      if (act === "bridge") details["Bridged With"] = callControlId2 ?? "";
      printSuccess(`Call Control '${act}' completed`, details);
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

function buildActionArgs(
  action: Action,
  opts: {
    callControlId: string;
    callControlId2?: string;
    to?: string;
    digits?: string;
    payload?: string;
    voice: string;
    sipAddress?: string;
    channels?: string;
    format?: string;
    deepfakeDetection: boolean;
    record: boolean;
    webhookUrl?: string;
    cause: string;
  },
): string[] {
  switch (action) {
    case "answer":
      return [
        "calls:actions", "answer",
        "--call-control-id", opts.callControlId,
        // deepfake_detection is an object in the Answer API; the Go CLI exposes it via inner flags.
        ...(opts.deepfakeDetection ? ["--deepfake-detection.enabled"] : []),
        // The Go CLI's --record flag takes the event to record from, not a boolean.
        ...(opts.record ? ["--record", "record-from-answer"] : []),
        ...(opts.webhookUrl ? ["--webhook-url", opts.webhookUrl] : []),
      ];
    case "hangup":
      return ["calls:actions", "hangup", "--call-control-id", opts.callControlId];
    case "transfer":
      return ["calls:actions", "transfer", "--call-control-id", opts.callControlId, "--to", opts.to!];
    case "dtmf":
      return ["calls:actions", "send-dtmf", "--call-control-id", opts.callControlId, "--digits", opts.digits!];
    case "start-recording":
      // The Go CLI treats --channels and --format as required for
      // start-recording. Supply safe defaults (single/mp3) when the caller
      // omits them so the command works out of the box instead of erroring.
      return [
        "calls:actions", "start-recording",
        "--call-control-id", opts.callControlId,
        "--channels", opts.channels ?? "single",
        "--format", opts.format ?? "mp3",
      ];
    case "stop-recording":
      return ["calls:actions", "stop-recording", "--call-control-id", opts.callControlId];
    case "start-noise-suppression":
      return ["calls:actions", "start-noise-suppression", "--call-control-id", opts.callControlId];
    case "stop-noise-suppression":
      return ["calls:actions", "stop-noise-suppression", "--call-control-id", opts.callControlId];
    case "speak":
      return [
        "calls:actions", "speak",
        "--call-control-id", opts.callControlId,
        "--payload", opts.payload!,
        "--voice", opts.voice,
      ];
    case "bridge":
      return [
        "calls:actions", "bridge",
        "--call-control-id-to-bridge", opts.callControlId,
        "--call-control-id-to-bridge-with", opts.callControlId2!,
      ];
    case "refer":
      return ["calls:actions", "refer", "--call-control-id", opts.callControlId, "--sip-address", opts.sipAddress!];
    case "reject":
      // The Reject API requires a cause (CALL_REJECTED or USER_BUSY).
      return ["calls:actions", "reject", "--call-control-id", opts.callControlId, "--cause", opts.cause];
  }
}

function errorMsg(err: unknown): string {
  if (err instanceof TelnyxCLIError) return err.stderr || err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}
