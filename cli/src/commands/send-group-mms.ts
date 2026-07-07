/**
 * telnyx-agent send-group-mms — Send a group MMS message.
 *
 * Shells out to the Go telnyx CLI `messages send-group-mms` subcommand.
 * `--to` accepts a comma-separated list of E.164 recipients.
 */

import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { printSuccess, printError, outputJson } from "../utils/output.ts";
import { deriveMessageStatus } from "../utils/message-status.ts";

interface SendGroupMmsResult {
  message_id: string;
  status: string;
  type: string;
  from: string;
  to: string[];
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

  // The Go CLI expects `--to` repeated once per recipient, not a single
  // comma-separated string, so split the user-facing list and push a `--to`
  // flag per recipient.
  const recipients = to.split(",").map((n) => n.trim()).filter(Boolean);

  const args: string[] = [
    "messages", "send-group-mms",
    "--from", from,
  ];
  for (const recipient of recipients) {
    args.push("--to", recipient);
  }
  if (text) args.push("--text", text);
  // The Go CLI treats --media-url as a repeatable array flag, so push
  // one --media-url per URL (matches the API's media_urls[] body field).
  const mediaUrlList = Array.isArray(mediaUrls) ? mediaUrls : (mediaUrls ? [mediaUrls] : []);
  for (const url of mediaUrlList) {
    args.push("--media-url", url);
  }
  // Note: the group-MMS API (and thus the generated Go CLI subcommand) does not
  // accept messaging_profile_id, so no --messaging-profile-id passthrough here.

  try {
    const res = await telnyxCli(args);
    const data = (res?.data ?? res) as Record<string, unknown>;
    const messageId = String(data.id ?? data.message_id ?? "");
    // Delivery state lives on each recipient (data.to[].status), not top-level.
    const status = deriveMessageStatus(data, "queued");

    const result: SendGroupMmsResult = {
      message_id: messageId,
      status,
      type,
      from,
      to: recipients,
    };

    if (jsonOutput) {
      outputJson(result);
    } else {
      printSuccess("Group MMS sent!", {
        "Message ID": messageId,
        Status: status,
        Type: type,
        From: from,
        To: recipients.join(", "),
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
