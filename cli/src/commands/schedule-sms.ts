/**
 * telnyx-agent schedule-sms — Schedule an SMS for later delivery.
 *
 * Uses direct REST call: POST /v2/messages with a `send_at` field.
 * The old Go CLI `messages schedule` subcommand posted to a nonexistent
 * /v2/messages/schedule endpoint (404). See AIF-332.
 *
 * API quirk: the create response echoes `send_at: null` even though
 * scheduling is in effect — the per-recipient `to[].status` field
 * correctly reports "scheduled".
 */

import { TelnyxClient, TelnyxAPIError } from "../client.ts";
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

  // Validate ISO 8601 — quick sanity check, not a full parser
  if (isNaN(Date.parse(sendAt))) {
    printError(`--send-at must be a valid ISO 8601 datetime, got: ${sendAt}`);
    process.exit(1);
  }

  const client = new TelnyxClient();

  const body: Record<string, unknown> = {
    from,
    to,
    text,
    send_at: sendAt,
  };
  if (messagingProfileId) body.messaging_profile_id = messagingProfileId;
  if (mediaUrl) body.media_urls = [mediaUrl];

  try {
    const res = await client.post("/messages", body);
    const data = (res.data ?? res) as Record<string, unknown>;
    const messageId = String(data.id ?? data.message_id ?? "");
    // Delivery state lives on each recipient (data.to[].status), not top-level.
    // The API quirk: send_at may echo back as null, but to[].status = "scheduled"
    // confirms the message is scheduled.
    const status = deriveMessageStatus(data, "scheduled");

    const result: ScheduleSmsResult = {
      message_id: messageId,
      status,
      from,
      to,
      send_at: sendAt,
      scheduled: status.includes("scheduled"),
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
  if (err instanceof TelnyxAPIError) return err.detail || err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}
