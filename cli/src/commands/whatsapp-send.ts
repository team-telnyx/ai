/**
 * telnyx-agent whatsapp-send — Send a WhatsApp message (text or template).
 *
 * Shells out to the Go CLI's `messages send-whatsapp` subcommand, constructing
 * the `--whatsapp-message` JSON string from simpler flags.
 */

import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { printSuccess, printError, outputJson, failWith } from "../utils/output.ts";

interface WhatsappSendResult {
  from: string;
  to: string;
  message_type: "text" | "template";
  message_id: string;
  status: string;
}

export async function whatsappSendCommand(flags: Record<string, string | boolean>): Promise<void> {
  const jsonOutput = flags.json === true;
  const from = flags.from as string;
  const to = flags.to as string;
  const text = flags.text as string;
  const templateName = flags["template-name"] as string;
  const templateLanguage = (flags["template-language"] as string) || "en_US";
  const messagingProfileId = flags["messaging-profile-id"] as string;

  if (!from || !to) {
    failWith("--from and --to are required (E.164 phone numbers)", jsonOutput);
  }

  // Build the whatsapp_message JSON string. Initialize to keep strict mode happy.
  let messageType: "text" | "template" = "text";
  let whatsappMessage = "";
  if (text) {
    messageType = "text";
    whatsappMessage = JSON.stringify({ type: "text", text: { body: text } });
  } else if (templateName) {
    messageType = "template";
    whatsappMessage = JSON.stringify({
      type: "template",
      template: { name: templateName, language: { code: templateLanguage } },
    });
  } else {
    failWith("Provide --text for a text message or --template-name for a template message", jsonOutput);
  }

  try {
    const args = [
      "messages", "send-whatsapp",
      "--from", from,
      "--to", to,
      "--whatsapp-message", whatsappMessage,
    ];
    if (messagingProfileId) args.push("--messaging-profile-id", messagingProfileId);

    const res = await telnyxCli(args);
    const data = (res.data ?? res) as Record<string, unknown>;
    const messageId = String(data.id ?? data.message_id ?? "");
    // Extract the actual delivery status from the API response.
    // The Telnyx WhatsApp send response returns the per-recipient state in
    // data.to[0].status (e.g. queued/accepted/sent/delivered). Fall back to
    // data.status/data.delivery_status for alternate envelopes, then
    // "submitted" as a last resort — never assume "sent".
    const recipient = (Array.isArray(data.to) ? data.to[0] : undefined) as
      | Record<string, unknown>
      | undefined;
    const deliveryStatus = String(recipient?.status ?? data.status ?? data.delivery_status ?? "submitted");

    const result: WhatsappSendResult = {
      from,
      to,
      message_type: messageType,
      message_id: messageId,
      status: deliveryStatus,
    };

    if (jsonOutput) {
      outputJson(result);
    } else {
      printSuccess("WhatsApp message submitted!", {
        To: to,
        Type: messageType,
        "Message ID": messageId || "—",
        Status: deliveryStatus,
      });
    }
  } catch (err) {
    if (jsonOutput) {
      outputJson({
        from,
        to,
        message_type: messageType,
        status: "failed",
        error: errorMsg(err),
      });
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
