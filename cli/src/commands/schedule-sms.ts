/**
 * telnyx-agent schedule-sms — Schedule an SMS for later delivery.
 *
 * Shells out to the Go telnyx CLI `messages schedule` subcommand.
 */

import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { printSuccess, printError, outputJson } from "../utils/output.ts";
import { deriveMessageStatus } from "../utils/message-status.ts";

interface ScheduleSmsResult {
  message_id: string;
  status: string;
  from: string;
  to: string;
  send_at: string;
  scheduled: boolean;
}

export async function scheduleSmsCommand(flags: Record<string, string | boolean>): Promise<void> {
  const jsonOutput = flags.json === true;
  const from = flags["from"] as string | undefined;
  const to = flags["to"] as string | undefined;
  const text = flags["text"] as string | undefined;
  const sendAt = flags["send-at"] as string | undefined;
  const messagingProfileId = flags["messaging-profile-id"] as string | undefined;
  const mediaUrl = flags["media-url"] as string | undefined;

  if (!from) {
    printError("--from is required (E.164 format, e.g., +13125550000)");
    process.exit(1);
  }
  if (!to) {
    printError("--to is required (E.164 format, e.g., +13125550001)");
    process.exit(1);
  }
  if (!text) {
    printError("--text is required");
    process.exit(1);
  }
  if (!sendAt) {
    printError("--send-at is required (ISO 8601 datetime, e.g., 2024-12-31T00:00:00Z)");
    process.exit(1);
  }

  const args: string[] = [
    "messages", "schedule",
    "--from", from,
    "--to", to,
    "--text", text,
    "--send-at", sendAt,
  ];
  if (messagingProfileId) args.push("--messaging-profile-id", messagingProfileId);
  if (mediaUrl) args.push("--media-url", mediaUrl);

  try {
    const res = await telnyxCli(args);
    const data = (res?.data ?? res) as Record<string, unknown>;
    const messageId = String(data.id ?? data.message_id ?? "");
    // Delivery state lives on each recipient (data.to[].status), not top-level.
    const status = deriveMessageStatus(data, "scheduled");

    const result: ScheduleSmsResult = {
      message_id: messageId,
      status,
      from,
      to,
      send_at: sendAt,
      scheduled: true,
    };

    if (jsonOutput) {
      outputJson(result);
    } else {
      printSuccess("SMS scheduled!", {
        "Message ID": messageId,
        Status: status,
        From: from,
        To: to,
        "Send At": sendAt,
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
