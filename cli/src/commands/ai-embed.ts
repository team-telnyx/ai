/**
 * telnyx-agent ai-embed — OpenAI-compatible embedding inference.
 *
 * This is a thin wrapper around
 * `telnyx ai:openai:embeddings create-embeddings`. The --input value is passed
 * through unchanged: it may be plain text or a JSON array of strings.
 */

import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { printSuccess, printError, outputJson } from "../utils/output.ts";

const VALUE_FLAGS = ["dimensions", "encoding-format", "user"] as const;

export async function aiEmbedCommand(flags: Record<string, string | boolean>): Promise<void> {
  const jsonOutput = flags.json === true;
  const input = flags.input;
  const model = flags.model;

  if (typeof input !== "string" || !input) {
    fail("--input is required (plain text or a JSON array of strings)", jsonOutput);
  }
  if (typeof model !== "string" || !model) {
    fail("--model is required (use the Telnyx embedding model ID)", jsonOutput);
  }

  const args: string[] = [
    "ai:openai:embeddings",
    "create-embeddings",
    "--input",
    input,
    "--model",
    model,
  ];

  for (const name of VALUE_FLAGS) {
    const value = flags[name];
    if (typeof value === "string" && value !== "") {
      args.push(`--${name}`, value);
    }
  }

  try {
    const response = await telnyxCli(args);

    if (jsonOutput) {
      // Do not unwrap `data`: in the OpenAI Embeddings response it is the
      // actual array of embedding objects, not a Telnyx envelope.
      outputJson(response);
      return;
    }

    const result = asObject(response);
    const embeddings = Array.isArray(result.data) ? result.data : [];
    const first = asObject(embeddings[0]);
    const firstVector = Array.isArray(first.embedding) ? first.embedding : [];
    const responseModel = typeof result.model === "string" ? result.model : model;

    printSuccess("Embeddings created!", {
      Model: responseModel,
      Embeddings: embeddings.length,
      Dimensions: firstVector.length,
    });
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function fail(message: string, jsonOutput: boolean): never {
  if (jsonOutput) {
    outputJson({ error: message });
  } else {
    printError(message);
  }
  process.exit(1);
}

function errorMsg(err: unknown): string {
  if (err instanceof TelnyxCLIError) return err.stderr || err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}
