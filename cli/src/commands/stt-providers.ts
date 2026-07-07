/**
 * telnyx-agent stt-providers — List available speech-to-text providers.
 *
 * Shells out to the telnyx CLI's `speech-to-text list-providers` subcommand
 * and surfaces the available STT providers (optionally filtered by provider
 * name or service type) to the caller in either human-readable or JSON form.
 */

import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { printSuccess, printError, outputJson } from "../utils/output.ts";

interface SttProvider {
  provider: string;
  service_type?: string;
  [key: string]: unknown;
}

export async function sttProvidersCommand(flags: Record<string, string | boolean>): Promise<void> {
  const jsonOutput = flags.json === true;
  const provider = flags.provider as string | undefined;
  const serviceType = flags["service-type"] as string | undefined;

  try {
    if (!jsonOutput) {
      console.log("\n🎤 Listing speech-to-text providers...\n");
    }

    const args = ["speech-to-text", "list-providers"];
    if (provider) args.push("--provider", provider);
    if (serviceType) args.push("--service-type", serviceType);

    const response = await telnyxCli(args);
    const data = (response as Record<string, unknown> | undefined)?.data ?? response;
    const providers: SttProvider[] = Array.isArray(data)
      ? (data as SttProvider[])
      : Array.isArray(response)
        ? (response as SttProvider[])
        : [];

    if (jsonOutput) {
      outputJson({ providers, count: providers.length });
    } else {
      const details: Record<string, string | number | boolean> = {
        Count: providers.length,
        Providers: providers.map((p) => p.provider).join(", ") || "(none)",
      };
      if (provider) details["Provider Filter"] = provider;
      if (serviceType) details["Service Type Filter"] = serviceType;
      printSuccess("Available speech-to-text providers", details);
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
