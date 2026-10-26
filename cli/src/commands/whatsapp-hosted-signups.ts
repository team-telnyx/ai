/**
 * WhatsApp Hosted Signup actions backed by the Telnyx Go CLI v0.34.0.
 *
 * Hosted signups create time-limited Telnyx-hosted Embedded Signup URLs for a
 * Tech Provider's end customers. The generated action is unavailable before
 * v0.34, so every operation uses a command-scoped compatibility check.
 */
import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { failWith, outputJson, printError, printSuccess } from "../utils/output.ts";

type Flags = Record<string, string | boolean>;
type JsonRecord = Record<string, unknown>;

const MINIMUM_CLI_VERSION = "0.34.0";
const SIGNUP_TYPES = new Set(["standard", "coexistence"]);

export async function createWhatsappHostedSignupCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const appId = requiredString(flags, "app-id", "Meta App ID", jsonOutput);
  const signupType = optionalString(flags, "signup-type", jsonOutput) ?? "standard";
  if (!SIGNUP_TYPES.has(signupType)) {
    failWith('--signup-type must be "standard" or "coexistence"', jsonOutput);
  }

  const args = ["whatsapp:hosted-signups", "create", "--app-id", appId, "--signup-type", signupType];
  const expiresAt = optionalString(flags, "expires-at", jsonOutput);
  if (expiresAt !== undefined) args.push("--expires-at", expiresAt);

  try {
    const signup = dataRecord(await telnyxCli(args, { minimumVersion: MINIMUM_CLI_VERSION }));
    presentSignup("WhatsApp hosted signup created!", signup, jsonOutput);
  } catch (error) {
    fail(errorMessage(error), jsonOutput);
  }
}

export async function getWhatsappHostedSignupCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const id = requiredString(flags, "id", "hosted signup ID", jsonOutput);

  try {
    const signup = dataRecord(await telnyxCli(
      ["whatsapp:hosted-signups", "retrieve", "--id", id],
      { minimumVersion: MINIMUM_CLI_VERSION },
    ));
    presentSignup("WhatsApp hosted signup retrieved!", signup, jsonOutput);
  } catch (error) {
    fail(errorMessage(error), jsonOutput);
  }
}

export async function listWhatsappHostedSignupsCommand(flags: Flags): Promise<void> {
  const jsonOutput = flags.json === true;
  const args = ["whatsapp:hosted-signups", "list"];
  addPositiveInteger(args, flags, "page-number", jsonOutput);
  addPositiveInteger(args, flags, "page-size", jsonOutput);
  const maxItems = addMaxItems(args, flags, jsonOutput);

  try {
    const response = asRecord(await telnyxCli(args, { format: "raw", minimumVersion: MINIMUM_CLI_VERSION }));
    const returnedSignups = objectArray(response.data);
    const hostedSignups = maxItems === undefined || maxItems === -1
      ? returnedSignups
      : returnedSignups.slice(0, maxItems);
    const result = { count: hostedSignups.length, hosted_signups: hostedSignups, meta: asRecord(response.meta) };
    if (jsonOutput) {
      outputJson(result);
      return;
    }
    printSuccess("WhatsApp hosted signups retrieved!", { Count: result.count });
    for (const signup of hostedSignups) {
      const id = stringValue(signup.id) || "(unknown)";
      const details = [signup.signup_type, signup.expires_at, signup.url, signup.onboarding_url]
        .map(stringValue)
        .filter(Boolean)
        .join(" · ");
      console.log(`  • ${id}${details ? ` — ${details}` : ""}`);
    }
    if (hostedSignups.length === 0) console.log("  (no hosted signups returned)");
    console.log();
  } catch (error) {
    fail(errorMessage(error), jsonOutput);
  }
}

function presentSignup(title: string, signup: JsonRecord, jsonOutput: boolean): void {
  if (jsonOutput) {
    outputJson({ hosted_signup: signup });
    return;
  }
  printSuccess(title, {
    ID: stringValue(signup.id) || "—",
    "Signup Type": stringValue(signup.signup_type) || "—",
    "Expires At": stringValue(signup.expires_at) || "—",
    URL: stringValue(signup.url) || stringValue(signup.onboarding_url) || "—",
  });
}

function requiredString(flags: Flags, key: string, label: string, jsonOutput: boolean): string {
  const value = optionalString(flags, key, jsonOutput);
  if (value === undefined) failWith(`--${key} is required (${label})`, jsonOutput);
  return value;
}

function optionalString(flags: Flags, key: string, jsonOutput: boolean): string | undefined {
  const value = flags[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.trim() === "") failWith(`--${key} requires a non-empty value`, jsonOutput);
  return value;
}

function addPositiveInteger(args: string[], flags: Flags, key: "page-number" | "page-size", jsonOutput: boolean): void {
  const value = optionalString(flags, key, jsonOutput);
  if (value === undefined) return;
  const parsed = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(parsed) || parsed < 1) {
    failWith(`--${key} must be a positive safe integer`, jsonOutput);
  }
  args.push(`--${key}`, value);
}

function addMaxItems(args: string[], flags: Flags, jsonOutput: boolean): number | undefined {
  const value = optionalString(flags, "max-items", jsonOutput);
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!/^(?:-1|\d+)$/.test(value) || !Number.isSafeInteger(parsed)) {
    failWith("--max-items must be -1 or a non-negative safe integer", jsonOutput);
  }
  args.push("--max-items", value);
  return parsed;
}

function dataRecord(response: unknown): JsonRecord {
  return asRecord(asRecord(response).data);
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function objectArray(value: unknown): JsonRecord[] {
  return Array.isArray(value)
    ? value.filter((item): item is JsonRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    : [];
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : value === undefined || value === null ? "" : String(value);
}

function errorMessage(error: unknown): string {
  if (error instanceof TelnyxCLIError) return error.stderr || error.message;
  if (error instanceof Error) return error.message;
  return String(error);
}

function fail(message: string, jsonOutput: boolean): never {
  if (jsonOutput) outputJson({ error: message });
  else printError(message);
  process.exit(1);
}
