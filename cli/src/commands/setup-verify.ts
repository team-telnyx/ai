/**
 * telnyx-agent setup-verify — Zero to phone verification in one command.
 *
 * Steps:
 * 1. Create a verify profile
 * 2. Search for an available number with SMS capability
 * 3. Buy the number
 * 4. Output profile + number for use
 */

import { TelnyxClient, TelnyxAPIError } from "../client.ts";
import { printStep, printSuccess, printError, outputJson, type StepResult } from "../utils/output.ts";
import { orderAndResolveNumber } from "../utils/number-order.ts";

interface SetupVerifyResult {
  profile_id: string;
  profile_name: string;
  phone_number: string;
  phone_number_id: string;
  timeout_secs: number;
  test_command: string;
  ready: boolean;
  steps: StepResult[];
}

export async function setupVerifyCommand(flags: Record<string, string | boolean>): Promise<void> {
  const client = new TelnyxClient();
  const jsonOutput = flags.json === true;
  const country = (flags.country as string) || "US";
  const totalSteps = 4;
  const steps: StepResult[] = [];
  const startTime = Date.now();
  const timeoutSecs = 300;

  let profileId = "";
  let profileName = "";
  let phoneNumber = "";
  let phoneNumberId = "";

  try {
    const ts = new Date().toISOString().slice(0, 19).replace("T", " ");
    profileName = (flags["profile-name"] as string) || `Agent Verify Profile - ${ts}`;
    if (!jsonOutput) console.log("\n🚀 Setting up Phone Verification...\n");

    // Step 1: Create verify profile
    const step1Start = Date.now();
    try {
      const profileRes = await client.post("/verify_profiles", {
        name: profileName,
        default_verification_timeout_secs: timeoutSecs,
      });
      const profileData = profileRes.data as Record<string, unknown>;
      profileId = String(profileData.id);
      steps.push({ step: 1, name: "Create verify profile", status: "completed", resourceId: profileId, detail: profileName, elapsedMs: Date.now() - step1Start });
    } catch (err) {
      steps.push({ step: 1, name: "Create verify profile", status: "failed", detail: errorMsg(err), elapsedMs: Date.now() - step1Start });
      throw err;
    }
    if (!jsonOutput) printStep(steps[steps.length - 1], totalSteps);

    // Step 2: Search for available number
    const step2Start = Date.now();
    try {
      const searchRes = await client.get("/available_phone_numbers", {
        "filter[country_code]": country,
        "filter[features][]": "sms",
        "filter[phone_number_type]": "local",
        "filter[limit]": 1,
      });
      const numbers = searchRes.data as Record<string, unknown>[];
      if (!numbers?.length) throw new Error(`No SMS-capable numbers available in ${country}`);
      phoneNumber = String(numbers[0].phone_number);
      steps.push({ step: 2, name: "Search for number", status: "completed", detail: phoneNumber, elapsedMs: Date.now() - step2Start });
    } catch (err) {
      steps.push({ step: 2, name: "Search for number", status: "failed", detail: errorMsg(err), elapsedMs: Date.now() - step2Start });
      throw err;
    }
    if (!jsonOutput) printStep(steps[steps.length - 1], totalSteps);

    // Step 3: Buy the number
    const step3Start = Date.now();
    try {
      const orderResult = await orderAndResolveNumber(client, phoneNumber, {});
      phoneNumberId = orderResult.phoneNumberId;
      steps.push({ step: 3, name: "Buy number", status: "completed", resourceId: phoneNumberId, detail: phoneNumber, elapsedMs: Date.now() - step3Start });
    } catch (err) {
      steps.push({ step: 3, name: "Buy number", status: "failed", detail: errorMsg(err), elapsedMs: Date.now() - step3Start });
      throw err;
    }
    if (!jsonOutput) printStep(steps[steps.length - 1], totalSteps);

    // Step 4: Output profile + number (verify profile uses number when sending)
    const step4Start = Date.now();
    steps.push({ step: 4, name: "Link number to verify profile", status: "completed", detail: `${profileId} ↔ ${phoneNumber}`, elapsedMs: Date.now() - step4Start });
    if (!jsonOutput) printStep(steps[steps.length - 1], totalSteps);

    const testCommand = `telnyx-agent verify send --phone-number ${phoneNumber} --profile-id ${profileId}`;

    const result: SetupVerifyResult = {
      profile_id: profileId,
      profile_name: profileName,
      phone_number: phoneNumber,
      phone_number_id: phoneNumberId,
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
        "Phone Number": phoneNumber,
        "Timeout": `${timeoutSecs}s`,
        Ready: "✓",
        "Test command": testCommand,
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
  if (err instanceof TelnyxAPIError) return `${err.detail} (HTTP ${err.statusCode})`;
  if (err instanceof Error) return err.message;
  return String(err);
}
