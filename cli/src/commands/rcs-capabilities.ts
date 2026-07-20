/**
 * telnyx-agent rcs-capabilities — Check an RCS recipient's capabilities.
 *
 * Shells out to the generated Go CLI's
 * `messaging:rcs retrieve-capabilities` action.
 */

import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { printSuccess, printError, outputJson } from "../utils/output.ts";

interface RcsCapabilitiesResult {
  agent_id: string;
  agent_name: string;
  phone_number: string;
  features: string[] | null;
  status: string;
  rcs_enabled: boolean;
}

export async function rcsCapabilitiesCommand(flags: Record<string, string | boolean>): Promise<void> {
  const jsonOutput = flags.json === true;
  const agentId = flags["agent-id"] as string | undefined;
  const phoneNumber = flags["phone-number"] as string | undefined;

  if (!agentId) {
    printError("--agent-id is required");
    process.exit(1);
    return;
  }
  if (!phoneNumber) {
    printError("--phone-number is required (E.164 format, e.g., +131****0001)");
    process.exit(1);
    return;
  }

  try {
    const response = await telnyxCli([
      "messaging:rcs", "retrieve-capabilities",
      "--agent-id", agentId,
      "--phone-number", phoneNumber,
    ]);
    const data = (response?.data ?? response) as Record<string, unknown>;
    const features = Array.isArray(data.features) ? data.features.map(String) : null;
    const result: RcsCapabilitiesResult = {
      agent_id: String(data.agent_id ?? agentId),
      agent_name: String(data.agent_name ?? ""),
      phone_number: String(data.phone_number ?? phoneNumber),
      features,
      status: String(data.status ?? ""),
      rcs_enabled: features !== null,
    };

    if (jsonOutput) {
      outputJson(result);
    } else {
      printSuccess("RCS capabilities retrieved!", {
        "Agent ID": result.agent_id,
        "Agent name": result.agent_name || "—",
        "Phone number": result.phone_number,
        Status: result.status || "Unknown",
        "RCS enabled": result.rcs_enabled ? "Yes" : "No",
        Features: result.features === null
          ? "Unavailable"
          : result.features.length > 0 ? result.features.join(", ") : "None reported",
      });
    }
  } catch (err) {
    if (jsonOutput) {
      outputJson({
        agent_id: agentId,
        agent_name: "",
        phone_number: phoneNumber,
        features: [],
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
