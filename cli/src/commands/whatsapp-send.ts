/**
 * telnyx-agent whatsapp-send — Send text, template, media, interactive,
 * location, reaction, sticker, contact, and video WhatsApp messages.
 *
 * The wrapper builds `whatsapp_message` JSON from agent-friendly flags, then
 * detects whether the local Go CLI exposes the legacy `messages send-whatsapp`
 * spelling or the v0.27 `messages whatsapp` spelling.
 */

import {
  telnyxCli,
  TelnyxCLIError,
  resolveMessagesWhatsappSubcommand,
} from "../telnyx-cli.ts";
import { printSuccess, printError, outputJson, failWith } from "../utils/output.ts";
import { deriveMessageStatus } from "../utils/message-status.ts";

type WhatsappMessageType =
  | "text"
  | "template"
  | "audio"
  | "document"
  | "image"
  | "interactive"
  | "location"
  | "reaction"
  | "sticker"
  | "contacts"
  | "video";

interface WhatsappSendResult {
  from: string;
  to: string;
  message_type: WhatsappMessageType;
  message_id: string;
  status: string;
}

const OBJECT_PAYLOAD_TYPES = [
  "audio",
  "document",
  "image",
  "interactive",
  "location",
  "reaction",
  "sticker",
  "video",
] as const;

const MINIMUM_NEW_WHATSAPP_FEATURES_CLI_VERSION = "0.34.0";
// WhatsApp Business Subscriber IDs identify a WhatsApp recipient as
// <ISO-3166 alpha-2 country code>.<numeric subscriber ID>, e.g.
// US.13491208655302741918.
const WHATSAPP_BSUID_RE = /^[A-Z]{2}\.\d+$/;

export async function whatsappSendCommand(flags: Record<string, string | boolean>): Promise<void> {
  const jsonOutput = flags.json === true;
  const from = flags.from as string;
  const to = flags.to as string;
  const messagingProfileId = flags["messaging-profile-id"] as string | undefined;
  const webhookUrl = flags["webhook-url"] as string | undefined;
  const callbackData = flags["biz-opaque-callback-data"] as string | undefined;
  const idempotencyKey = flags["idempotency-key"] as string | undefined;

  if (!from || !to) {
    failWith("--from and --to are required (--from must be E.164; --to must be E.164 or a WhatsApp BSUID)", jsonOutput);
  }
  if (idempotencyKey !== undefined && (!idempotencyKey || typeof idempotencyKey !== "string")) {
    failWith("--idempotency-key requires a non-empty value", jsonOutput);
  }

  const { messageType, message } = buildWhatsappMessage(flags, jsonOutput);
  if (callbackData) message.biz_opaque_callback_data = callbackData;

  try {
    const subcommand = await resolveMessagesWhatsappSubcommand();
    const args = [
      "messages", subcommand,
      "--from", from,
      "--to", to,
      "--whatsapp-message", JSON.stringify(message),
      "--type", "WHATSAPP",
    ];
    if (messagingProfileId) args.push("--messaging-profile-id", messagingProfileId);
    if (webhookUrl) args.push("--webhook-url", webhookUrl);
    if (idempotencyKey) args.push("--idempotency-key", idempotencyKey);

    // E.164 sends retain the existing compatibility path. BSUID recipients and
    // idempotency keys were added by Go CLI v0.34.0 and therefore receive a
    // command-scoped check only when either new feature is requested.
    const res = await telnyxCli(args, {
      minimumVersion: WHATSAPP_BSUID_RE.test(to) || Boolean(idempotencyKey)
        ? MINIMUM_NEW_WHATSAPP_FEATURES_CLI_VERSION
        : undefined,
    });
    const data = (res.data ?? res) as Record<string, unknown>;
    const messageId = String(data.id ?? data.message_id ?? "");
    const deliveryStatus = deriveMessageStatus(data, "submitted");

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

function buildWhatsappMessage(
  flags: Record<string, string | boolean>,
  jsonOutput: boolean,
): { messageType: WhatsappMessageType; message: Record<string, unknown> } {
  const text = flags.text as string | undefined;
  const templateName = flags["template-name"] as string | undefined;
  const selected: WhatsappMessageType[] = [];

  if (text) selected.push("text");
  if (templateName) selected.push("template");
  for (const type of OBJECT_PAYLOAD_TYPES) {
    if (flags[type] !== undefined) selected.push(type);
  }
  if (flags.contacts !== undefined) selected.push("contacts");

  if (selected.length === 0) {
    failWith(
      "Provide exactly one message payload: --text, --template-name, --audio, --document, --image, --interactive, --location, --reaction, --sticker, --contacts, or --video",
      jsonOutput,
    );
  }
  if (selected.length > 1) {
    failWith(`WhatsApp payload flags are mutually exclusive (received: ${selected.join(", ")})`, jsonOutput);
  }

  const messageType = selected[0];
  if (messageType === "text") {
    return { messageType, message: { type: "text", text: { body: text } } };
  }
  if (messageType === "template") {
    const language = (flags["template-language"] as string) || "en_US";
    return {
      messageType,
      message: {
        type: "template",
        template: { name: templateName, language: { code: language } },
      },
    };
  }
  if (messageType === "contacts") {
    const contacts = parseJson(flags.contacts, "--contacts", jsonOutput);
    if (!Array.isArray(contacts) || contacts.length === 0 || contacts.some((item) => !isObject(item))) {
      failWith("--contacts must be a non-empty JSON array of contact objects", jsonOutput);
    }
    return { messageType, message: { type: "contacts", contacts } };
  }

  const payload = parseJson(flags[messageType], `--${messageType}`, jsonOutput);
  if (!isObject(payload)) {
    failWith(`--${messageType} must be a JSON object`, jsonOutput);
  }
  return { messageType, message: { type: messageType, [messageType]: payload } };
}

function parseJson(value: string | boolean | undefined, flag: string, jsonOutput: boolean): unknown {
  if (typeof value !== "string") failWith(`${flag} requires a JSON value`, jsonOutput);
  try {
    return JSON.parse(value);
  } catch (err) {
    failWith(`${flag} must contain valid JSON: ${err instanceof Error ? err.message : String(err)}`, jsonOutput);
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function errorMsg(err: unknown): string {
  if (err instanceof TelnyxCLIError) return err.stderr || err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}
