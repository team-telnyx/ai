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
 *   enqueue, leave-queue, send-sip-info, update-client-state,
 *   add-ai-assistant-messages, gather-using-ai, gather-using-audio,
 *   gather-using-speak, join-ai-assistant, start-ai-assistant,
 *   stop-ai-assistant, start-conversation-relay, stop-conversation-relay,
 *   switch-supervisor-role, pay
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
  "add-ai-assistant-messages",
  "gather-using-ai", "gather-using-audio", "gather-using-speak",
  "join-ai-assistant", "start-ai-assistant", "stop-ai-assistant",
  "start-conversation-relay", "stop-conversation-relay",
  "switch-supervisor-role",
  "pay",
] as const;
type Action = (typeof ACTIONS)[number];

/**
 * Flags exposed by generated Go Call Control commands that use the generic
 * dispatcher. Values are forwarded exactly as supplied; omitted optional flags
 * are left to the Go CLI/API defaults. This includes generated inner (dotted)
 * flags.
 */
const NEW_ACTION_FLAGS: Partial<Record<Action, readonly string[]>> = {
  "add-ai-assistant-messages": [
    "client-state", "command-id", "message", "trigger-response",
  ],
  "gather-using-ai": [
    "parameters", "assistant", "client-state", "command-id", "gather-ended-speech", "greeting",
    "interruption-settings", "language", "message-history", "send-message-history-updates",
    "send-partial-results", "transcription", "user-response-timeout-ms", "voice", "voice-settings",
    "assistant.instructions", "assistant.model", "assistant.openai-api-key-ref", "assistant.tools",
    "interruption-settings.enable", "message-history.content", "message-history.role",
    "transcription.language", "transcription.model",
  ],
  "gather-using-audio": [
    "audio-url", "client-state", "command-id", "inter-digit-timeout-millis", "invalid-audio-url",
    "invalid-media-name", "maximum-digits", "maximum-tries", "media-name", "minimum-digits",
    "terminating-digit", "timeout-millis", "valid-digits",
  ],
  "gather-using-speak": [
    "payload", "voice", "client-state", "command-id", "inter-digit-timeout-millis", "invalid-payload",
    "language", "maximum-digits", "maximum-tries", "minimum-digits", "payload-type", "service-level",
    "terminating-digit", "timeout-millis", "valid-digits", "voice-settings",
  ],
  "join-ai-assistant": [
    "conversation-id", "participant", "client-state", "command-id", "participant.id", "participant.role",
    "participant.name", "participant.on-hangup",
  ],
  "start-ai-assistant": [
    "assistant", "client-state", "command-id", "greeting", "interruption-settings", "message-history",
    "participant", "send-message-history-updates", "transcription", "voice", "voice-settings",
    "assistant.id", "assistant.dynamic-variables", "assistant.external-llm", "assistant.fallback-config",
    "assistant.greeting", "assistant.instructions", "assistant.llm-api-key-ref", "assistant.mcp-servers",
    "assistant.model", "assistant.name", "assistant.observability-settings", "assistant.openai-api-key-ref",
    "assistant.tools", "interruption-settings.enable", "participant.id", "participant.role",
    "participant.name", "participant.on-hangup", "transcription.language", "transcription.model",
  ],
  "stop-ai-assistant": ["client-state", "command-id"],
  "start-conversation-relay": [
    "assistant", "client-state", "command-id", "conversation-relay-dtmf-detection",
    "conversation-relay-settings", "conversation-relay-url", "custom-parameters", "dtmf-detection",
    "greeting", "interruptible", "interruptible-greeting", "interruption-settings", "language", "provider",
    "structured-provider", "transcription", "transcription-engine", "transcription-engine-config", "tts-provider",
    "url", "voice", "voice-settings", "assistant.dynamic-variables", "conversation-relay-settings.url",
    "conversation-relay-settings.dtmf-detection", "conversation-relay-settings.interruptible",
    "conversation-relay-settings.interruptible-greeting", "conversation-relay-settings.languages",
    "interruption-settings.enable", "interruption-settings.interruptible",
    "interruption-settings.interruptible-greeting", "interruption-settings.welcome-greeting-interruptible",
    "language.language", "language.speech-model", "language.transcription-engine",
    "language.transcription-engine-config", "language.transcription-provider", "language.tts-provider",
    "language.voice", "language.voice-settings",
  ],
  "stop-conversation-relay": ["client-state", "command-id"],
  "switch-supervisor-role": ["role"],
  "pay": [
    "amount", "client-state", "command-id", "connector-name", "currency", "description",
    "inter-digit-timeout-millis", "language", "max-attempts", "metadata", "parameters",
    "payment-method", "payment-token", "prompts", "service-level", "timeout-millis",
    "transaction-type", "voice", "prompts.bank-account-number", "prompts.bank-routing-number",
    "prompts.expiration-date", "prompts.payment-card-number", "prompts.postal-code",
    "prompts.security-code",
  ],
};

const NEW_ACTION_REQUIRED_FLAGS: Partial<Record<Action, readonly string[]>> = {
  "gather-using-ai": ["parameters"],
  "gather-using-speak": ["payload", "voice"],
  "join-ai-assistant": ["conversation-id", "participant"],
  "switch-supervisor-role": ["role"],
};

const REPEATED_OBJECT_FLAGS = new Set([
  "message",
  "message-history",
  "assistant.mcp-servers",
  "assistant.tools",
  "conversation-relay-settings.languages",
]);

/** Valid causes for the Reject API (required by POST /calls/{id}/actions/reject). */
const REJECT_CAUSES = ["CALL_REJECTED", "USER_BUSY"] as const;

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
  const routeToMobile = flags["route-to-mobile"];
  // Flags for the advanced call-control actions.
  const audioUrl = flags["audio-url"] as string | undefined;
  const queueName = flags["queue-name"] as string | undefined;
  const body = flags["body"] as string | undefined;
  const contentType = flags["content-type"] as string | undefined;
  const clientState = flags["client-state"] as string | undefined;
  const commandId = flags["command-id"] as string | undefined;
  // Flags for media forking (start-forking).
  // The Go CLI supports --rx, --tx, and --stream-type.
  const forkRx = flags["fork-rx"] as string | undefined;
  const forkTx = flags["fork-tx"] as string | undefined;
  const forkStreamType = flags["fork-stream-type"] as string | undefined;
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
  // start-forking requires both rx+tx (the Voice API rejects fork_start
  // without a destination, and the Go CLI only exposes --rx/--tx).
  if (act === "start-forking" && !(forkRx && forkTx)) {
    printError("--fork-rx and --fork-tx are both required for start-forking");
    process.exit(1);
  }
  if (act === "reject" && !REJECT_CAUSES.includes(cause as (typeof REJECT_CAUSES)[number])) {
    printError(`Invalid --cause: ${cause}. Must be one of: ${REJECT_CAUSES.join(", ")}`);
    process.exit(1);
  }
  for (const requiredFlag of NEW_ACTION_REQUIRED_FLAGS[act] ?? []) {
    const value = flags[requiredFlag];
    if (typeof value !== "string" || value.length === 0) {
      printError(`--${requiredFlag} is required for ${act}`);
      process.exit(1);
    }
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
    routeToMobile,
    audioUrl,
    queueName,
    body,
    contentType,
    clientState,
    commandId,
    forkRx,
    forkTx,
    forkStreamType,
    cause,
    actionFlags: flags,
  });

  try {
    if (!jsonOutput) console.log(`\n📞 Call Control: ${act}...`);
    // --route-to-mobile on transfer was added in Go CLI v0.25.0; gate so an
    // older PATH/TELNYX_CLI_PATH binary gets a clear error instead of an arg-parse failure.
    const res = await telnyxCli(args, args.includes("--route-to-mobile") || args.includes("--route-to-mobile=false")
      ? { minimumVersion: "0.25.0" }
      : undefined);
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

/** Agent-friendly alias for the generated `calls:actions pay` command. */
export async function callPayCommand(flags: Record<string, string | boolean>): Promise<void> {
  await callControlCommand({ ...flags, action: "pay" });
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
    routeToMobile?: string | boolean;
    audioUrl?: string;
    queueName?: string;
    body?: string;
    contentType?: string;
    clientState?: string;
    commandId?: string;
    forkRx?: string;
    forkTx?: string;
    forkStreamType?: string;
    cause: string;
    actionFlags: Record<string, string | boolean>;
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
      return [
        "calls:actions", "transfer",
        "--call-control-id", opts.callControlId,
        "--to", opts.to!,
        ...(opts.routeToMobile === undefined
          ? []
          : opts.routeToMobile === true || opts.routeToMobile === "true"
            ? ["--route-to-mobile"]
            : ["--route-to-mobile=false"]),
      ];
    case "dtmf":
      return ["calls:actions", "send-dtmf", "--call-control-id", opts.callControlId, "--digits", opts.digits!];
    case "start-recording":
      return [
        "calls:actions", "start-recording",
        "--call-control-id", opts.callControlId,
        // Supply safe defaults — the Go CLI requires both channels and format.
        ...(opts.channels ? ["--channels", opts.channels] : ["--channels", "single"]),
        ...(opts.format ? ["--format", opts.format] : ["--format", "mp3"]),
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
      return ["calls:actions", "reject", "--call-control-id", opts.callControlId, "--cause", opts.cause];
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
      if (opts.forkStreamType) forkArgs.push("--stream-type", opts.forkStreamType);
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
    case "add-ai-assistant-messages":
    case "gather-using-ai":
    case "gather-using-audio":
    case "gather-using-speak":
    case "join-ai-assistant":
    case "start-ai-assistant":
    case "stop-ai-assistant":
    case "start-conversation-relay":
    case "stop-conversation-relay":
    case "switch-supervisor-role":
    case "pay":
      return buildGeneratedActionArgs(action, opts.callControlId, opts.actionFlags);
  }
}

function buildGeneratedActionArgs(
  action: Action,
  callControlId: string,
  flags: Record<string, string | boolean>,
): string[] {
  const args = ["calls:actions", action, "--call-control-id", callControlId];
  for (const flag of NEW_ACTION_FLAGS[action] ?? []) {
    const value = flags[flag];
    if (typeof value === "string") {
      const values = REPEATED_OBJECT_FLAGS.has(flag) ? parseObjectArray(value) : undefined;
      for (const item of values ?? [value]) args.push(`--${flag}`, item);
    } else if (value === true) {
      args.push(`--${flag}`);
    }
  }
  return args;
}

function parseObjectArray(value: string): string[] | undefined {
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.every((item) => typeof item === "object" && item !== null && !Array.isArray(item))) {
      return parsed.map((item) => JSON.stringify(item));
    }
  } catch {
    // Preserve non-JSON values for the generated CLI to handle as before.
  }
  return undefined;
}

function errorMsg(err: unknown): string {
  if (err instanceof TelnyxCLIError) return err.stderr || err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}
