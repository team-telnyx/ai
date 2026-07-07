/**
 * telnyx-agent sms-status — Check SMS delivery status or cancel a scheduled message.
 *
 * Default: retrieve message status via `messages retrieve`.
 * With --cancel: cancel a scheduled message via `messages cancel-scheduled`.
 */

import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { printSuccess, printError, outputJson } from "../utils/output.ts";
import { deriveMessageStatus } from "../utils/message-status.ts";

interface SmsStatusResult {
  message_id: string;
  status: string;
  cancelled?: boolean;
}

export async function smsStatusCommand(flags: Record<string, string | boolean>): Promise<void> {
  const jsonOutput = flags.json === true;
  const id = flags["id"] as string | undefined;
  const cancel = flags.cancel === true;

  if (!id) {
    printError("--id is required (message ID)");
    process.exit(1);
  }

  try {
    if (cancel) {
      const res = await telnyxCli(["messages", "cancel-scheduled", "--id", id]);
      const data = (res?.data ?? res) as Record<string, unknown>;
      const messageId = String(data.id ?? id);
      // Delivery state lives on each recipient (data.to[].status), not top-level.
      const status = deriveMessageStatus(data, "cancelled");

      const result: SmsStatusResult = {
        message_id: messageId,
        status,
        cancelled: true,
      };

      if (jsonOutput) {
        outputJson(result);
      } else {
        printSuccess("Scheduled message cancelled!", {
          "Message ID": messageId,
          Status: status,
        });
      }
      return;
    }

    const res = await telnyxCli(["messages", "retrieve", "--id", id]);
    const data = (res?.data ?? res) as Record<string, unknown>;
    const messageId = String(data.id ?? id);
    // Delivery state lives on each recipient (data.to[].status), not top-level.
    const status = deriveMessageStatus(data, "unknown");

    const result: SmsStatusResult = {
      message_id: messageId,
      status,
    };

    if (jsonOutput) {
      outputJson(result);
    } else {
      printSuccess("SMS status retrieved!", {
        "Message ID": messageId,
        Status: status,
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
