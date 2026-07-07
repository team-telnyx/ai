/**
 * telnyx-agent send-sms — Send an SMS or MMS message.
 *
 * Shells out to the Go telnyx CLI `messages send` subcommand.
 * Pass --media-url to send an MMS (sets --type MMS automatically).
 */

import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { printSuccess, printError, outputJson } from "../utils/output.ts";
import { deriveMessageStatus } from "../utils/message-status.ts";

interface SendSmsResult {
  message_id: string;
  status: string;
  type: string;
  from: string;
  to: string;
}

export async function sendSmsCommand(flags: Record<string, string | boolean>): Promise<void> {
  const jsonOutput = flags.json === true;
  const from = flags["from"] as string | undefined;
  const to = flags["to"] as string | undefined;
  const text = flags["text"] as string | undefined;
  const mediaUrl = flags["media-url"] as string | undefined;
  const messagingProfileId = flags["messaging-profile-id"] as string | undefined;
  const webhookUrl = flags["webhook-url"] as string | undefined;
  const subject = flags["subject"] as string | undefined;

  if (!from) {
    printError("--from is required (E.164 format, e.g., +13125550000)");
    process.exit(1);
  }
  if (!to) {
    printError("--to is required (E.164 format, e.g., +13125550001)");
    process.exit(1);
  }
  // --text is required for a plain SMS, but the Telnyx API supports
  // media-only MMS, so only require text when no --media-url is provided.
  if (!text && !mediaUrl) {
    printError("--text is required (or pass --media-url for a media-only MMS)");
    process.exit(1);
  }

  // media-url upgrades the send to MMS
  const type = mediaUrl ? "MMS" : "SMS";

  const args: string[] = [
    "messages", "send",
    "--from", from,
    "--to", to,
    "--type", type,
  ];
  if (text) args.push("--text", text);
  if (mediaUrl) args.push("--media-url", mediaUrl);
  if (messagingProfileId) args.push("--messaging-profile-id", messagingProfileId);
  if (webhookUrl) args.push("--webhook-url", webhookUrl);
  if (subject) args.push("--subject", subject);

  try {
    const res = await telnyxCli(args);
    const data = (res?.data ?? res) as Record<string, unknown>;
    const messageId = String(data.id ?? data.message_id ?? "");
    // Delivery state lives on each recipient (data.to[].status), not top-level.
    const status = deriveMessageStatus(data, "queued");

    const result: SendSmsResult = {
      message_id: messageId,
      status,
      type,
      from,
      to,
    };

    if (jsonOutput) {
      outputJson(result);
    } else {
      printSuccess(`${type} sent!`, {
        "Message ID": messageId,
        Status: status,
        Type: type,
        From: from,
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

function errorMsg(err: unknown): string {
  if (err instanceof TelnyxCLIError) return err.stderr || err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}
