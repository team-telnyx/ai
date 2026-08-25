/**
 * telnyx-agent fax-send — Send a fax.
 *
 * Direct wrapper over the Go telnyx CLI `faxes create` subcommand.
 */

import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { printSuccess, printError, outputJson } from "../utils/output.ts";

interface FaxSendResult {
  fax_id: string;
  status: string;
  connection_id: string;
  from: string;
  to: string;
}

const OPTIONAL_FLAGS = [
  "media-url",
  "media-name",
  "webhook-url",
  "client-state",
  "from-display-name",
  "quality",
  "monochrome",
  "black-threshold",
  "store-media",
  "store-preview",
  "preview-format",
  "t38-enabled",
] as const;

const BOOLEAN_FLAGS = new Set([
  "monochrome",
  "store-media",
  "store-preview",
  "t38-enabled",
]);

export async function faxSendCommand(flags: Record<string, string | boolean>): Promise<void> {
  const jsonOutput = flags.json === true;
  const connectionId = flags["connection-id"] as string | undefined;
  const from = flags.from as string | undefined;
  const to = flags.to as string | undefined;

  if (!connectionId) {
    printError("--connection-id is required");
    process.exit(1);
  }
  if (!from) {
    printError("--from is required (E.164 format, e.g., +131****0000)");
    process.exit(1);
  }
  if (!to) {
    printError("--to is required (E.164 format or SIP URI)");
    process.exit(1);
  }
  if (flags["media-url"] && flags["media-name"]) {
    printError("--media-url and --media-name cannot be used together");
    process.exit(1);
  }
  if (flags["media-name"] && flags["store-media"]) {
    printError("--media-name and --store-media cannot be used together");
    process.exit(1);
  }

  const args: string[] = [
    "faxes", "create",
    "--connection-id", connectionId,
    "--from", from,
    "--to", to,
  ];

  for (const flag of OPTIONAL_FLAGS) {
    const value = flags[flag];
    if (typeof value === "string") {
      if (BOOLEAN_FLAGS.has(flag)) {
        args.push(`--${flag}=${value}`);
      } else {
        args.push(`--${flag}`, value);
      }
    } else if (value === true) {
      args.push(`--${flag}`);
    }
  }

  try {
    const res = await telnyxCli(args);
    const data = (res?.data ?? res ?? {}) as Record<string, unknown>;
    const result: FaxSendResult = {
      fax_id: String(data.id ?? data.fax_id ?? ""),
      status: String(data.status ?? "queued"),
      connection_id: connectionId,
      from,
      to,
    };

    if (jsonOutput) {
      outputJson(result);
    } else {
      printSuccess("Fax queued!", {
        "Fax ID": result.fax_id,
        Status: result.status,
        "Connection ID": connectionId,
        From: from,
        To: to,
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
