/**
 * telnyx-agent send-sms — Send an SMS or MMS message.
 *
 * Sender mode is inferred from the intuitive sender inputs:
 * - E.164 --from: regular phone-number send
 * - alphanumeric --from + --messaging-profile-id: alphanumeric sender send
 * - no --from + --messaging-profile-id: number-pool send
 */

import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { printSuccess, printError, outputJson, failWith } from "../utils/output.ts";
import { deriveMessageStatus } from "../utils/message-status.ts";

type SmsSenderMode = "phone-number" | "alphanumeric" | "number-pool";

interface SendSmsResult {
  message_id: string;
  status: string;
  type: "SMS" | "MMS";
  sender_mode: SmsSenderMode;
  from?: string;
  to: string;
  messaging_profile_id?: string;
}

const E164 = /^\+[1-9]\d{1,14}$/;

export async function sendSmsCommand(flags: Record<string, string | boolean>): Promise<void> {
  const jsonOutput = flags.json === true;
  const from = flags.from as string | undefined;
  const to = flags.to as string | undefined;
  const text = flags.text as string | undefined;
  const mediaUrl = flags["media-url"] as string | undefined;
  const messagingProfileId = flags["messaging-profile-id"] as string | undefined;
  const webhookUrl = flags["webhook-url"] as string | undefined;
  const subject = flags.subject as string | undefined;

  if (!to) failWith("--to is required (E.164 format, e.g., +131****0001)", jsonOutput);
  // --text is required for a plain SMS, but the Telnyx API supports
  // media-only MMS, so only require text when no --media-url is provided.
  if (!text && !mediaUrl) {
    failWith("--text is required (or pass --media-url for a media-only MMS)", jsonOutput);
  }

  const senderMode: SmsSenderMode = !from
    ? "number-pool"
    : E164.test(from)
      ? "phone-number"
      : "alphanumeric";
  const type: "SMS" | "MMS" = mediaUrl ? "MMS" : "SMS";

  if (senderMode !== "phone-number" && !messagingProfileId) {
    failWith(
      senderMode === "number-pool"
        ? "--messaging-profile-id is required when sending from a number pool without --from"
        : "--messaging-profile-id is required for an alphanumeric --from sender",
      jsonOutput,
    );
  }
  if (senderMode === "alphanumeric" && mediaUrl) {
    failWith("Alphanumeric sender IDs support SMS text only; remove --media-url", jsonOutput);
  }
  if (senderMode === "alphanumeric" && subject) {
    failWith("--subject is not supported with an alphanumeric sender", jsonOutput);
  }

  const args = buildSendArgs({
    senderMode,
    from,
    to,
    text,
    mediaUrl,
    messagingProfileId,
    webhookUrl,
    subject,
    type,
  });

  try {
    const res = await telnyxCli(args);
    const data = (res?.data ?? res) as Record<string, unknown>;
    const messageId = String(data.id ?? data.message_id ?? "");
    const status = deriveMessageStatus(data, "queued");
    const responseFrom = data.from && typeof data.from === "object"
      ? String((data.from as Record<string, unknown>).phone_number ?? "")
      : "";

    const result: SendSmsResult = {
      message_id: messageId,
      status,
      type,
      sender_mode: senderMode,
      ...(from || responseFrom ? { from: from ?? responseFrom } : {}),
      to,
      ...(messagingProfileId ? { messaging_profile_id: messagingProfileId } : {}),
    };

    if (jsonOutput) {
      outputJson(result);
    } else {
      printSuccess(`${type} sent!`, {
        "Message ID": messageId,
        Status: status,
        Type: type,
        "Sender Mode": senderMode,
        From: from || responseFrom || "number pool",
        To: to,
      });
    }
  } catch (err) {
    if (jsonOutput) {
      outputJson({ error: errorMsg(err) });
    } else {
      printError(errorMsg(err));
    }
    process.exit(1);
  }
}

interface SendArgsInput {
  senderMode: SmsSenderMode;
  from?: string;
  to: string;
  text?: string;
  mediaUrl?: string;
  messagingProfileId?: string;
  webhookUrl?: string;
  subject?: string;
  type: "SMS" | "MMS";
}

function buildSendArgs(input: SendArgsInput): string[] {
  const { senderMode, from, to, text, mediaUrl, messagingProfileId, webhookUrl, subject, type } = input;

  if (senderMode === "number-pool") {
    const args = [
      "messages", "send-number-pool",
      "--messaging-profile-id", messagingProfileId!,
      "--to", to,
      "--type", type,
    ];
    if (mediaUrl) args.push("--media-url", mediaUrl);
    if (subject) args.push("--subject", subject);
    if (text) args.push("--text", text);
    if (webhookUrl) args.push("--webhook-url", webhookUrl);
    return args;
  }

  if (senderMode === "alphanumeric") {
    const args = [
      "messages", "send-with-alphanumeric-sender",
      "--from", from!,
      "--messaging-profile-id", messagingProfileId!,
      "--text", text!,
      "--to", to,
    ];
    if (webhookUrl) args.push("--webhook-url", webhookUrl);
    return args;
  }

  const args = [
    "messages", "send",
    "--from", from!,
    "--to", to,
    "--type", type,
  ];
  if (text) args.push("--text", text);
  if (mediaUrl) args.push("--media-url", mediaUrl);
  if (messagingProfileId) args.push("--messaging-profile-id", messagingProfileId);
  if (webhookUrl) args.push("--webhook-url", webhookUrl);
  if (subject) args.push("--subject", subject);
  return args;
}

function errorMsg(err: unknown): string {
  if (err instanceof TelnyxCLIError) return err.stderr || err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}
