/**
 * telnyx-agent setup-sms — Zero to sending SMS in one command.
 *
 * Steps:
 * 1. Create a messaging profile (via telnyx CLI)
 * 2. Search for a phone number with SMS capability (via telnyx CLI)
 * 3. Buy the number (via telnyx CLI)
 * 4. Assign number to the messaging profile (via telnyx CLI)
 */

import { TelnyxCLIError } from "../telnyx-cli.ts";
import { TelnyxClient, TelnyxAPIError } from "../client.ts";
import { printStep, printSuccess, printError, outputJson, type StepResult } from "../utils/output.ts";
import { searchAndBuyNumber, NumberOrderedButUnresolvedError } from "../utils/number-order.ts";
import { findReusablePair, AGENT_SMS_PROFILE_PREFIX } from "../utils/idempotency.ts";

interface SetupSmsResult {
  profile_id: string;
  profile_name: string;
  phone_number: string;
  phone_number_id: string;
  ready: boolean;
  reused: boolean;
  steps: StepResult[];
}

export async function setupSmsCommand(flags: Record<string, string | boolean>): Promise<void> {
  const jsonOutput = flags.json === true;
  const country = (flags.country as string) || "US";
  // AIF-336: reuse a previously agent-created profile+number by default so
  // re-runs don't silently buy another ~$1/mo number. Pass --force to always
  // provision a fresh profile and number.
  const force = flags.force === true;
  const totalSteps = 4;
  const steps: StepResult[] = [];
  const startTime = Date.now();

  let profileId = "";
  let profileName = "";
  let phoneNumber = "";
  let phoneNumberId = "";
  let reused = false;
  // AIF follow-up: track a profile we create in THIS run so we can roll it back
  // if a later step (number search/buy/assign) fails — otherwise every failed
  // retry orphans a messaging profile on the account.
  let createdProfileId = "";
  let clientRef: TelnyxClient | undefined;
  // Set true only when the number order was PLACED but its resource ID couldn't
  // be resolved. In that case the number may already be bought with the profile
  // attached, so rolling back the profile would orphan a paid number and block
  // a later reuse. A genuine buy failure (no order placed) still rolls back.
  let numberLikelyPurchased = false;

  try {
    if (!jsonOutput) console.log("\n🚀 Setting up SMS...\n");

    const apiKey = process.env.TELNYX_API_KEY;
    if (!apiKey) throw new Error("TELNYX_API_KEY environment variable is required");
    const client = new TelnyxClient(apiKey);
    clientRef = client;

    // AIF-336: idempotency — reuse an existing agent-created profile + assigned
    // number unless --force was passed.
    if (!force) {
      const existing = await findReusablePair(
        client,
        "/messaging_profiles",
        "name",
        AGENT_SMS_PROFILE_PREFIX,
        "messaging_profile_id",
      );
      if (existing) {
        profileId = existing.resource.id;
        profileName = existing.resource.name;
        phoneNumber = existing.phoneNumber;
        phoneNumberId = existing.phoneNumberId;
        reused = true;
        steps.push({ step: 1, name: "Reuse existing SMS profile + number", status: "completed", resourceId: profileId, detail: `${profileName} → ${phoneNumber}`, elapsedMs: 0 });

        const result: SetupSmsResult = {
          profile_id: profileId,
          profile_name: profileName,
          phone_number: phoneNumber,
          phone_number_id: phoneNumberId,
          ready: true,
          reused: true,
          steps,
        };
        if (jsonOutput) {
          outputJson(result);
        } else {
          printStep(steps[0], totalSteps);
          printSuccess("SMS already set up — reusing existing resources", {
            "Profile ID": profileId,
            "Profile Name": profileName,
            "Phone Number": phoneNumber,
            Ready: "✓",
            "Reused": "✓ (pass --force to provision a new profile + number)",
            "Test command": `telnyx-agent send-sms --from ${phoneNumber} --to <number> --text "Hello!"`,
          });
        }
        return;
      }
    }

    // Step 1: Create messaging profile via direct API
    // (CLI doesn't support --whitelisted-destinations which the API requires)
    const ts = new Date().toISOString().slice(0, 19).replace("T", " ");
    profileName = `${AGENT_SMS_PROFILE_PREFIX}${ts}`;
    if (!jsonOutput && force) console.log("  ⚠ --force: provisioning a NEW profile + number (this buys a ~$1/mo number).\n");

    const step1Start = Date.now();
    try {
      const profileRes = await client.post("/messaging_profiles", {
        name: profileName,
        whitelisted_destinations: ["US"],
      });
      const profileData = (profileRes.data ?? profileRes) as Record<string, unknown>;
      profileId = String(profileData.id);
      createdProfileId = profileId;
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
      // If the order was placed but only the ID lookup failed, the number was
      // likely purchased with the profile attached — don't roll the profile back.
      if (err instanceof NumberOrderedButUnresolvedError) numberLikelyPurchased = true;
      steps.push({ step: 2, name: "Search & buy number", status: "failed", detail: errorMsg(err), elapsedMs: Date.now() - step2Start });
      throw err;
    }
    if (!jsonOutput) {
      printStep(steps[steps.length - 2], totalSteps);
      printStep(steps[steps.length - 1], totalSteps);
    }

    // Step 4: Assign number to messaging profile via REST (AIF-329: Go CLI
    // doesn't support --messaging-profile-id or --force on phone-numbers update)
    const step4Start = Date.now();
    try {
      if (phoneNumberId) {
        // Messaging-profile assignment lives on the /messaging subresource, NOT
        // the generic phone-number update endpoint. On accounts where the number
        // order didn't already attach the profile, PATCH /phone_numbers/{id}
        // silently no-ops the messaging_profile_id, leaving the number
        // unusable for SMS. Use PATCH /phone_numbers/{id}/messaging.
        await client.patch(`/phone_numbers/${phoneNumberId}/messaging`, {
          messaging_profile_id: profileId,
        });
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
      reused: false,
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
    // AIF follow-up: if we created a messaging profile this run but never
    // finished wiring a number to it, delete it so failed retries don't leave
    // orphaned profiles piling up on the account. Only clean up a profile we
    // created here AND that has no number assigned (phoneNumberId unset).
    let cleanup: "deleted" | "kept" | "failed" | undefined;
    if (createdProfileId && !phoneNumberId && !numberLikelyPurchased && clientRef) {
      // Safe to delete: we created the profile but no number order succeeded, so
      // no paid number could be attached to it.
      try {
        await clientRef.delete(`/messaging_profiles/${createdProfileId}`);
        cleanup = "deleted";
      } catch {
        cleanup = "failed";
      }
    } else if (createdProfileId && (phoneNumberId || numberLikelyPurchased)) {
      // Keep the profile: either a number is assigned, or an order was placed
      // whose number we couldn't resolve — deleting would orphan the number.
      cleanup = "kept";
    }

    const result = {
      status: "failed",
      profile_id: profileId || null,
      phone_number: phoneNumber || null,
      ready: false,
      steps,
      ...(cleanup ? { orphan_cleanup: cleanup } : {}),
      error: errorMsg(err),
      elapsed_ms: Date.now() - startTime,
    };

    if (jsonOutput) {
      outputJson(result);
    } else {
      printError(errorMsg(err));
      console.log("  Steps completed before failure:");
      for (const s of steps) printStep(s, totalSteps);
      if (cleanup === "deleted") console.log("  ↩ Rolled back the messaging profile created this run (no orphan left).");
      else if (cleanup === "failed") console.log(`  ⚠ Could not roll back messaging profile ${createdProfileId} — delete it manually.`);
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
