/**
 * telnyx-agent call-status — Get the status of a call via Telnyx Call Control.
 *
 * Wraps the Go CLI's `calls retrieve-status` subcommand.
 */

import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { printSuccess, printError, outputJson } from "../utils/output.ts";

export async function callStatusCommand(flags: Record<string, string | boolean>): Promise<void> {
  const jsonOutput = flags.json === true;
  const callControlId = flags["call-control-id"] as string | undefined;

  if (!callControlId) {
    printError("--call-control-id is required");
    process.exit(1);
  }

  try {
    if (!jsonOutput) console.log(`\n📞 Retrieving call status for ${callControlId}...`);

    const res = await telnyxCli(["calls", "retrieve-status", "--call-control-id", callControlId]);
    const data = (res?.data ?? res ?? {}) as Record<string, unknown>;
    const ccId = String(data.call_control_id ?? callControlId);
    const callStatus = data.call_status;
    const isAlive = data.is_alive === true;

    if (jsonOutput) {
      outputJson({
        call_control_id: ccId,
        ...data,
      });
    } else {
      printSuccess("Call status retrieved", {
        "Call Control ID": ccId,
        "Call Status": String(callStatus ?? "unknown"),
        "Is Alive": isAlive ? "yes" : "no",
      });
    }
  } catch (err) {
    const msg = errorMsg(err);
    if (jsonOutput) {
      outputJson({ error: msg });
    } else {
      printError(msg);
    }
    process.exit(1);
  }
}

function errorMsg(err: unknown): string {
  if (err instanceof TelnyxCLIError) return err.stderr || err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}
