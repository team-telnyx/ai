/**
 * telnyx-agent rcs-send — Send a text RCS message.
 *
 * Shells out to the generated Go CLI's `messages:rcs send` action. The agent
 * command keeps the common text-message case simple while using the generated
 * nested flag names verbatim.
 */

import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { printSuccess, printError, outputJson, failWith } from "../utils/output.ts";
import { deriveMessageStatus } from "../utils/message-status.ts";

interface RcsSendResult {
  message_id: string;
  status: string;
  type: "RCS";
  agent_id: string;
  messaging_profile_id: string;
  to: string;
}

export async function rcsSendCommand(flags: Record<string, string | boolean>): Promise<void> {
  const jsonOutput = flags.json === true;
  const agentId = flags["agent-id"] as string | undefined;
  const messagingProfileId = flags["messaging-profile-id"] as string | undefined;
  const to = flags.to as string | undefined;
  const text = flags.text as string | undefined;
  const ttl = flags.ttl as string | undefined;
  const webhookUrl = flags["webhook-url"] as string | undefined;

  if (!agentId) {
    failWith("--agent-id is required", jsonOutput);
  }
  if (!messagingProfileId) {
    failWith("--messaging-profile-id is required", jsonOutput);
  }
  if (!to) {
    failWith("--to is required (E.164 format, e.g., +131****0001)", jsonOutput);
  }
  if (!text) {
    failWith("--text is required", jsonOutput);
  }

  const args = [
    "messages:rcs", "send",
    "--agent-id", agentId,
    "--agent-message.content-message", JSON.stringify({ text }),
    "--messaging-profile-id", messagingProfileId,
    "--to", to,
    "--type", "RCS",
  ];
  if (ttl) args.push("--agent-message.ttl", ttl);
  if (webhookUrl) args.push("--webhook-url", webhookUrl);

  try {
    const response = await telnyxCli(args);
    const data = (response?.data ?? response) as Record<string, unknown>;
    const result: RcsSendResult = {
      message_id: String(data.id ?? data.message_id ?? ""),
      status: deriveMessageStatus(data, "submitted"),
      type: "RCS",
      agent_id: agentId,
      messaging_profile_id: messagingProfileId,
      to,
    };

    if (jsonOutput) {
      outputJson(result);
    } else {
      printSuccess("RCS message submitted!", {
        "Message ID": result.message_id || "—",
        Status: result.status,
        "Agent ID": result.agent_id,
        "Messaging profile ID": result.messaging_profile_id,
        To: result.to,
      });
    }
  } catch (err) {
    if (jsonOutput) {
      outputJson({
        message_id: "",
        status: "failed",
        type: "RCS",
        agent_id: agentId,
        messaging_profile_id: messagingProfileId,
        to,
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
