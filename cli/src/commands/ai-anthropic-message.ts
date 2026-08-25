/**
 * telnyx-agent ai-anthropic-message — Anthropic-compatible message inference.
 *
 * This is a thin wrapper around `telnyx ai:anthropic:v1 messages`. Complex
 * values are forwarded unchanged so the generated Go CLI remains the source
 * of truth for Anthropic request parsing and validation.
 */

import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { printSuccess, printError, outputJson } from "../utils/output.ts";

const VALUE_FLAGS = [
  "api-key-ref",
  "billing-group-id",
  "fallback-config",
  "max-retries",
  "metadata",
  "service-tier",
  "system",
  "temperature",
  "thinking",
  "timeout",
  "tool-choice",
  "top-k",
  "top-p",
] as const;

const REPEATABLE_VALUE_FLAGS = ["mcp-server", "stop-sequence", "tool"] as const;

export async function aiAnthropicMessageCommand(
  flags: Record<string, string | boolean>,
  occurrences: Record<string, Array<string | boolean>> = {},
): Promise<void> {
  const jsonOutput = flags.json === true;

  if (flags.stream === true || flags.stream === "true") {
    fail(
      "Streaming is not supported by ai-anthropic-message yet; omit --stream to request a JSON response",
      jsonOutput,
    );
  }

  const maxTokens = requiredValue(flags, "max-tokens", "the maximum number of tokens to generate", jsonOutput);
  const model = requiredValue(flags, "model", "an Anthropic-compatible model ID", jsonOutput);
  const messages = requiredOccurrences(flags, occurrences, "message", jsonOutput);

  const args: string[] = [
    "ai:anthropic:v1",
    "messages",
    "--max-tokens",
    maxTokens,
  ];
  for (const message of messages) args.push("--message", message);
  args.push("--model", model);

  forwardValueFlags(args, flags, VALUE_FLAGS, jsonOutput);
  for (const name of REPEATABLE_VALUE_FLAGS) {
    const values = occurrences[name] ?? (flags[name] === undefined ? [] : [flags[name]]);
    for (const value of values) {
      if (typeof value !== "string" || value === "") {
        fail(`--${name} requires a value`, jsonOutput);
      }
      args.push(`--${name}`, value);
    }
  }

  try {
    // The upstream request timeout defaults to 300 seconds, while telnyxCli's
    // generic subprocess timeout is 60 seconds. Give the Go CLI enough time to
    // enforce its own request timeout, plus startup/serialization grace.
    const response = await telnyxCli(args, {
      timeout: childProcessTimeout(flags.timeout),
      minimumVersion: "0.24.0",
    });

    if (jsonOutput) {
      // Preserve every Anthropic response field, including all content block
      // types, usage, stop details, and any future fields added by the API.
      outputJson(response);
      return;
    }

    printAnthropicSummary(response, model);
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

function requiredValue(
  flags: Record<string, string | boolean>,
  name: string,
  description: string,
  jsonOutput: boolean,
): string {
  const value = flags[name];
  if (typeof value !== "string" || value === "") {
    fail(`--${name} is required (${description})`, jsonOutput);
  }
  return value;
}

function requiredOccurrences(
  flags: Record<string, string | boolean>,
  occurrences: Record<string, Array<string | boolean>>,
  name: string,
  jsonOutput: boolean,
): string[] {
  const values = occurrences[name] ?? (flags[name] === undefined ? [] : [flags[name]]);
  if (values.length === 0) {
    fail(
      `--${name} is required as a JSON object (repeat --${name} for multiple values)`,
      jsonOutput,
    );
  }

  return values.map((value) => {
    if (typeof value !== "string" || value === "") {
      fail(`--${name} requires a JSON object value`, jsonOutput);
    }
    return value;
  });
}

function forwardValueFlags(
  args: string[],
  flags: Record<string, string | boolean>,
  names: readonly string[],
  jsonOutput: boolean,
): void {
  for (const name of names) {
    const value = flags[name];
    if (value === undefined) continue;
    if (typeof value !== "string" || value === "") {
      fail(`--${name} requires a value`, jsonOutput);
    }
    args.push(`--${name}`, value);
  }
}

function childProcessTimeout(timeoutFlag: string | boolean | undefined): number {
  const upstreamDefaultSeconds = 300;
  const parsed = typeof timeoutFlag === "string" ? Number(timeoutFlag) : upstreamDefaultSeconds;
  const seconds = Number.isFinite(parsed) && parsed > 0 ? parsed : upstreamDefaultSeconds;
  const timeoutWithGrace = Math.ceil(seconds * 1_000) + 15_000;
  // Node timers overflow above a signed 32-bit millisecond value.
  return Math.min(timeoutWithGrace, 2_147_483_647);
}

function printAnthropicSummary(response: unknown, requestedModel: string): void {
  const result = asObject(response);
  const content = Array.isArray(result.content) ? result.content : [];
  const text = content
    .map(asObject)
    .filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text as string)
    .join("\n");
  const usage = asObject(result.usage);
  const inputTokens = typeof usage.input_tokens === "number" ? usage.input_tokens : "?";
  const outputTokens = typeof usage.output_tokens === "number" ? usage.output_tokens : "?";

  printSuccess("Anthropic message created!", {
    Model: typeof result.model === "string" ? result.model : requestedModel,
    "Content blocks": content.length,
    "Stop reason": typeof result.stop_reason === "string" ? result.stop_reason : "(not reported)",
    Tokens: `${inputTokens} input / ${outputTokens} output`,
    Response: text || "(no text content returned)",
  });
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
