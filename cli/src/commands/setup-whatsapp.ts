/**
 * telnyx-agent setup-whatsapp — Zero to WhatsApp in one command.
 *
 * Steps:
 * 1. List WhatsApp Business Accounts (WABAs) and pick one
 * 2. List WhatsApp phone numbers for the WABA (reuse existing if verified)
 * 3. Create messaging profile & buy an SMS-capable number (skipped if reusing)
 * 4. Initialize WhatsApp verification and (optionally) verify with --code
 * 5. Configure (or retrieve) the WhatsApp business profile
 */

import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";
import { TelnyxClient, TelnyxAPIError } from "../client.ts";
import { printStep, printSuccess, printError, outputJson, type StepResult } from "../utils/output.ts";
import { searchAndBuyNumber } from "../utils/number-order.ts";

interface SetupWhatsappResult {
  waba_id: string;
  phone_number: string;
  messaging_profile_id: string;
  verified: boolean;
  profile_configured: boolean;
  ready: boolean;
  steps: StepResult[];
}

export async function setupWhatsappCommand(flags: Record<string, string | boolean>): Promise<void> {
  const jsonOutput = flags.json === true;
  const country = (flags.country as string) || "US";
  const wabaIdFlag = flags["waba-id"] as string | undefined;
  const displayNameFlag = flags["display-name"] as string | undefined;
  const displayName = displayNameFlag || "WhatsApp";
  const about = flags.about as string | undefined;
  const category = flags.category as string | undefined;
  const code = flags.code as string | undefined;
  const totalSteps = 5;
  const steps: StepResult[] = [];
  const startTime = Date.now();

  let wabaId = "";
  let phoneNumber = "";
  let messagingProfileId = "";
  let verified = false;
  let profileConfigured = false;

  try {
    if (!jsonOutput) console.log("\n🚀 Setting up WhatsApp...\n");

    // Step 1: List WhatsApp business accounts and pick one
    const step1Start = Date.now();
    try {
      const res = await telnyxCli(["whatsapp:business-accounts", "list"]);
      const wabas = (res.data as Array<Record<string, unknown>>) ?? [];
      if (!wabas.length) {
        throw new Error(
          "No WhatsApp Business Accounts found. Create one via the Telnyx portal: https://portal.telnyx.com/whatsapp",
        );
      }
      const chosen = wabaIdFlag
        ? wabas.find((w) => String(w.id) === wabaIdFlag)
        : wabas[0];
      if (!chosen) {
        throw new Error(
          `WABA with id ${wabaIdFlag} not found among ${wabas.length} account(s).`,
        );
      }
      wabaId = String(chosen.id);
      steps.push({
        step: 1,
        name: "List WhatsApp business accounts",
        status: "completed",
        resourceId: wabaId,
        detail: `${wabas.length} WABA(s) found`,
        elapsedMs: Date.now() - step1Start,
      });
    } catch (err) {
      steps.push({ step: 1, name: "List WhatsApp business accounts", status: "failed", detail: errorMsg(err), elapsedMs: Date.now() - step1Start });
      throw err;
    }
    if (!jsonOutput) printStep(steps[steps.length - 1], totalSteps);

    // Step 2: List WhatsApp phone numbers for the WABA
    const step2Start = Date.now();
    let reusedExisting = false;
    try {
      const res = await telnyxCli(["whatsapp:business-accounts:phone-numbers", "list", "--id", wabaId]);
      const numbers = (res.data as Array<Record<string, unknown>>) ?? [];
      if (numbers.length) {
        // Scan the full list for a connected/verified number before
        // falling back to a pending one, so we don't buy unnecessarily.
        const connected = numbers.find((n) => {
          const s = String(n.status ?? "").toLowerCase();
          const en = n.enabled !== false && n.enabled !== "false";
          return en && (s === "connected" || s === "verified" || s === "registered");
        });
        const pending = numbers.find((n) => {
          const s = String(n.status ?? "").toLowerCase();
          const en = n.enabled !== false && n.enabled !== "false";
          return en && s !== "connected" && s !== "verified" && s !== "registered";
        });
        const chosen = connected ?? pending;
        if (chosen) {
          phoneNumber = String(chosen.phone_number ?? chosen.id ?? "");
          const waStatus = String(chosen.status ?? "").toLowerCase();
          if (connected) {
            verified = true;
            reusedExisting = true;
          } else {
            // Enabled but not yet verified — let user verify with --code
            reusedExisting = true;
          }
          steps.push({
            step: 2,
            name: "List WhatsApp phone numbers",
            status: "completed",
            resourceId: phoneNumber,
            detail: verified
              ? `${numbers.length} number(s), reusing connected`
              : `${numbers.length} number(s) found, using ${waStatus || "pending"}`,
            elapsedMs: Date.now() - step2Start,
          });
        } else {
          // All numbers disabled/pending — buy a new one
          steps.push({
            step: 2,
            name: "List WhatsApp phone numbers",
            status: "completed",
            detail: `${numbers.length} number(s) found, all unusable`,
            elapsedMs: Date.now() - step2Start,
          });
        }
      } else {
        steps.push({
          step: 2,
          name: "List WhatsApp phone numbers",
          status: "completed",
          detail: "no numbers yet",
          elapsedMs: Date.now() - step2Start,
        });
      }
    } catch (err) {
      steps.push({ step: 2, name: "List WhatsApp phone numbers", status: "failed", detail: errorMsg(err), elapsedMs: Date.now() - step2Start });
      throw err;
    }
    if (!jsonOutput) printStep(steps[steps.length - 1], totalSteps);

    // Step 3: Search & buy an SMS-capable number (skipped if reusing existing)
    const step3Start = Date.now();
    if (reusedExisting) {
      steps.push({ step: 3, name: "Search & buy number", status: "skipped", detail: "reusing existing number", elapsedMs: 0 });
    } else {
      try {
        // Create a messaging profile first (required for WhatsApp verification
        // — the SMS verification code needs an inbound route via the profile)
        const apiKey = process.env.TELNYX_API_KEY;
        if (!apiKey) throw new Error("TELNYX_API_KEY environment variable is required");
        const client = new TelnyxClient(apiKey);
        const profileRes = await client.post("/messaging_profiles", {
          name: `WhatsApp Profile - ${new Date().toISOString().slice(0, 19).replace("T", " ")}`,
          whitelisted_destinations: [country || "US"],
        });
        const profileData = (profileRes.data ?? profileRes) as Record<string, unknown>;
        messagingProfileId = String(profileData.id);

        const result = await searchAndBuyNumber(country, {
          features: "sms",
          type: "local",
          messagingProfileId,
        });
        phoneNumber = result.phoneNumber;
        steps.push({
          step: 3,
          name: "Create profile & buy number",
          status: "completed",
          resourceId: result.phoneNumberId,
          detail: `${phoneNumber} (profile ${messagingProfileId.slice(-8)})`,
          elapsedMs: Date.now() - step3Start,
        });
      } catch (err) {
        steps.push({ step: 3, name: "Create profile & buy number", status: "failed", detail: errorMsg(err), elapsedMs: Date.now() - step3Start });
        throw err;
      }
    }
    if (!jsonOutput) printStep(steps[steps.length - 1], totalSteps);

    // Step 4: Initialize & verify WhatsApp number (skipped if existing AND verified)
    const step4Start = Date.now();
    if (reusedExisting && verified) {
      steps.push({ step: 4, name: "Initialize & verify WhatsApp number", status: "skipped", detail: "already verified", elapsedMs: 0 });
    } else if (reusedExisting && !verified && code) {
      // Existing number that needs verification with user-supplied code
      try {
        await telnyxCli(["whatsapp:phone-numbers", "verify", "--phone-number", phoneNumber, "--code", code]);
        verified = true;
        steps.push({
          step: 4,
          name: "Verify WhatsApp number",
          status: "completed",
          resourceId: phoneNumber,
          detail: "verified with code",
          elapsedMs: Date.now() - step4Start,
        });
      } catch (err) {
        steps.push({ step: 4, name: "Verify WhatsApp number", status: "failed", detail: errorMsg(err), elapsedMs: Date.now() - step4Start });
        throw err;
      }
    } else if (!reusedExisting) {
      try {
        await telnyxCli([
          "whatsapp:business-accounts:phone-numbers", "initialize-verification",
          "--id", wabaId,
          "--display-name", displayName,
          "--phone-number", phoneNumber,
          "--language", "en_US",
          "--verification-method", "sms",
        ]);
        if (code) {
          await telnyxCli(["whatsapp:phone-numbers", "verify", "--phone-number", phoneNumber, "--code", code]);
          verified = true;
          steps.push({
            step: 4,
            name: "Initialize & verify WhatsApp number",
            status: "completed",
            resourceId: phoneNumber,
            detail: "verified",
            elapsedMs: Date.now() - step4Start,
          });
        } else {
          steps.push({
            step: 4,
            name: "Initialize WhatsApp verification",
            status: "completed",
            resourceId: phoneNumber,
            detail: "code sent via SMS",
            elapsedMs: Date.now() - step4Start,
          });
        }
      } catch (err) {
        steps.push({ step: 4, name: "Initialize WhatsApp verification", status: "failed", detail: errorMsg(err), elapsedMs: Date.now() - step4Start });
        throw err;
      }
    } else {
      // Existing number, unverified, no --code provided — initialize verification
      try {
        await telnyxCli([
          "whatsapp:business-accounts:phone-numbers", "initialize-verification",
          "--id", wabaId,
          "--display-name", displayName,
          "--phone-number", phoneNumber,
          "--language", "en_US",
          "--verification-method", "sms",
        ]);
        steps.push({
          step: 4,
          name: "Re-initialize WhatsApp verification",
          status: "completed",
          resourceId: phoneNumber,
          detail: "code sent via SMS",
          elapsedMs: Date.now() - step4Start,
        });
      } catch (err) {
        steps.push({ step: 4, name: "Initialize WhatsApp verification", status: "failed", detail: errorMsg(err), elapsedMs: Date.now() - step4Start });
        throw err;
      }
    }
    if (!jsonOutput) printStep(steps[steps.length - 1], totalSteps);
    if (!verified && !code && !jsonOutput) {
      console.log("  ℹ Verification code sent via SMS. Run again with --code <code> to verify, or use:");
      console.log(`    telnyx whatsapp:phone-numbers verify --phone-number ${phoneNumber} --code <code>`);
    }

    // Step 5: Configure (or retrieve) the WhatsApp profile
    const step5Start = Date.now();
    const hasProfileFlags = Boolean(displayNameFlag || about || category);
    try {
      if (hasProfileFlags) {
        const profileArgs = ["whatsapp:phone-numbers:profile", "update", "--phone-number", phoneNumber];
        if (displayNameFlag) profileArgs.push("--display-name", displayNameFlag);
        if (about) profileArgs.push("--about", about);
        if (category) profileArgs.push("--category", category);
        await telnyxCli(profileArgs);
        profileConfigured = true;
        steps.push({
          step: 5,
          name: "Configure WhatsApp profile",
          status: "completed",
          resourceId: phoneNumber,
          detail: "profile updated",
          elapsedMs: Date.now() - step5Start,
        });
      } else {
        await telnyxCli(["whatsapp:phone-numbers:profile", "retrieve", "--phone-number", phoneNumber]);
        steps.push({
          step: 5,
          name: "Retrieve WhatsApp profile",
          status: "completed",
          resourceId: phoneNumber,
          detail: "current profile",
          elapsedMs: Date.now() - step5Start,
        });
      }
    } catch (err) {
      steps.push({ step: 5, name: "Configure WhatsApp profile", status: "failed", detail: errorMsg(err), elapsedMs: Date.now() - step5Start });
      throw err;
    }
    if (!jsonOutput) printStep(steps[steps.length - 1], totalSteps);

    const result: SetupWhatsappResult = {
      waba_id: wabaId,
      phone_number: phoneNumber,
      messaging_profile_id: messagingProfileId,
      verified,
      profile_configured: profileConfigured,
      ready: verified,
      steps,
    };

    if (jsonOutput) {
      outputJson(result);
    } else {
      printSuccess("WhatsApp setup complete!", {
        "WABA ID": wabaId,
        "Phone Number": phoneNumber,
        Verified: verified ? "✓" : "pending",
        "Profile Configured": profileConfigured ? "✓" : "—",
        Ready: verified ? "✓" : "verification pending",
        "Send command": `telnyx-agent whatsapp-send --from ${phoneNumber} --to <number> --text "Hello!"`,
      });
    }
  } catch (err) {
    const result = {
      status: "failed",
      waba_id: wabaId || null,
      phone_number: phoneNumber || null,
      messaging_profile_id: messagingProfileId || null,
      verified,
      profile_configured: profileConfigured,
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
  if (err instanceof TelnyxCLIError) return err.stderr || err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}
