/**
 * telnyx-agent setup-verify — Zero to phone verification in one command.
 *
 * Steps:
 * 1. Create a verify profile (via REST)
 *
 * Verify does NOT need a purchased number: Telnyx delivers OTPs from its own
 * managed sender pool (SMS / voice / flash call across 190+ country codes), and
 * `verify-send` only takes the phone number being VERIFIED — never a from-number.
 * So setup-verify no longer searches for / buys a number (that was a recurring
 * ~$1/mo charge for a number the verify flow never used).
 */

import { TelnyxCLIError } from "../telnyx-cli.ts";
import { TelnyxClient, TelnyxAPIError } from "../client.ts";
import { printStep, printSuccess, printError, outputJson, type StepResult } from "../utils/output.ts";

interface SetupVerifyResult {
  profile_id: string;
  profile_name: string;
  timeout_secs: number;
  test_command: string;
  ready: boolean;
  steps: StepResult[];
}

export async function setupVerifyCommand(flags: Record<string, string | boolean>): Promise<void> {
  const jsonOutput = flags.json === true;
  const totalSteps = 1;
  const steps: StepResult[] = [];
  const startTime = Date.now();
  const timeoutSecs = 300;

  let profileId = "";
  let profileName = "";

  try {
    const ts = new Date().toISOString().slice(0, 19).replace("T", " ");
    profileName = (flags["profile-name"] as string) || `Agent Verify Profile - ${ts}`;
    if (!jsonOutput) console.log("\n🚀 Setting up Phone Verification...\n");

    // Step 1: Create verify profile via REST API (AIF-330: Go CLI sends no
    // channel settings → 400 "No channel setting provided: sms, call, etc")
    const step1Start = Date.now();
    try {
      const destinations = ((flags.destinations as string) || "US")
        .split(",")
        .map((d) => d.trim().toUpperCase())
        .filter(Boolean);

      const client = new TelnyxClient();
      const profileBody: Record<string, unknown> = {
        name: profileName,
        sms: {
          default_verification_timeout_secs: timeoutSecs,
          code_length: 6,
          whitelisted_destinations: destinations,
        },
      };

      const profileRes = await client.post("/verify_profiles", profileBody);
      const profileData = profileRes.data as Record<string, unknown>;
      profileId = String(profileData.id);
      steps.push({ step: 1, name: "Create verify profile", status: "completed", resourceId: profileId, detail: profileName, elapsedMs: Date.now() - step1Start });
    } catch (err) {
      steps.push({ step: 1, name: "Create verify profile", status: "failed", detail: errorMsg(err), elapsedMs: Date.now() - step1Start });
      throw err;
    }
    if (!jsonOutput) printStep(steps[steps.length - 1], totalSteps);

    // Verify needs no number — OTPs go out on Telnyx's managed sender pool. The
    // test command targets whatever phone number the user wants to verify.
    const testCommand = `telnyx-agent verify-send --phone-number <your_phone_number> --verify-profile-id ${profileId} --method sms`;

    const result: SetupVerifyResult = {
      profile_id: profileId,
      profile_name: profileName,
      timeout_secs: timeoutSecs,
      test_command: testCommand,
      ready: true,
      steps,
    };

    if (jsonOutput) {
      outputJson(result);
    } else {
      printSuccess("Phone Verification setup complete!", {
        "Profile ID": profileId,
        "Profile Name": profileName,
        "Timeout": `${timeoutSecs}s`,
        Ready: "✓",
        "No number needed": "OTPs send from Telnyx's managed pool",
        "Test command": testCommand,
      });
    }
  } catch (err) {
    const result = {
      status: "failed",
      profile_id: profileId || null,
      ready: false,
      steps,
      error: errorMsg(err),
      elapsed_ms: Date.now() - startTime,
    };

    if (jsonOutput) {
      outputJson(result);
    } else {
      printError(errorMsg(err));
      console.log("  Steps completed before failure:");
      for (const s of steps) printStep(s, totalSteps);
      console.log();
    }
    process.exit(1);
  }
}

function errorMsg(err: unknown): string {
  if (err instanceof TelnyxAPIError) return err.detail || err.message;
  if (err instanceof TelnyxCLIError) return err.stderr || err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}
