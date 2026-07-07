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
  // Flags for the advanced call-control actions.
  const audioUrl = flags["audio-url"] as string | undefined;
  const queueName = flags["queue-name"] as string | undefined;
  const body = flags["body"] as string | undefined;
  const contentType = flags["content-type"] as string | undefined;
  const clientState = flags["client-state"] as string | undefined;
  const commandId = flags["command-id"] as string | undefined;
  // Flags for media forking (start-forking).
  const forkTarget = flags["fork-target"] as string | undefined;
  const forkRx = flags["fork-rx"] as string | undefined;
  const forkTx = flags["fork-tx"] as string | undefined;

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
    audioUrl,
    queueName,
    body,
    contentType,
    clientState,
    commandId,
    forkTarget,
    forkRx,
    forkTx,
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
    audioUrl?: string;
    queueName?: string;
    body?: string;
    contentType?: string;
    clientState?: string;
    commandId?: string;
    forkTarget?: string;
    forkRx?: string;
    forkTx?: string;
  },
): string[] {
  switch (action) {
    case "answer":
      return [
        "calls:actions", "answer",
        "--call-control-id", opts.callControlId,
        ...(opts.deepfakeDetection ? ["--deepfake-detection"] : []),
        ...(opts.record ? ["--record"] : []),
        ...(opts.webhookUrl ? ["--webhook-url", opts.webhookUrl] : []),
      ];
    case "hangup":
      return ["calls:actions", "hangup", "--call-control-id", opts.callControlId];
    case "transfer":
      return ["calls:actions", "transfer", "--call-control-id", opts.callControlId, "--to", opts.to!];
    case "dtmf":
      return ["calls:actions", "send-dtmf", "--call-control-id", opts.callControlId, "--digits", opts.digits!];
    case "start-recording":
      return [
        "calls:actions", "start-recording",
        "--call-control-id", opts.callControlId,
        ...(opts.channels ? ["--channels", opts.channels] : []),
        ...(opts.format ? ["--format", opts.format] : []),
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
      return ["calls:actions", "reject", "--call-control-id", opts.callControlId];
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
      if (opts.forkTarget) forkArgs.push("--target", opts.forkTarget);
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
