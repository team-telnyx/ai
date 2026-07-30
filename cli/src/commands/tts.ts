/**
 * telnyx-agent tts — Text-to-speech generation.
 *
 * Direct REST call to POST /text-to-speech/speech (AIF-331).
 *
 * The Go CLI's `text-to-speech generate-speech` subcommand was not mapping
 * `--voice` through to the API request body, causing a 422
 * `{"errors":{"telnyx":["can't be blank"]}}` even when --voice was explicit.
 * This bypasses the Go CLI and calls the REST API directly.
 *
 * Supported providers: telnyx, aws, azure, elevenlabs, minimax, resemble, rime, xai
 *
 * The API's `output_type` enum is `binary_output | base64_output`. This
 * wrapper only supports `base64_output` (exposed as the friendly alias
 * `base64`) because `binary_output` returns raw audio bytes, which cannot be
 * transported through the JSON pipeline.
 */

import { TelnyxClient, TelnyxAPIError } from "../client.ts";
import { printSuccess, printError, outputJson } from "../utils/output.ts";

const VALID_PROVIDERS = ["telnyx", "aws", "azure", "elevenlabs", "minimax", "resemble", "rime", "xai"] as const;
// Friendly alias → documented API enum value. `binary_output` is deliberately
// unsupported: it returns raw audio bytes that would corrupt JSON parsing.
const OUTPUT_TYPE_MAP: Record<string, string> = {
  base64: "base64_output",
  base64_output: "base64_output",
};
const VALID_TEXT_TYPES = ["text", "ssml"] as const;

interface TtsResult {
  text: string;
  voice: string;
  provider: string;
  output_type: string;
  audio_data?: string;
  has_audio_data: boolean;
}

/**
 * Extract base64 audio data from the API response. With
 * `output_type=base64_output`, POST /text-to-speech/speech returns
 * `{ "base64_audio": "..." }` (no `data` envelope), but we also tolerate an
 * envelope and a few legacy field names as a safety net.
 */
function extractAudio(response: unknown): { audioData?: string } {
  const data = (response as Record<string, unknown> | undefined)?.data ?? response;
  const obj = (data ?? {}) as Record<string, unknown>;

  for (const key of ["base64_audio", "audio_data", "audio", "base64"]) {
    const v = obj[key];
    if (typeof v === "string" && v) return { audioData: v };
  }

  return {};
}

export async function ttsCommand(flags: Record<string, string | boolean>): Promise<void> {
  const jsonOutput = flags.json === true;
  const text = flags.text as string;
  const voice = (flags.voice as string | undefined) ?? "";
  const language = (flags.language as string) || "en";
  const provider = (flags.provider as string) || "telnyx";
  const outputTypeFlag = (flags["output-type"] as string) || "base64";
  const textType = (flags["text-type"] as string) || "text";
  const disableCache = flags["disable-cache"] === true;

  if (!text) {
    printError("--text is required (e.g., --text \"Hello world\")");
    process.exit(1);
  }

  if (!VALID_PROVIDERS.includes(provider as (typeof VALID_PROVIDERS)[number])) {
    printError(
      `Invalid --provider "${provider}". Valid: ${VALID_PROVIDERS.join(", ")}`,
    );
    process.exit(1);
  }

  const outputType = OUTPUT_TYPE_MAP[outputTypeFlag];
  if (!outputType) {
    printError(
      `Invalid --output-type "${outputTypeFlag}". Valid: base64 (binary_output is not supported by this wrapper — it returns raw audio bytes)`,
    );
    process.exit(1);
  }

  if (!VALID_TEXT_TYPES.includes(textType as (typeof VALID_TEXT_TYPES)[number])) {
    printError(
      `Invalid --text-type "${textType}". Valid: ${VALID_TEXT_TYPES.join(", ")}`,
    );
    process.exit(1);
  }

  try {
    if (!jsonOutput) {
      console.log("\n🔊 Generating speech...\n");
    }

    // Build request body — all snake_case for the REST API
    const body: Record<string, unknown> = {
      text,
      language,
      provider,
      output_type: outputType,
      text_type: textType,
    };
    if (voice) body.voice = voice;
    if (disableCache) body.disable_cache = true;

    const client = new TelnyxClient();
    const response = await client.post("/text-to-speech/speech", body);
    const { audioData } = extractAudio(response);
    const hasAudioData = !!audioData;

    const result: TtsResult = {
      text,
      voice,
      provider,
      output_type: outputType,
      audio_data: audioData,
      has_audio_data: hasAudioData,
    };

    if (jsonOutput) {
      outputJson(result);
    } else {
      const details: Record<string, string | number | boolean> = {
        Provider: provider,
        "Output Type": outputType,
        "Text Type": textType,
        Language: language,
      };
      if (voice) details["Voice"] = voice;
      if (hasAudioData) {
        details["Audio Data"] = `${audioData!.length} chars (base64)`;
      }
      printSuccess("Speech generated!", details);
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
  if (err instanceof TelnyxAPIError) return err.detail || err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}
