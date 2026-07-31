/**
 * telnyx-agent tts-voices — List available TTS voices.
 *
 * Shells out to the telnyx CLI's `text-to-speech list-voices` subcommand and
 * surfaces the available voices (optionally filtered by provider) in either
 * human-readable or JSON form.
 *
 * Supported providers (reconciled with the live Telnyx voice service): telnyx,
 * aws, azure, minimax, inworld, rime, resemble, fishaudio, humain, xai.
 * ElevenLabs is NOT in the live set. This list is a typo guard; the service is
 * the source of truth.
 */

import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { printSuccess, printError, outputJson } from "../utils/output.ts";

const VALID_PROVIDERS = ["telnyx", "aws", "azure", "minimax", "inworld", "rime", "resemble", "fishaudio", "humain", "xai"] as const;

interface Voice {
  voice_id?: string;
  name?: string;
  language?: string;
  gender?: string;
  provider?: string;
  [key: string]: unknown;
}

interface TtsVoicesResult {
  provider?: string;
  count: number;
  voices: Voice[];
}

/**
 * Normalize the telnyx CLI response into a flat list of voice objects. The CLI
 * wraps the API payload in a `data` envelope, which may itself be an array or a
 * single object containing a voices/list field.
 */
function extractVoices(response: unknown): Voice[] {
  const data = (response as Record<string, unknown> | undefined)?.data ?? response;
  if (Array.isArray(data)) return data as Voice[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    for (const key of ["voices", "list", "items", "results"]) {
      const v = obj[key];
      if (Array.isArray(v)) return v as Voice[];
    }
    // Single voice object
    return [obj as Voice];
  }
  return [];
}

export async function ttsVoicesCommand(flags: Record<string, string | boolean>): Promise<void> {
  const jsonOutput = flags.json === true;
  const provider = flags.provider as string | undefined;
  const apiKey = flags["api-key"] as string | undefined;

  if (provider && !VALID_PROVIDERS.includes(provider as (typeof VALID_PROVIDERS)[number])) {
    printError(
      `Invalid --provider "${provider}". Valid: ${VALID_PROVIDERS.join(", ")}`,
    );
    process.exit(1);
  }

  try {
    if (!jsonOutput) {
      console.log("\n🔊 Fetching available TTS voices...\n");
    }

    const args = ["text-to-speech", "list-voices"];
    if (provider) args.push("--provider", provider);
    if (apiKey) args.push("--api-key", apiKey);

    const response = await telnyxCli(args);
    const voices = extractVoices(response);

    const result: TtsVoicesResult = {
      provider: provider,
      count: voices.length,
      voices,
    };

    if (jsonOutput) {
      outputJson(result);
    } else {
      const details: Record<string, string | number | boolean> = {
        "Voice Count": voices.length,
      };
      if (provider) details["Provider"] = provider;
      printSuccess("TTS voices retrieved!", details);

      for (const voice of voices) {
        const id = voice.voice_id ?? voice.name ?? "(unknown)";
        const language = voice.language ?? "";
        const gender = voice.gender ?? "";
        const suffix = [language, gender].filter(Boolean).join(" · ");
        console.log(`  • ${id}${suffix ? `  —  ${suffix}` : ""}`);
      }
      if (voices.length === 0) {
        console.log("  (no voices returned)");
      }
      console.log();
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
