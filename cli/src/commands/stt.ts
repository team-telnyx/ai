/**
 * telnyx-agent stt — Speech-to-text transcription.
 *
 * Shells out to the telnyx CLI's `speech-to-text retrieve-transcription`
 * subcommand and surfaces the resulting transcription text to the caller in
 * either human-readable or JSON form.
 *
 * The retrieve-transcription endpoint accepts an audio URL and returns the
 * transcribed text along with metadata (language, engine, model, etc.).
 */

import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { printSuccess, printError, outputJson } from "../utils/output.ts";

interface SttResult {
  audio_url: string;
  language: string;
  transcription: string;
  transcription_engine?: string;
  model?: string;
}

/**
 * Extract the transcription text from a telnyx CLI speech-to-text response.
 * The CLI wraps the API payload in a `data` envelope, but different engines
 * surface the transcript under different field names, so we check a few
 * common ones.
 */
function extractTranscription(response: unknown): string {
  const data = (response as Record<string, unknown> | undefined)?.data ?? response;
  const obj = (data ?? {}) as Record<string, unknown>;

  for (const key of ["transcription", "transcript", "text"]) {
    const v = obj[key];
    if (typeof v === "string" && v) return v;
  }

  return "";
}

export async function sttCommand(flags: Record<string, string | boolean>): Promise<void> {
  const jsonOutput = flags.json === true;
  const audioUrl = flags["audio-url"] as string;
  const language = (flags.language as string) || "en";
  const model = flags.model as string | undefined;
  const transcriptionEngine = flags["transcription-engine"] as string | undefined;
  const inputFormat = flags["input-format"] as string | undefined;
  const interimResults = flags["interim-results"] === true;
  const endpointing = flags.endpointing as string | undefined;
  const redact = flags.redact === true;
  const keywords = flags.keywords as string | undefined;

  if (!audioUrl) {
    printError("--audio-url is required (e.g., --audio-url https://example.com/audio.mp3)");
    process.exit(1);
  }

  try {
    if (!jsonOutput) {
      console.log("\n🎙️  Transcribing audio...\n");
    }

    const args = ["speech-to-text", "retrieve-transcription", "--audio-url", audioUrl];
    args.push("--language", language);
    if (model) args.push("--model", model);
    if (transcriptionEngine) args.push("--transcription-engine", transcriptionEngine);
    if (inputFormat) args.push("--input-format", inputFormat);
    if (interimResults) args.push("--interim-results");
    if (endpointing) args.push("--endpointing", endpointing);
    if (redact) args.push("--redact");
    if (keywords) args.push("--keywords", keywords);

    const response = await telnyxCli(args);
    const transcription = extractTranscription(response);

    const result: SttResult = {
      audio_url: audioUrl,
      language,
      transcription,
      ...(transcriptionEngine ? { transcription_engine: transcriptionEngine } : {}),
      ...(model ? { model } : {}),
    };

    if (jsonOutput) {
      outputJson(result);
    } else {
      const details: Record<string, string | number | boolean> = {
        "Audio URL": audioUrl,
        Language: language,
      };
      if (transcriptionEngine) details["Engine"] = transcriptionEngine;
      if (model) details["Model"] = model;
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
