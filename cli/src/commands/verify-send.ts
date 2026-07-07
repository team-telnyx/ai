/**
 * telnyx-agent verify-send — Trigger a phone verification.
 *
 * Dispatches to one of the Telnyx Verify channels based on --method:
 *   - sms       → verifications trigger-sms
 *   - call      → verifications trigger-call
 *   - flashcall → verifications trigger-flashcall
 *
 * (WhatsApp verification requires telnyx-cli >= 0.12.0; the vendored CLI is
 * pinned to 0.11.0 in scripts/postinstall.ts, so it is not offered here yet.)
 *
 * Returns the verification ID so callers can follow up with `verify-check`.
 */

import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { printSuccess, printError, outputJson } from "../utils/output.ts";

const VALID_METHODS = ["sms", "call", "flashcall"] as const;
// flashcall authenticates by calling the number back, so there is no code to
// pass; the other channels accept an optional self-generated --custom-code.
const METHODS_WITH_CUSTOM_CODE = ["sms", "call"] as const;
type VerifyMethod = (typeof VALID_METHODS)[number];

interface VerifySendResult {
  method: string;
  phone_number: string;
  verify_profile_id: string;
  verification_id: string;
  record_type?: string;
  status?: string;
}

function isVerifyMethod(value: string): value is VerifyMethod {
  return (VALID_METHODS as readonly string[]).includes(value);
}

export async function verifySendCommand(flags: Record<string, string | boolean>): Promise<void> {
  const jsonOutput = flags.json === true;
  const phoneNumber = flags["phone-number"] as string | undefined;
  const verifyProfileId = flags["verify-profile-id"] as string | undefined;
  const method = flags.method as string | undefined;
  const customCode = flags["custom-code"] as string | undefined;
  const timeoutSecs = flags["timeout-secs"] as string | undefined;
  const extension = flags.extension as string | undefined;

  if (!phoneNumber) {
    printError("--phone-number is required (E.164 format, e.g. +131****0000)");
    process.exit(1);
  }
  if (!verifyProfileId) {
    printError("--verify-profile-id is required");
    process.exit(1);
  }
  if (!method) {
    printError(`--method is required (one of: ${VALID_METHODS.join(", ")})`);
    process.exit(1);
  }
  if (!isVerifyMethod(method)) {
    printError(`Invalid --method "${method}". Must be one of: ${VALID_METHODS.join(", ")}`);
    process.exit(1);
  }
  if (extension && method !== "call") {
    printError("--extension is only valid with --method call");
    process.exit(1);
  }
  if (customCode && !(METHODS_WITH_CUSTOM_CODE as readonly string[]).includes(method)) {
    printError(`--custom-code is not supported for method "${method}" (use sms or call)`);
    process.exit(1);
  }

  // Build the subcommand based on the chosen channel.
  let subcommand: string[];
  switch (method) {
    case "sms":
      subcommand = ["verifications", "trigger-sms"];
      break;
    case "call":
      subcommand = ["verifications", "trigger-call"];
      break;
    case "flashcall":
      subcommand = ["verifications", "trigger-flashcall"];
      break;
  }

  const args: string[] = [
    ...subcommand,
    "--phone-number", phoneNumber,
    "--verify-profile-id", verifyProfileId,
  ];

  if (customCode) {
    args.push("--custom-code", customCode);
  }
  if (extension && method === "call") {
    args.push("--extension", extension);
  }
  if (timeoutSecs) {
    args.push("--timeout-secs", timeoutSecs);
  }

  if (!jsonOutput) {
    console.log(`\n📲 Triggering ${method} verification for ${phoneNumber}...`);
  }

  try {
    const res = await telnyxCli(args);
    const data = (res?.data ?? res ?? {}) as Record<string, unknown>;
    const verificationId = String(
      data.id ?? data.verification_id ?? data.verificationId ?? "",
    );
    const recordType = data.record_type as string | undefined;
    const status = data.status as string | undefined;

    const result: VerifySendResult = {
      method,
      phone_number: phoneNumber,
      verify_profile_id: verifyProfileId,
      verification_id: verificationId,
      record_type: recordType,
      status,
    };

    if (jsonOutput) {
      outputJson(result);
    } else {
      printSuccess(`Verification triggered via ${method}!`, {
        "Verification ID": verificationId,
        "Phone Number": phoneNumber,
        "Method": method,
        "Verify Profile": verifyProfileId,
        "Status": status || "sent",
        "Next": `telnyx-agent verify-check --verification-id ${verificationId}`,
      });
    }
  } catch (err) {
    const msg = errorMsg(err);
    if (jsonOutput) {
      outputJson({ error: msg, method, phone_number: phoneNumber, verify_profile_id: verifyProfileId });
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
