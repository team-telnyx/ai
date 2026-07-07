/**
 * telnyx-agent stt — Speech-to-text transcription.
 *
 * Shells out to the telnyx CLI's `ai:audio transcribe` subcommand (the
 * OpenAI-compatible transcription endpoint) and surfaces the resulting
 * transcription text to the caller in either human-readable or JSON form.
 *
 * The transcribe endpoint accepts a hosted audio file URL (`--file-url`)
 * and returns the transcribed text. Note: the Go CLI's separate
 * `speech-to-text retrieve-transcription` command is a WebSocket streaming
 * API (no audio-URL support), so URL-based transcription must go through
 * `ai:audio transcribe`.
 */

import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { printSuccess, printError, outputJson } from "../utils/output.ts";

/**
 * Default transcription model. `ai:audio transcribe` requires --model;
 * this mirrors the Go CLI's own default (lower latency, English-only).
 */
const DEFAULT_MODEL = "distil-whisper/distil-large-v2";

interface SttResult {
  audio_url: string;
  model: string;
  transcription: string;
  language?: string;
}

/**
 * Extract the transcription text from a telnyx CLI transcribe response.
 * The endpoint is OpenAI-compatible and returns the transcript under
 * `text`, but we defensively check a `data` envelope and a few common
 * field names.
 */
function extractTranscription(response: unknown): string {
  const data = (response as Record<string, unknown> | undefined)?.data ?? response;
  const obj = (data ?? {}) as Record<string, unknown>;

  for (const key of ["text", "transcription", "transcript"]) {
    const v = obj[key];
    if (typeof v === "string" && v) return v;
  }

  return "";
}

export async function sttCommand(flags: Record<string, string | boolean>): Promise<void> {
  const jsonOutput = flags.json === true;
  const audioUrl = flags["audio-url"] as string;
  const model = (flags.model as string) || DEFAULT_MODEL;
  // Only forward --language when explicitly provided: the default model
  // (distil-whisper/distil-large-v2) rejects the language parameter.
  const language = flags.language as string | undefined;
  const responseFormat = flags["response-format"] as string | undefined;

  if (!audioUrl) {
    printError("--audio-url is required (e.g., --audio-url https://example.com/audio.mp3)");
    process.exit(1);
  }

  try {
    if (!jsonOutput) {
      console.log("\n🎙️  Transcribing audio...\n");
    }

    const args = ["ai:audio", "transcribe", "--file-url", audioUrl, "--model", model];
    if (language) args.push("--language", language);
    if (responseFormat) args.push("--response-format", responseFormat);

    const response = await telnyxCli(args);
    const transcription = extractTranscription(response);

    const result: SttResult = {
      audio_url: audioUrl,
      model,
      transcription,
      ...(language ? { language } : {}),
    };

    if (jsonOutput) {
      outputJson(result);
    } else {
      const details: Record<string, string | number | boolean> = {
        "Audio URL": audioUrl,
        Model: model,
      };
      if (language) details["Language"] = language;
      details["Transcription"] = transcription || "(no text returned)";
      printSuccess("Transcription complete!", details);
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
