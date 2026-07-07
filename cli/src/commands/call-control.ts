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
    audioUrl,
    queueName,
    body,
    contentType,
    clientState,
    commandId,
    forkRx,
    forkTx,
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
    case "gather":
      return [
        "calls:actions", "gather",
        "--call-control-id", opts.callControlId,
        ...(opts.clientState ? ["--client-state", opts.clientState] : []),
        ...(opts.commandId ? ["--command-id", opts.commandId] : []),
      ];
    case "stop-gather":
      return ["calls:actions", "stop-gather", "--call-control-id", opts.callControlId];
    case "start-playback":
      return [
        "calls:actions", "start-playback",
        "--call-control-id", opts.callControlId,
        "--audio-url", opts.audioUrl!,
      ];
    case "stop-playback":
      return ["calls:actions", "stop-playback", "--call-control-id", opts.callControlId];
    case "start-transcription":
      return ["calls:actions", "start-transcription", "--call-control-id", opts.callControlId];
    case "stop-transcription":
      return ["calls:actions", "stop-transcription", "--call-control-id", opts.callControlId];
    case "pause-recording":
      return ["calls:actions", "pause-recording", "--call-control-id", opts.callControlId];
    case "resume-recording":
      return ["calls:actions", "resume-recording", "--call-control-id", opts.callControlId];
    case "start-forking": {
      const forkArgs = ["calls:actions", "start-forking", "--call-control-id", opts.callControlId];
      if (opts.forkRx) forkArgs.push("--rx", opts.forkRx);
      if (opts.forkTx) forkArgs.push("--tx", opts.forkTx);
      return forkArgs;
    }
    case "stop-forking":
      return ["calls:actions", "stop-forking", "--call-control-id", opts.callControlId];
    case "start-siprec":
      return ["calls:actions", "start-siprec", "--call-control-id", opts.callControlId];
    case "stop-siprec":
      return ["calls:actions", "stop-siprec", "--call-control-id", opts.callControlId];
    case "start-streaming":
      return ["calls:actions", "start-streaming", "--call-control-id", opts.callControlId];
    case "stop-streaming":
      return ["calls:actions", "stop-streaming", "--call-control-id", opts.callControlId];
    case "enqueue":
      return [
        "calls:actions", "enqueue",
        "--call-control-id", opts.callControlId,
        "--queue-name", opts.queueName!,
      ];
    case "leave-queue":
      return ["calls:actions", "leave-queue", "--call-control-id", opts.callControlId];
    case "send-sip-info":
      return [
        "calls:actions", "send-sip-info",
        "--call-control-id", opts.callControlId,
        "--body", opts.body!,
        "--content-type", opts.contentType!,
      ];
    case "update-client-state":
      return [
        "calls:actions", "update-client-state",
        "--call-control-id", opts.callControlId,
        "--client-state", opts.clientState!,
      ];
  }
}

function errorMsg(err: unknown): string {
  if (err instanceof TelnyxCLIError) return err.stderr || err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}
