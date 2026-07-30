/**
 * telnyx-agent send-group-mms — Send a group MMS message.
 *
 * Direct REST call to POST /v2/messages/group_mms (AIF-335).
 * `--to` accepts a comma-separated list of E.164 recipients.
 *
 * NOTE (AIF-335): the group-MMS response `data.id` is a GROUP-level id that is
 * NOT resolvable via `GET /v2/messages/{id}` (returns 40303 "Message not
 * found"), so `sms-status --id <that id>` will always 404. Delivery must be
 * confirmed via the per-recipient statuses in `data.to[]` and/or message
 * webhooks — not by polling the returned id. We surface the per-recipient
 * statuses honestly and warn the user instead of implying a queryable id.
 * The un-queryable id itself is an API-side behaviour owned by the Messaging
 * team; this command no longer over-claims a verifiable success.
 */

import { TelnyxClient, TelnyxAPIError } from "../client.ts";
import { printSuccess, printError, outputJson } from "../utils/output.ts";
import { deriveMessageStatus, recipientStatuses } from "../utils/message-status.ts";

interface SendGroupMmsResult {
  message_id: string;
  status: string;
  type: string;
  from: string;
  to: string[];
  recipient_statuses: Array<{ phone_number: string; status: string }>;
  /** The group id is not resolvable via GET /messages/{id}; see AIF-335. */
  id_queryable: boolean;
  note: string;
}

export async function sendGroupMmsCommand(flags: Record<string, string | boolean>): Promise<void> {
  const jsonOutput = flags.json === true;
  const from = flags["from"] as string | undefined;
  const to = flags["to"] as string | undefined;
  const text = flags["text"] as string | undefined;
  const mediaUrls = flags["media-url"] as string | string[] | undefined;

  if (!from) {
    printError("--from is required (E.164 format, e.g., +131****0000)");
    process.exit(1);
  }
  if (!to) {
    printError("--to is required (comma-separated E.164 numbers, e.g., +131****0001,+131****0002)");
    process.exit(1);
  }
  if (flags["messaging-profile-id"]) {
    // The group-MMS API schema does not accept messaging_profile_id, so the
    // generated Go CLI subcommand has no such flag. Fail fast instead of
    // forwarding a flag the CLI would reject.
    printError("--messaging-profile-id is not supported for group MMS (the sending number's profile is used)");
    process.exit(1);
  }

  // Group MMS always goes through the group-MMS subcommand (type is MMS).
  const type = "MMS";

  // Recipients are a comma-separated list from the user; the REST body wants a
  // JSON array of E.164 strings.
  const recipients = to.split(",").map((n) => n.trim()).filter(Boolean);

  const mediaUrlList = Array.isArray(mediaUrls) ? mediaUrls : (mediaUrls ? [mediaUrls] : []);

  // POST /v2/messages/group_mms body. The group-MMS schema does not accept
  // messaging_profile_id (the sending number's profile is used).
  const body: Record<string, unknown> = {
    from,
    to: recipients,
  };
  if (text) body.text = text;
  if (mediaUrlList.length > 0) body.media_urls = mediaUrlList;

  const idQueryableNote =
    "The group MMS id is not resolvable via 'sms-status'/GET /messages/{id} (AIF-335). " +
    "Confirm delivery via the per-recipient statuses above and/or message webhooks.";

  try {
    const client = new TelnyxClient();
    const res = await client.post("/messages/group_mms", body);
    const data = (res?.data ?? res) as Record<string, unknown>;
    const messageId = String(data.id ?? data.message_id ?? "");
    // Delivery state lives on each recipient (data.to[].status), not top-level.
    const status = deriveMessageStatus(data, "queued");
    const perRecipient = recipientStatuses(data);

    const result: SendGroupMmsResult = {
      message_id: messageId,
      status,
      type,
      from,
      to: recipients,
      recipient_statuses: perRecipient,
      id_queryable: false,
      note: idQueryableNote,
    };

    if (jsonOutput) {
      outputJson(result);
    } else {
      printSuccess("Group MMS submitted!", {
        "Message ID": messageId,
        Status: status,
        Type: type,
        From: from,
        To: recipients.join(", "),
      });
      if (perRecipient.length > 0) {
        console.log("\n  Per-recipient status:");
        for (const r of perRecipient) {
          console.log(`    ${r.phone_number}: ${r.status}`);
        }
      }
      console.log(`\n  \u26a0 ${idQueryableNote}\n`);
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
