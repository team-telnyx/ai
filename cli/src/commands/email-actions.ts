/**
 * Agent-friendly wrappers for outbound email and inbox message actions.
 *
 * These commands require Telnyx Go CLI v0.27+, where the email message create
 * and email inbox forward/reply actions were introduced.
 */

import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { failWith, outputJson, printError, printSuccess } from "../utils/output.ts";

type Flags = Record<string, string | boolean>;
type Occurrences = Record<string, Array<string | boolean>>;
type EmailInboxAction = "forward" | "reply" | "reply-all";
type JsonRecord = Record<string, unknown>;

interface EmailSendResult {
  email_id: string;
  status: string;
  from: string;
  to: string[];
}

interface EmailInboxActionResult {
  email_id: string;
  status: string;
  action: EmailInboxAction;
  inbox_id: string;
  source_message_id: string;
}

const EMAIL_CLI_MINIMUM_VERSION = "0.27.0";

const EMAIL_SEND_VALUE_FLAGS = [
  "forward-of-message-id",
  "from-name",
  "group-id",
  "headers",
  "html-body",
  "in-reply-to-message-id",
  "metadata",
  "reply-to",
  "scheduled-at",
  "send-at",
  "subject",
  "template-id",
  "template-variables",
  "text-body",
  "tracking-settings",
  "idempotency-key",
] as const;

const EMAIL_SEND_BOOLEAN_FLAGS = [
  "ignore-suppression",
  "inline-css",
  "reply-to-all",
  "sandbox-mode",
] as const;

const EMAIL_SEND_REPEATABLE_FLAGS = ["attachment", "bcc", "cc", "tag"] as const;

export async function emailSendCommand(
  flags: Flags,
  occurrences: Occurrences = {},
): Promise<void> {
  const jsonOutput = flags.json === true;
  const from = requiredString(flags, "from", "a sender email address or sender JSON object", jsonOutput);
  const to = requiredOccurrences(flags, occurrences, "to", "at least one recipient", jsonOutput);
  const templateId = optionalString(flags, "template-id", jsonOutput);
  const subject = optionalString(flags, "subject", jsonOutput);

  if (!templateId && !subject) {
    failWith("--subject is required unless --template-id is supplied", jsonOutput);
  }
  if (flags["forward-of-message-id"] !== undefined && flags["in-reply-to-message-id"] !== undefined) {
    failWith("--forward-of-message-id and --in-reply-to-message-id cannot be used together", jsonOutput);
  }

  const args: string[] = ["email-messages", "create", "--from", from];
  for (const recipient of to) args.push("--to", recipient);

  for (const name of EMAIL_SEND_REPEATABLE_FLAGS) {
    addRepeatedFlag(args, flags, occurrences, name, jsonOutput);
  }
  for (const name of EMAIL_SEND_VALUE_FLAGS) {
    addValueFlag(args, flags, name, jsonOutput);
  }
  for (const name of EMAIL_SEND_BOOLEAN_FLAGS) {
    addBooleanFlag(args, flags, name, jsonOutput);
  }

  try {
    const response = await telnyxCli(args, { minimumVersion: EMAIL_CLI_MINIMUM_VERSION });
    const data = responseData(response);
    const result: EmailSendResult = {
      email_id: stringValue(data.id ?? data.email_id ?? data.message_id),
      status: stringValue(data.status) || "submitted",
      from,
      to,
    };

    if (jsonOutput) {
      outputJson(result);
    } else {
      printSuccess("Email submitted!", {
        "Email ID": result.email_id || "(not returned)",
        Status: result.status,
        From: result.from,
        To: result.to.join(", "),
      });
    }
  } catch (err) {
    fail(err, jsonOutput);
  }
}

export async function emailForwardCommand(
  flags: Flags,
  occurrences: Occurrences = {},
): Promise<void> {
  const jsonOutput = flags.json === true;
  const to = requiredOccurrences(flags, occurrences, "to", "at least one forwarding recipient", jsonOutput);
  const args = inboxActionArgs("forward", flags, jsonOutput);
  args.push("--to", recipientArrayValue(to, "to", jsonOutput));

  for (const name of ["bcc", "cc"] as const) {
    const recipients = occurrenceValues(flags, occurrences, name, jsonOutput);
    if (recipients.length > 0) {
      args.push(`--${name}`, recipientArrayValue(recipients, name, jsonOutput));
    }
  }
  addValueFlag(args, flags, "html", jsonOutput);
  addValueFlag(args, flags, "text", jsonOutput);

  await runInboxAction("forward", flags, args, jsonOutput);
}

export async function emailReplyCommand(flags: Flags): Promise<void> {
  await runReplyAction("reply", flags);
}

export async function emailReplyAllCommand(flags: Flags): Promise<void> {
  await runReplyAction("reply-all", flags);
}

async function runReplyAction(action: "reply" | "reply-all", flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const args = inboxActionArgs(action, flags, jsonOutput);
  addValueFlag(args, flags, "html", jsonOutput);
  addValueFlag(args, flags, "text", jsonOutput);
  await runInboxAction(action, flags, args, jsonOutput);
}

async function runInboxAction(
  action: EmailInboxAction,
  flags: Flags,
  args: string[],
  jsonOutput: boolean,
): Promise<void> {
  const inboxId = flags["inbox-id"] as string;
  const sourceMessageId = flags["message-id"] as string;

  try {
    const response = await telnyxCli(args, { minimumVersion: EMAIL_CLI_MINIMUM_VERSION });
    const data = responseData(response);
    const result: EmailInboxActionResult = {
      email_id: stringValue(data.id ?? data.email_id ?? data.message_id),
      status: stringValue(data.status) || "submitted",
      action,
      inbox_id: inboxId,
      source_message_id: sourceMessageId,
    };

    if (jsonOutput) {
      outputJson(result);
    } else {
      printSuccess(`Email ${action} submitted!`, {
        "Email ID": result.email_id || "(not returned)",
        Status: result.status,
        Action: result.action,
        "Inbox ID": result.inbox_id,
        "Source message ID": result.source_message_id,
      });
    }
  } catch (err) {
    fail(err, jsonOutput);
  }
}

function inboxActionArgs(action: EmailInboxAction, flags: Flags, jsonOutput: boolean): string[] {
  const inboxId = requiredString(flags, "inbox-id", "the email inbox ID", jsonOutput);
  const messageId = requiredString(flags, "message-id", "the inbox message ID", jsonOutput);
  return [
    "email-inboxes:messages:actions",
    action,
    "--inbox-id",
    inboxId,
    "--message-id",
    messageId,
  ];
}

function requiredString(flags: Flags, name: string, description: string, jsonOutput: boolean): string {
  const value = flags[name];
  if (typeof value !== "string" || value.length === 0) {
    failWith(`--${name} is required (${description})`, jsonOutput);
  }
  return value;
}

function optionalString(flags: Flags, name: string, jsonOutput: boolean): string | undefined {
  const value = flags[name];
  if (value === undefined) return undefined;
  if (typeof value !== "string") failWith(`--${name} requires a value`, jsonOutput);
  return value;
}

function requiredOccurrences(
  flags: Flags,
  occurrences: Occurrences,
  name: string,
  description: string,
  jsonOutput: boolean,
): string[] {
  const values = occurrenceValues(flags, occurrences, name, jsonOutput);
  if (values.length === 0) failWith(`--${name} is required (${description})`, jsonOutput);
  return values;
}

function occurrenceValues(
  flags: Flags,
  occurrences: Occurrences,
  name: string,
  jsonOutput: boolean,
): string[] {
  const values = occurrences[name] ?? (flags[name] === undefined ? [] : [flags[name]]);
  return values.map((value) => {
    if (typeof value !== "string" || value.length === 0) {
      failWith(`--${name} requires a value`, jsonOutput);
    }
    return value;
  });
}

function addRepeatedFlag(
  args: string[],
  flags: Flags,
  occurrences: Occurrences,
  name: string,
  jsonOutput: boolean,
): void {
  for (const value of occurrenceValues(flags, occurrences, name, jsonOutput)) {
    args.push(`--${name}`, value);
  }
}

function addValueFlag(args: string[], flags: Flags, name: string, jsonOutput: boolean): void {
  const value = flags[name];
  if (value === undefined) return;
  if (typeof value !== "string") failWith(`--${name} requires a value`, jsonOutput);
  args.push(`--${name}`, value);
}

function addBooleanFlag(args: string[], flags: Flags, name: string, jsonOutput: boolean): void {
  const value = flags[name];
  if (value === undefined) return;
  if (value === true || value === "true") {
    args.push(`--${name}=true`);
  } else if (value === "false" || value === false) {
    args.push(`--${name}=false`);
  } else {
    failWith(`--${name} must be true or false`, jsonOutput);
  }
}

/** Convert repeatable agent flags to the one scalar-or-array value expected by the forward endpoint. */
function recipientArrayValue(values: string[], name: string, jsonOutput: boolean): string {
  const recipients: unknown[] = [];
  for (const value of values) {
    let parsed: unknown = value;
    try {
      parsed = JSON.parse(value);
    } catch {
      // A normal email address is not JSON and remains a string recipient.
    }

    const expanded = Array.isArray(parsed) ? parsed : [parsed];
    for (const recipient of expanded) {
      if (typeof recipient === "string" && recipient.length > 0) {
        recipients.push(recipient);
      } else if (recipient && typeof recipient === "object" && !Array.isArray(recipient)) {
        recipients.push(recipient);
      } else {
        failWith(`--${name} recipients must be email strings or JSON objects`, jsonOutput);
      }
    }
  }
  if (recipients.length === 0) failWith(`--${name} must contain at least one recipient`, jsonOutput);
  return JSON.stringify(recipients);
}

function responseData(response: unknown): JsonRecord {
  const envelope = asRecord(response);
  return asRecord(envelope.data ?? response);
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function stringValue(value: unknown): string {
  return value === undefined || value === null ? "" : String(value);
}

function fail(err: unknown, jsonOutput: boolean): never {
  const message = errorMsg(err);
  if (jsonOutput) outputJson({ error: message });
  else printError(message);
  process.exit(1);
}

function errorMsg(err: unknown): string {
  if (err instanceof TelnyxCLIError) return err.stderr || err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}
