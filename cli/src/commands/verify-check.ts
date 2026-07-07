/**
 * telnyx-agent verify-check — Verify a code or check verification status.
 *
 * Two modes:
 *   - With --code:    submit the code for verification
 *                    → telnyx verifications:actions verify
 *   - Without --code: retrieve the current verification status
 *                    → telnyx verifications retrieve
 */

import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { printSuccess, printError, outputJson } from "../utils/output.ts";

interface VerifyCheckResult {
  verification_id: string;
  mode: "verify" | "retrieve";
  status?: string;
  verified?: boolean;
  response?: Record<string, unknown>;
}

export async function verifyCheckCommand(flags: Record<string, string | boolean>): Promise<void> {
  const jsonOutput = flags.json === true;
  const verificationId = flags["verification-id"] as string | undefined;
  const code = flags.code as string | undefined;

  if (!verificationId) {
    printError("--verification-id is required");
    process.exit(1);
  }

  const args: string[] = code
    ? ["verifications:actions", "verify", "--verification-id", verificationId, "--code", code]
    : ["verifications", "retrieve", "--verification-id", verificationId];
  const mode: "verify" | "retrieve" = code ? "verify" : "retrieve";

  if (!jsonOutput) {
    const action = code ? `Submitting code for ${verificationId}...` : `Retrieving status for ${verificationId}...`;
    console.log(`\n✅ ${action}`);
  }

  try {
    const res = await telnyxCli(args);
    const data = (res?.data ?? res ?? {}) as Record<string, unknown>;
    const status = data.status as string | undefined;
    // The verify action responds with a status like "verified" / "pending" /
    // "expired"; derive a boolean for convenience.
    const verified = code ? status === "verified" || status === "approved" : undefined;

    const result: VerifyCheckResult = {
      verification_id: verificationId,
      mode,
      status,
      verified,
      response: data,
    };

    if (jsonOutput) {
      outputJson(result);
    } else {
      const title = code
        ? (verified ? "Code verified!" : "Code verification result")
        : "Verification status retrieved";
      printSuccess(title, {
        "Verification ID": verificationId,
        "Mode": mode,
        "Status": status || "unknown",
        ...(verified !== undefined ? { "Verified": verified ? "✓" : "✗" } : {}),
      });
    }
  } catch (err) {
    const msg = errorMsg(err);
    if (jsonOutput) {
      outputJson({ error: msg, verification_id: verificationId, mode });
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
