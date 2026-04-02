/**
 * telnyx-agent setup-sms — Zero to sending SMS in one command.
 *
 * Steps:
 * 1. Create a messaging profile (via telnyx CLI)
 * 2. Search for a phone number with SMS capability (via telnyx CLI)
 * 3. Buy the number (via telnyx CLI)
 * 4. Assign number to the messaging profile (via telnyx CLI)
 */

import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { TelnyxClient } from "../client.ts";
import { printStep, printSuccess, printError, outputJson, type StepResult } from "../utils/output.ts";
import { searchAndBuyNumber } from "../utils/number-order.ts";

interface SetupSmsResult {
  profile_id: string;
  profile_name: string;
  phone_number: string;
  phone_number_id: string;
  ready: boolean;
  steps: StepResult[];
}

export async function setupSmsCommand(flags: Record<string, string | boolean>): Promise<void> {
  const jsonOutput = flags.json === true;
  const country = (flags.country as string) || "US";
  const totalSteps = 4;
  const steps: StepResult[] = [];
  const startTime = Date.now();

  let profileId = "";
  let profileName = "";
  let phoneNumber = "";
  let phoneNumberId = "";

  try {
    // Step 1: Create messaging profile via direct API
    // (CLI doesn't support --whitelisted-destinations which the API requires)
    const ts = new Date().toISOString().slice(0, 19).replace("T", " ");
    profileName = `Agent SMS Profile - ${ts}`;
    if (!jsonOutput) console.log("\n🚀 Setting up SMS...\n");

    const apiKey = process.env.TELNYX_API_KEY;
    if (!apiKey) throw new Error("TELNYX_API_KEY environment variable is required");
    const client = new TelnyxClient(apiKey);

    const step1Start = Date.now();
    try {
      const profileRes = await client.post("/messaging_profiles", {
        name: profileName,
        whitelisted_destinations: ["US"],
      });
      const profileData = (profileRes.data ?? profileRes) as Record<string, unknown>;
      profileId = String(profileData.id);
      steps.push({ step: 1, name: "Create messaging profile", status: "completed", resourceId: profileId, detail: profileName, elapsedMs: Date.now() - step1Start });
    } catch (err) {
      steps.push({ step: 1, name: "Create messaging profile", status: "failed", detail: errorMsg(err), elapsedMs: Date.now() - step1Start });
      throw err;
    }
    if (!jsonOutput) printStep(steps[steps.length - 1], totalSteps);

    // Steps 2+3: Search and buy number via CLI (handles 409 retries automatically)
    const step2Start = Date.now();
    try {
      const result = await searchAndBuyNumber(country, {
        features: "sms",
        type: "local",
        messagingProfileId: profileId,
      });
      phoneNumber = result.phoneNumber;
      phoneNumberId = result.phoneNumberId;
      steps.push({ step: 2, name: "Search for number", status: "completed", detail: phoneNumber, elapsedMs: Date.now() - step2Start });
      steps.push({ step: 3, name: "Buy number", status: "completed", resourceId: phoneNumberId, detail: phoneNumber, elapsedMs: 0 });
    } catch (err) {
      steps.push({ step: 2, name: "Search & buy number", status: "failed", detail: errorMsg(err), elapsedMs: Date.now() - step2Start });
      throw err;
    }
    if (!jsonOutput) {
      printStep(steps[steps.length - 2], totalSteps);
      printStep(steps[steps.length - 1], totalSteps);
    }

    // Step 4: Assign number to messaging profile via CLI
    const step4Start = Date.now();
    try {
      if (phoneNumber) {
        await telnyxCli([
          "phone-numbers", "update",
          "--phone-number-id", phoneNumber,
          "--messaging-profile-id", profileId,
          "--force",
        ]);
      }
      steps.push({ step: 4, name: "Assign number to profile", status: "completed", elapsedMs: Date.now() - step4Start });
    } catch (err) {
      steps.push({ step: 4, name: "Assign number to profile", status: "failed", detail: errorMsg(err), elapsedMs: Date.now() - step4Start });
      throw err;
    }
    if (!jsonOutput) printStep(steps[steps.length - 1], totalSteps);

    const result: SetupSmsResult = {
      profile_id: profileId,
      profile_name: profileName,
      phone_number: phoneNumber,
      phone_number_id: phoneNumberId,
      ready: true,
      steps,
    };

    if (jsonOutput) {
      outputJson(result);
    } else {
      printSuccess("SMS setup complete!", {
        "Profile ID": profileId,
        "Profile Name": profileName,
        "Phone Number": phoneNumber,
        Ready: "✓",
        "Test command": `telnyx-agent send-sms --from ${phoneNumber} --to <number> --text "Hello!"`,
      });
    }
  } catch (err) {
    const result = {
      status: "failed",
      profile_id: profileId || null,
      phone_number: phoneNumber || null,
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
  if (err instanceof TelnyxCLIError) return err.stderr || err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}
