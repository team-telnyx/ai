/**
 * telnyx-agent ai-chat — OpenAI-compatible chat completion inference.
 *
 * This is a thin wrapper around `telnyx ai:openai:chat create-completion`.
 * Complex values are intentionally forwarded as JSON strings so the generated
 * Go CLI remains the source of truth for request parsing and validation.
 */

import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { printSuccess, printError, outputJson } from "../utils/output.ts";

const VALUE_FLAGS = [
  "api-key-ref",
  "best-of",
  "frequency-penalty",
  "guided-choice",
  "guided-json",
  "guided-regex",
  "length-penalty",
  "max-tokens",
  "min-p",
  "model",
  "n",
  "presence-penalty",
  "response-format",
  "seed",
  "stop",
  "temperature",
  "tool",
  "tool-choice",
  "top-logprobs",
  "top-p",
] as const;

const BOOLEAN_FLAGS = [
  "early-stopping",
  "enable-thinking",
  "logprobs",
  "stream",
  "use-beam-search",
] as const;

export async function aiChatCommand(flags: Record<string, string | boolean>): Promise<void> {
  const jsonOutput = flags.json === true;
  const message = flags.message;

  if (typeof message !== "string" || !message) {
    fail("--message is required as a JSON object (for example: '{\"role\":\"user\",\"content\":\"Hello\"}')", jsonOutput);
  }

  const args: string[] = [
    "ai:openai:chat",
    "create-completion",
    "--message",
    message,
  ];

  forwardValueFlags(args, flags, VALUE_FLAGS);
  forwardBooleanFlags(args, flags, BOOLEAN_FLAGS);

  try {
    const response = await telnyxCli(args);

    if (jsonOutput) {
      // Preserve the complete OpenAI-compatible response, including tool calls,
      // log probabilities, and usage fields that callers may depend on.
      outputJson(response);
      return;
    }

    const result = asObject(response);
    const choices = Array.isArray(result.choices) ? result.choices : [];
    const firstChoice = asObject(choices[0]);
    const firstMessage = asObject(firstChoice.message);
    const content = typeof firstMessage.content === "string" ? firstMessage.content : "";
    const model = typeof result.model === "string"
      ? result.model
      : typeof flags.model === "string"
        ? flags.model
        : "(default)";

    printSuccess("AI chat completion created!", {
      Model: model,
      Choices: choices.length,
      Response: content || "(no text content returned)",
    });
  } catch (err) {
    fail(errorMsg(err), jsonOutput);
  }
}

function forwardValueFlags(
  args: string[],
  flags: Record<string, string | boolean>,
  names: readonly string[],
): void {
  for (const name of names) {
    const value = flags[name];
    if (typeof value === "string" && value !== "") {
      args.push(`--${name}`, value);
    }
  }
}

function forwardBooleanFlags(
  args: string[],
  flags: Record<string, string | boolean>,
  names: readonly string[],
): void {
  for (const name of names) {
    const value = flags[name];
    if (value === true || value === "true") {
      args.push(`--${name}`);
    } else if (value === "false") {
      // urfave boolean flags require the explicit false value in --flag=false
      // form; a separate `false` argv entry is treated as an extra argument.
      args.push(`--${name}=false`);
    }
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
